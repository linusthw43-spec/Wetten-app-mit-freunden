-- Tests für Rewarded-Ad-Belohnungen (läuft nach test_groups_bets.sql, nutzt deren Daten).

\set bob   '''b0000000-0000-0000-0000-000000000002'''
\set dave  '''d0000000-0000-0000-0000-000000000004'''

select id as gid from public.groups limit 1 \gset

set role authenticated;

select tests.login(:bob);
do $$ begin
  assert public.rewarded_remaining((select id from public.groups)) = 5, 'Start: 5 Videos frei';
end $$;

select public.claim_rewarded_coins(:'gid') as left1 \gset
do $$ begin
  assert tests.coins((select id from public.groups), 'b0000000-0000-0000-0000-000000000002') = 650 + 100,
    'Bob bekommt +100';
end $$;
select public.claim_rewarded_coins(:'gid');
select public.claim_rewarded_coins(:'gid');
select public.claim_rewarded_coins(:'gid');
select public.claim_rewarded_coins(:'gid') as left5 \gset
select tests.expect_error(format($$select public.claim_rewarded_coins(%L)$$, :'gid'), 'Tageslimit erreicht');
do $$ begin
  assert public.rewarded_remaining((select id from public.groups)) = 0, 'Limit erreicht';
  assert tests.coins((select id from public.groups), 'b0000000-0000-0000-0000-000000000002') = 650 + 500,
    'Genau 5 x 100';
end $$;

-- Gestern geschaute Videos zählen heute nicht mehr.
reset role;
update public.coin_events set created_at = now() - interval '1 day' where reason = 'rewarded_ad';
set role authenticated;
select tests.login(:bob);
do $$ begin
  assert public.rewarded_remaining((select id from public.groups)) = 5, 'Neuer Tag, neues Glück';
end $$;

-- Fremde und interne Helfer
select tests.login(:dave);
select tests.expect_error(format($$select public.claim_rewarded_coins(%L)$$, :'gid'), 'nicht in dieser Gruppe');
select tests.expect_error(format($$select public.rewarded_remaining(%L)$$, :'gid'), 'nicht in dieser Gruppe');
select tests.expect_error(format($$select public._rewarded_today(%L, auth.uid())$$, :'gid'), 'permission denied');

-- Belohnungen zählen nicht in den "Verlierer der Woche" (nur Wetten).
select tests.login(:bob);
do $$ begin
  assert (select week_net from public.get_leaderboard((select id from public.groups))
          where display_name = 'Bob') = -350, 'Video-Coins zählen nicht als Wettgewinn';
end $$;

reset role;
do $$ begin
  assert (select sum(coins) from public.memberships) = (select sum(delta) from public.coin_events),
    'Buchhaltung stimmt auch mit Belohnungen';
end $$;
