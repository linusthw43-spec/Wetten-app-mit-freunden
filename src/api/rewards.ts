import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { groupKeys } from '@/api/groups';
import { supabase } from '@/lib/supabase';

const rewardKeys = {
  remaining: (groupId: string) => ['rewards', groupId, 'remaining'] as const,
};

/** Wie viele Belohnungsvideos sind heute in dieser Gruppe noch möglich? */
export function useRewardedRemaining(groupId: string) {
  return useQuery({
    queryKey: rewardKeys.remaining(groupId),
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc('rewarded_remaining', { p_group_id: groupId });
      if (error) throw error;
      return data;
    },
  });
}

export function useClaimRewardedCoins(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc('claim_rewarded_coins', { p_group_id: groupId });
      if (error) throw error;
      return data;
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: rewardKeys.remaining(groupId) }),
        queryClient.invalidateQueries({ queryKey: groupKeys.all }),
      ]),
  });
}
