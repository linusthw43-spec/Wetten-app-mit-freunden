-- Phase 2: Gruppen, Einladungen, Wetten, Einsätze, Rangliste.
--
-- Grundsatz: Die App darf in diese Tabellen NICHT direkt schreiben (es gibt keine
-- insert/update/delete-Policies). Alles, was Coins bewegt, läuft über die
-- security-definer-Funktionen unten. So kann niemand schummeln.

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 30),
  emoji text not null default '🎲' check (char_length(emoji) between 1 and 16),
  theme text not null default 'default',
  invite_code text not null unique,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.memberships (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  coins integer not null default 1000 check (coins >= 0),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

create table public.bets (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  question text not null check (char_length(btrim(question)) between 3 and 140),
  -- open: Einsätze möglich · locked: Einsätze gestoppt, Ergebnis steht aus
  -- resolved: ausgewertet · cancelled: abgebrochen, alle haben ihren Einsatz zurück
  status text not null default 'open' check (status in ('open', 'locked', 'resolved', 'cancelled')),
  outcome text check (outcome in ('yes', 'no')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index bets_group_idx on public.bets (group_id, created_at desc);

create table public.wagers (
  bet_id uuid not null references public.bets (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  side text not null check (side in ('yes', 'no')),
  amount integer not null check (amount > 0),
  -- Wird beim Auswerten gesetzt: was zurück aufs Konto ging (0 = verloren).
  payout integer,
  created_at timestamptz not null default now(),
  primary key (bet_id, user_id)
);

create table public.coin_events (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta integer not null,
  reason text not null check (reason in ('start', 'wager', 'payout', 'refund', 'rewarded_ad')),
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index coin_events_group_user_idx on public.coin_events (group_id, user_id, created_at);
create index coin_events_ref_idx on public.coin_events (ref_id);

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen für RLS (security definer, damit sie RLS nicht rekursiv auslösen)
-- ---------------------------------------------------------------------------

create function public.is_member(p_group_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;

create function public.shares_group(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.group_id = mine.group_id
    where mine.user_id = auth.uid() and theirs.user_id = p_user_id
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security: nur lesen, und nur in eigenen Gruppen
-- ---------------------------------------------------------------------------

alter table public.groups enable row level security;
alter table public.memberships enable row level security;
alter table public.bets enable row level security;
alter table public.wagers enable row level security;
alter table public.coin_events enable row level security;

create policy "groups_select_member" on public.groups
  for select to authenticated using (public.is_member(id));

create policy "memberships_select_member" on public.memberships
  for select to authenticated using (public.is_member(group_id));

create policy "bets_select_member" on public.bets
  for select to authenticated using (public.is_member(group_id));

create policy "wagers_select_member" on public.wagers
  for select to authenticated using (
    exists (select 1 from public.bets b where b.id = bet_id and public.is_member(b.group_id))
  );

create policy "coin_events_select_member" on public.coin_events
  for select to authenticated using (public.is_member(group_id));

-- Gruppenmitglieder dürfen gegenseitig Name + Emoji sehen.
create policy "profiles_select_group_mates" on public.profiles
  for select to authenticated using (public.shares_group(id));

-- ---------------------------------------------------------------------------
-- Interne Helfer
-- ---------------------------------------------------------------------------

create function public._new_invite_code()
returns text
language plpgsql volatile set search_path = ''
as $$
declare
  -- ohne verwechselbare Zeichen (0/O, 1/I/L)
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text := '';
begin
  for i in 1..6 loop
    code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return code;
end;
$$;

-- Bucht Coins auf ein Mitgliedskonto und protokolliert die Buchung.
create function public._book_coins(
  p_group_id uuid, p_user_id uuid, p_delta integer, p_reason text, p_ref_id uuid
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_delta = 0 then
    return;
  end if;
  update public.memberships
     set coins = coins + p_delta
   where group_id = p_group_id and user_id = p_user_id;
  insert into public.coin_events (group_id, user_id, delta, reason, ref_id)
  values (p_group_id, p_user_id, p_delta, p_reason, p_ref_id);
end;
$$;

-- Lädt eine Wette gesperrt (gegen doppeltes Auswerten) und prüft, dass der Aufrufer der Ersteller ist.
create function public._lock_own_bet(p_bet_id uuid)
returns public.bets
language plpgsql security definer set search_path = ''
as $$
declare
  v_bet public.bets;
begin
  select * into v_bet from public.bets where id = p_bet_id for update;
  if not found or not public.is_member(v_bet.group_id) then
    raise exception 'Wette nicht gefunden';
  end if;
  if v_bet.creator_id <> auth.uid() then
    raise exception 'Nur wer die Wette erstellt hat, darf das';
  end if;
  return v_bet;
end;
$$;

-- ---------------------------------------------------------------------------
-- Öffentliche Funktionen (von der App per supabase.rpc aufgerufen)
-- ---------------------------------------------------------------------------

create function public.create_group(p_name text, p_emoji text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;
  loop
    begin
      insert into public.groups (name, emoji, invite_code, owner_id)
      values (btrim(p_name), p_emoji, public._new_invite_code(), auth.uid())
      returning id into v_group_id;
      exit;
    exception when unique_violation then
      -- Code schon vergeben: neuen würfeln
    end;
  end loop;

  insert into public.memberships (group_id, user_id, coins) values (v_group_id, auth.uid(), 0);
  perform public._book_coins(v_group_id, auth.uid(), 1000, 'start', null);
  return v_group_id;
end;
$$;

create function public.join_group(p_code text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;
  select id into v_group_id from public.groups where invite_code = upper(btrim(p_code));
  if v_group_id is null then
    raise exception 'Diesen Einladungscode gibt es nicht';
  end if;
  if public.is_member(v_group_id) then
    return v_group_id;
  end if;

  insert into public.memberships (group_id, user_id, coins) values (v_group_id, auth.uid(), 0);
  perform public._book_coins(v_group_id, auth.uid(), 1000, 'start', null);
  return v_group_id;
end;
$$;

create function public.create_bet(p_group_id uuid, p_question text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_bet_id uuid;
begin
  if not public.is_member(p_group_id) then
    raise exception 'Du bist nicht in dieser Gruppe';
  end if;
  insert into public.bets (group_id, creator_id, question)
  values (p_group_id, auth.uid(), btrim(p_question))
  returning id into v_bet_id;
  return v_bet_id;
end;
$$;

create function public.place_wager(p_bet_id uuid, p_side text, p_amount integer)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_bet public.bets;
  v_coins integer;
  v_existing public.wagers;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Einsatz muss größer als 0 sein';
  end if;
  if p_side not in ('yes', 'no') then
    raise exception 'Ungültige Seite';
  end if;

  select * into v_bet from public.bets where id = p_bet_id for share;
  if not found or not public.is_member(v_bet.group_id) then
    raise exception 'Wette nicht gefunden';
  end if;
  if v_bet.status <> 'open' then
    raise exception 'Für diese Wette kann man nicht mehr setzen';
  end if;

  select coins into v_coins from public.memberships
   where group_id = v_bet.group_id and user_id = auth.uid()
   for update;
  if v_coins < p_amount then
    raise exception 'Nicht genug Coins (du hast %)', v_coins;
  end if;

  select * into v_existing from public.wagers where bet_id = p_bet_id and user_id = auth.uid();
  if found then
    if v_existing.side <> p_side then
      raise exception 'Du hast schon auf die andere Seite gesetzt';
    end if;
    update public.wagers set amount = amount + p_amount
     where bet_id = p_bet_id and user_id = auth.uid();
  else
    insert into public.wagers (bet_id, user_id, side, amount)
    values (p_bet_id, auth.uid(), p_side, p_amount);
  end if;

  perform public._book_coins(v_bet.group_id, auth.uid(), -p_amount, 'wager', p_bet_id);
end;
$$;

create function public.lock_bet(p_bet_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_bet public.bets := public._lock_own_bet(p_bet_id);
begin
  if v_bet.status <> 'open' then
    raise exception 'Die Wette ist nicht mehr offen';
  end if;
  update public.bets set status = 'locked' where id = p_bet_id;
end;
$$;

-- Auszahlung nach Pari-Mutuel (gleiche Logik wie src/lib/payout.ts):
-- Der ganze Topf geht an die Gewinnerseite, aufgeteilt nach Einsatz (abgerundet).
-- Rundungsreste bekommt der Gewinner mit dem höchsten Einsatz.
-- Hat niemand auf die Gewinnerseite gesetzt, gibt es für alle den Einsatz zurück.
create function public.resolve_bet(p_bet_id uuid, p_outcome text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_bet public.bets := public._lock_own_bet(p_bet_id);
  v_pool bigint;
  v_win_total bigint;
  v_share_sum bigint;
  v_remainder bigint;
  v_payout bigint;
  r record;
begin
  if v_bet.status not in ('open', 'locked') then
    raise exception 'Die Wette ist schon beendet';
  end if;
  if p_outcome not in ('yes', 'no') then
    raise exception 'Ungültiges Ergebnis';
  end if;

  select coalesce(sum(amount), 0) into v_pool from public.wagers where bet_id = p_bet_id;
  select coalesce(sum(amount), 0) into v_win_total
    from public.wagers where bet_id = p_bet_id and side = p_outcome;

  if v_win_total = 0 then
    for r in select * from public.wagers where bet_id = p_bet_id loop
      update public.wagers set payout = r.amount where bet_id = p_bet_id and user_id = r.user_id;
      perform public._book_coins(v_bet.group_id, r.user_id, r.amount, 'refund', p_bet_id);
    end loop;
  else
    select coalesce(sum((amount::bigint * v_pool) / v_win_total), 0) into v_share_sum
      from public.wagers where bet_id = p_bet_id and side = p_outcome;
    v_remainder := v_pool - v_share_sum;

    update public.wagers set payout = 0 where bet_id = p_bet_id and side <> p_outcome;

    for r in
      select w.*, row_number() over (order by w.amount desc, w.user_id) as rn
        from public.wagers w
       where w.bet_id = p_bet_id and w.side = p_outcome
    loop
      v_payout := (r.amount::bigint * v_pool) / v_win_total;
      if r.rn = 1 then
        v_payout := v_payout + v_remainder;
      end if;
      update public.wagers set payout = v_payout where bet_id = p_bet_id and user_id = r.user_id;
      perform public._book_coins(v_bet.group_id, r.user_id, v_payout::integer, 'payout', p_bet_id);
    end loop;
  end if;

  update public.bets
     set status = 'resolved', outcome = p_outcome, resolved_at = now()
   where id = p_bet_id;
end;
$$;

create function public.cancel_bet(p_bet_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_bet public.bets := public._lock_own_bet(p_bet_id);
  r record;
begin
  if v_bet.status not in ('open', 'locked') then
    raise exception 'Die Wette ist schon beendet';
  end if;
  for r in select * from public.wagers where bet_id = p_bet_id loop
    update public.wagers set payout = r.amount where bet_id = p_bet_id and user_id = r.user_id;
    perform public._book_coins(v_bet.group_id, r.user_id, r.amount, 'refund', p_bet_id);
  end loop;
  update public.bets set status = 'cancelled', resolved_at = now() where id = p_bet_id;
end;
$$;

-- Rangliste inkl. Netto-Bilanz der Woche (Mo–So, deutsche Zeit) aus ausgewerteten Wetten.
create function public.get_leaderboard(p_group_id uuid)
returns table (user_id uuid, display_name text, avatar_emoji text, coins integer, week_net integer)
language sql stable security definer set search_path = ''
as $$
  with week as (
    select date_trunc('week', now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin' as start
  )
  select
    m.user_id,
    p.display_name,
    p.avatar_emoji,
    m.coins,
    coalesce((
      select sum(e.delta)::integer
        from public.coin_events e
        join public.bets b on b.id = e.ref_id
       where e.group_id = m.group_id
         and e.user_id = m.user_id
         and e.reason in ('wager', 'payout', 'refund')
         and b.status = 'resolved'
         and b.resolved_at >= (select start from week)
    ), 0) as week_net
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  where m.group_id = p_group_id
    and public.is_member(p_group_id)
  order by m.coins desc, p.display_name;
$$;

-- ---------------------------------------------------------------------------
-- Rechte: interne Helfer sind nicht aufrufbar, öffentliche nur für angemeldete Nutzer
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon;

revoke execute on function public._new_invite_code() from authenticated;
revoke execute on function public._book_coins(uuid, uuid, integer, text, uuid) from authenticated;
revoke execute on function public._lock_own_bet(uuid) from authenticated;

grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.shares_group(uuid) to authenticated;
grant execute on function public.create_group(text, text) to authenticated;
grant execute on function public.join_group(text) to authenticated;
grant execute on function public.create_bet(uuid, text) to authenticated;
grant execute on function public.place_wager(uuid, text, integer) to authenticated;
grant execute on function public.lock_bet(uuid) to authenticated;
grant execute on function public.resolve_bet(uuid, text) to authenticated;
grant execute on function public.cancel_bet(uuid) to authenticated;
grant execute on function public.get_leaderboard(uuid) to authenticated;
