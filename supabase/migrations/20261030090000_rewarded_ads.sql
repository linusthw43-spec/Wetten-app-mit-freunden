-- Phase 3: Belohnung für Rewarded Ads ("Video schauen = +100 Coins").
-- Höchstens 5 Videos pro Nutzer, Gruppe und Tag (deutsche Zeit).

create function public._rewarded_today(p_group_id uuid, p_user_id uuid)
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(*)::integer
    from public.coin_events
   where group_id = p_group_id
     and user_id = p_user_id
     and reason = 'rewarded_ad'
     and created_at >= date_trunc('day', now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin';
$$;

-- Wie viele Belohnungsvideos sind heute in dieser Gruppe noch möglich?
-- Die App fragt das VOR dem Video ab, damit niemand ein Video ohne Belohnung schaut.
create function public.rewarded_remaining(p_group_id uuid)
returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_member(p_group_id) then
    raise exception 'Du bist nicht in dieser Gruppe';
  end if;
  return greatest(0, 5 - public._rewarded_today(p_group_id, auth.uid()));
end;
$$;

-- Schreibt +100 Coins gut, nachdem das Video zu Ende geschaut wurde.
-- Gibt zurück, wie viele Videos heute noch möglich sind.
create function public.claim_rewarded_coins(p_group_id uuid)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_used integer;
begin
  if not public.is_member(p_group_id) then
    raise exception 'Du bist nicht in dieser Gruppe';
  end if;
  -- Zeile sperren, damit zwei gleichzeitige Aufrufe das Limit nicht umgehen.
  perform 1 from public.memberships
   where group_id = p_group_id and user_id = auth.uid()
   for update;

  v_used := public._rewarded_today(p_group_id, auth.uid());
  if v_used >= 5 then
    raise exception 'Tageslimit erreicht: höchstens 5 Videos pro Tag und Gruppe';
  end if;

  perform public._book_coins(p_group_id, auth.uid(), 100, 'rewarded_ad', null);
  return 5 - (v_used + 1);
end;
$$;

revoke execute on function public._rewarded_today(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.rewarded_remaining(uuid) from public, anon;
revoke execute on function public.claim_rewarded_coins(uuid) from public, anon;
grant execute on function public.rewarded_remaining(uuid) to authenticated;
grant execute on function public.claim_rewarded_coins(uuid) to authenticated;
