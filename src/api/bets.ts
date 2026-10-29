import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { groupKeys } from '@/api/groups';
import { supabase } from '@/lib/supabase';
import type { Side } from '@/lib/payout';
import type { Bet } from '@/lib/types';

// Fremdschlüssel immer explizit angeben (!…_fkey): bets und profiles sind sowohl direkt
// (creator_id) als auch über wagers verbunden, sonst bricht PostgREST mit
// "more than one relationship was found" ab. supabase/tests prüft, dass die Namen existieren.
const BET_SELECT =
  '*, creator:profiles!bets_creator_id_fkey(display_name, avatar_emoji), ' +
  'wagers!wagers_bet_id_fkey(user_id, side, amount, payout, profile:profiles!wagers_user_id_fkey(display_name, avatar_emoji))';

export const betKeys = {
  list: (groupId: string) => ['bets', 'group', groupId] as const,
  detail: (betId: string) => ['bets', betId] as const,
};

export function useBets(groupId: string) {
  return useQuery({
    queryKey: betKeys.list(groupId),
    queryFn: async (): Promise<Bet[]> => {
      const { data, error } = await supabase
        .from('bets')
        .select(BET_SELECT)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as unknown as Bet[];
    },
  });
}

export function useBet(betId: string) {
  return useQuery({
    queryKey: betKeys.detail(betId),
    queryFn: async (): Promise<Bet> => {
      const { data, error } = await supabase.from('bets').select(BET_SELECT).eq('id', betId).single();
      if (error) throw error;
      return data as unknown as Bet;
    },
  });
}

/** Nach jeder Coin-Bewegung: Wette, Wettliste, Guthaben und Rangliste neu laden. */
function useInvalidateBet() {
  const queryClient = useQueryClient();
  return (betId: string, groupId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: betKeys.detail(betId) }),
      queryClient.invalidateQueries({ queryKey: betKeys.list(groupId) }),
      queryClient.invalidateQueries({ queryKey: groupKeys.all }),
    ]);
}

export function useCreateBet(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (question: string): Promise<string> => {
      const { data, error } = await supabase.rpc('create_bet', {
        p_group_id: groupId,
        p_question: question,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: betKeys.list(groupId) }),
  });
}

export function usePlaceWager(bet: Pick<Bet, 'id' | 'group_id'>) {
  const invalidate = useInvalidateBet();
  return useMutation({
    mutationFn: async (input: { side: Side; amount: number }) => {
      const { error } = await supabase.rpc('place_wager', {
        p_bet_id: bet.id,
        p_side: input.side,
        p_amount: input.amount,
      });
      if (error) throw error;
    },
    onSettled: () => invalidate(bet.id, bet.group_id),
  });
}

type BetAction = { type: 'lock' } | { type: 'cancel' } | { type: 'resolve'; outcome: Side };

/** Aktionen, die nur der Ersteller einer Wette ausführen darf. */
export function useBetAction(bet: Pick<Bet, 'id' | 'group_id'>) {
  const invalidate = useInvalidateBet();
  return useMutation({
    mutationFn: async (action: BetAction) => {
      const { error } =
        action.type === 'resolve'
          ? await supabase.rpc('resolve_bet', { p_bet_id: bet.id, p_outcome: action.outcome })
          : await supabase.rpc(action.type === 'lock' ? 'lock_bet' : 'cancel_bet', { p_bet_id: bet.id });
      if (error) throw error;
    },
    onSettled: () => invalidate(bet.id, bet.group_id),
  });
}
