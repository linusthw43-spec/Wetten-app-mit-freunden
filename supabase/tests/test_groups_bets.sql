-- Tests für Gruppen, Einladungen, Einsätze, Auswertung, Rangliste und RLS.
-- Läuft gegen ein frisches Postgres (siehe run.sh). Bricht beim ersten Fehler ab.

create schema tests;
grant usage on schema tests to anon, authenticated;

-- Als Nutzer anmelden (simuliert Supabase-JWT).
create function tests.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user::text, false);
$$;

-- Führt SQL aus und erwartet einen Fehler, dessen Text p_pattern enthält.
create function tests.expect_error(p_sql text, p_pattern text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'Erwarteter Fehler blieb aus: %', p_sql;
exception
  when others then
    if sqlerrm like 'Erwarteter Fehler blieb aus%' or position(p_pattern in sqlerrm) = 0 then
      raise exception 'Falscher Fehler für "%": % (erwartet: %)', p_sql, sqlerrm, p_pattern;
    end if;
end;
$$;

create function tests.coins(p_group uuid, p_user uuid) returns integer
language sql security definer as $$
  select coins from public.memberships where group_id = p_group and user_id = p_user;
$$;

grant execute on all functions in schema tests to anon, authenticated;

\set alice '''a0000000-0000-0000-0000-000000000001'''
\set bob   '''b0000000-0000-0000-0000-000000000002'''
\set carl  '''c0000000-0000-0000-0000-000000000003'''
\set dave  '''d0000000-0000-0000-0000-000000000004'''

insert into auth.users (id) values (:alice), (:bob), (:carl), (:dave);
insert into public.profiles (id, display_name, avatar_emoji) values
  (:alice, 'Alice', '🦊'), (:bob, 'Bob', '🐸'), (:carl, 'Carl', '🤠'), (:dave, 'Dave', '👻');

-- ---------------------------------------------------------------- Gruppe & Beitritt
set role authenticated;

select tests.login(:alice);
select public.create_group('  WG Chaos ', '🍕') as gid \gset
select invite_code as code from public.groups where id = :'gid' \gset

do $$ begin
  assert (select name from public.groups) = 'WG Chaos', 'Name wird getrimmt';
  assert (select count(*) from public.memberships) = 1, 'Ersteller ist Mitglied';
  assert (select coins from public.memberships) = 1000, 'Startguthaben 1000';
  assert (select invite_code ~ '^[A-Z2-9]{6}$' from public.groups), 'Code-Format';
end $$;

-- Dave ist (noch) nirgends Mitglied und sieht nichts.
select tests.login(:dave);
do $$ begin
  assert (select count(*) from public.groups) = 0, 'Fremde sehen keine Gruppen';
  assert (select count(*) from public.profiles where display_name = 'Alice') = 0, 'Fremde sehen keine Profile';
end $$;
select tests.expect_error($$select public.join_group('ZZZZZZ')$$, 'Diesen Einladungscode gibt es nicht');

select tests.login(:bob);
select public.join_group(lower(:'code')) = :'gid' as ok \gset
\if :ok
\else
  \echo 'join_group liefert falsche Gruppe'
  select 1/0;
\endif
select public.join_group(:'code');  -- zweites Mal: nichts passiert
do $$ begin
  assert (select count(*) from public.memberships) = 2, 'Doppelt beitreten ändert nichts';
  assert (select coins from public.memberships where user_id = auth.uid()) = 1000, 'Bob startet mit 1000';
  assert (select count(*) from public.profiles where display_name = 'Alice') = 1, 'Mitglieder sehen sich';
end $$;

select tests.login(:carl);
select public.join_group(:'code');

-- ---------------------------------------------------------------- Keine direkten Schreibzugriffe
select tests.login(:bob);
update public.memberships set coins = 999999 where user_id = auth.uid();
do $$ begin
  assert (select coins from public.memberships where user_id = auth.uid()) = 1000, 'Coins nicht direkt änderbar';
end $$;
select tests.expect_error(
  format($$insert into public.coin_events (group_id, user_id, delta, reason) values (%L, auth.uid(), 5000, 'payout')$$, :'gid'),
  'row-level security');
select tests.expect_error(
  format($$insert into public.bets (group_id, creator_id, question) values (%L, auth.uid(), 'Hack?')$$, :'gid'),
  'row-level security');
select tests.expect_error($$select public._book_coins(null, null, 1, 'payout', null)$$, 'permission denied');

-- ---------------------------------------------------------------- Wette 1: normale Auszahlung mit Rundungsrest
select tests.login(:alice);
select public.create_bet(:'gid', 'Schafft Bob die Prüfung?') as bet1 \gset
select tests.expect_error(format($$select public.create_bet(%L, 'x')$$, :'gid'), 'violates check constraint');

select tests.login(:bob);
select public.place_wager(:'bet1', 'yes', 300);
select public.place_wager(:'bet1', 'yes', 50);   -- nachlegen
select tests.expect_error(format($$select public.place_wager(%L, 'no', 10)$$, :'bet1'), 'andere Seite');
select tests.expect_error(format($$select public.place_wager(%L, 'yes', 5000)$$, :'bet1'), 'Nicht genug Coins');
select tests.expect_error(format($$select public.place_wager(%L, 'yes', 0)$$, :'bet1'), 'größer als 0');
select tests.expect_error(format($$select public.resolve_bet(%L, 'yes')$$, :'bet1'), 'Nur wer die Wette erstellt hat');

select tests.login(:dave);
select tests.expect_error(format($$select public.place_wager(%L, 'yes', 10)$$, :'bet1'), 'Wette nicht gefunden');

select tests.login(:carl);
select public.place_wager(:'bet1', 'no', 100);

select tests.login(:alice);
select public.place_wager(:'bet1', 'no', 101);
select public.lock_bet(:'bet1');

select tests.login(:carl);
select tests.expect_error(format($$select public.place_wager(%L, 'no', 10)$$, :'bet1'), 'nicht mehr setzen');

-- Topf 551, Gewinnerseite 201:
-- Carl 100*551/201 = 274,1 -> 274 · Alice 101*551/201 = 276,9 -> 276 (+1 Rest, höchster Einsatz) = 277
select tests.login(:alice);
select public.resolve_bet(:'bet1', 'no');
select tests.expect_error(format($$select public.resolve_bet(%L, 'yes')$$, :'bet1'), 'schon beendet');

do $$
declare g uuid := (select id from public.groups);
begin
  assert tests.coins(g, 'a0000000-0000-0000-0000-000000000001') = 1000 - 101 + 277, 'Alice: Gewinn + Rest';
  assert tests.coins(g, 'b0000000-0000-0000-0000-000000000002') = 1000 - 350, 'Bob: verloren';
  assert tests.coins(g, 'c0000000-0000-0000-0000-000000000003') = 1000 - 100 + 274, 'Carl: Gewinn';
  assert (select sum(payout) from public.wagers) = 551, 'Ganzer Topf ausgezahlt';
  assert (select status || '/' || outcome from public.bets) = 'resolved/no', 'Status gesetzt';
end $$;

-- ---------------------------------------------------------------- Rangliste & Verlierer der Woche
do $$
declare rows text;
begin
  select string_agg(display_name || ':' || coins || ':' || week_net, ' ' order by coins desc)
    into rows from public.get_leaderboard((select id from public.groups));
  assert rows = 'Alice:1176:176 Carl:1174:174 Bob:650:-350', 'Rangliste: ' || rows;
end $$;

select tests.login(:dave);
do $$ begin
  assert (select count(*) from public.get_leaderboard((select id from public.groups limit 1))) = 0,
    'Fremde sehen keine Rangliste';
end $$;

-- ---------------------------------------------------------------- Wette 2: niemand auf der Gewinnerseite -> Rückzahlung
select tests.login(:carl);
select public.create_bet(:'gid', 'Regnet es morgen?') as bet2 \gset
select tests.login(:bob);
select public.place_wager(:'bet2', 'yes', 100);
select tests.login(:carl);
select public.resolve_bet(:'bet2', 'no');
do $$ begin
  assert tests.coins((select id from public.groups), 'b0000000-0000-0000-0000-000000000002') = 650,
    'Bob bekommt Einsatz zurück';
end $$;

-- ---------------------------------------------------------------- Wette 3: abbrechen
select tests.login(:alice);
select public.create_bet(:'gid', 'Kommt Dave zur Party?') as bet3 \gset
select tests.login(:carl);
select public.place_wager(:'bet3', 'no', 50);
select tests.expect_error(format($$select public.cancel_bet(%L)$$, :'bet3'), 'Nur wer die Wette erstellt hat');
select tests.login(:alice);
select public.cancel_bet(:'bet3');
do $$ begin
  assert tests.coins((select id from public.groups), 'c0000000-0000-0000-0000-000000000003') = 1174,
    'Carl bekommt Einsatz zurück';
end $$;

-- ---------------------------------------------------------------- Buchhaltung stimmt
reset role;
do $$ begin
  assert (select sum(coins) from public.memberships) = (select sum(delta) from public.coin_events),
    'Kontostände = Summe aller Buchungen';
  assert (select sum(coins) from public.memberships) = 3000, 'Keine Coins entstehen oder verschwinden';
end $$;

-- ---------------------------------------------------------------- Nicht angemeldet
set role anon;
select tests.expect_error($$select public.create_group('x', '🎲')$$, 'permission denied');
reset role;
