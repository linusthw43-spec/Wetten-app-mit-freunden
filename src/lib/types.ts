import type { Side } from '@/lib/payout';

export type Profile = {
  id: string;
  display_name: string;
  avatar_emoji: string;
  created_at: string;
};

export type ProfilePreview = Pick<Profile, 'display_name' | 'avatar_emoji'>;

export type Group = {
  id: string;
  name: string;
  emoji: string;
  theme: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
};

/** Eine Gruppe aus Sicht des eingeloggten Nutzers, inkl. seines Guthabens. */
export type MyGroup = Group & { coins: number };

export type BetStatus = 'open' | 'locked' | 'resolved' | 'cancelled';

export type Wager = {
  user_id: string;
  side: Side;
  amount: number;
  payout: number | null;
  profile: ProfilePreview | null;
};

export type Bet = {
  id: string;
  group_id: string;
  creator_id: string;
  question: string;
  status: BetStatus;
  outcome: Side | null;
  created_at: string;
  resolved_at: string | null;
  creator: ProfilePreview | null;
  wagers: Wager[];
};

export type LeaderboardRow = {
  user_id: string;
  display_name: string;
  avatar_emoji: string;
  coins: number;
  week_net: number;
};
