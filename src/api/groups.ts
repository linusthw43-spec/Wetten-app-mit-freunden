import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/auth/auth-provider';
import { supabase } from '@/lib/supabase';
import type { LeaderboardRow, MyGroup } from '@/lib/types';

export const groupKeys = {
  all: ['groups'] as const,
  detail: (id: string) => ['groups', id] as const,
  leaderboard: (id: string) => ['groups', id, 'leaderboard'] as const,
};

function useUserId() {
  const { session } = useAuth();
  return session?.user.id ?? '';
}

export function useMyGroups() {
  const userId = useUserId();
  return useQuery({
    queryKey: groupKeys.all,
    queryFn: async (): Promise<MyGroup[]> => {
      const { data, error } = await supabase
        .from('memberships')
        .select('coins, group:groups(*)')
        .eq('user_id', userId)
        .order('joined_at', { ascending: false });
      if (error) throw error;
      return data.map((row: any) => ({ ...row.group, coins: row.coins }));
    },
  });
}

export function useGroup(groupId: string) {
  const userId = useUserId();
  return useQuery({
    queryKey: groupKeys.detail(groupId),
    enabled: groupId !== '',
    queryFn: async (): Promise<MyGroup> => {
      const { data, error } = await supabase
        .from('memberships')
        .select('coins, group:groups(*)')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      const row = data as any;
      return { ...row.group, coins: row.coins };
    },
  });
}

export function useLeaderboard(groupId: string) {
  return useQuery({
    queryKey: groupKeys.leaderboard(groupId),
    queryFn: async (): Promise<LeaderboardRow[]> => {
      const { data, error } = await supabase.rpc('get_leaderboard', { p_group_id: groupId });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; emoji: string }): Promise<string> => {
      const { data, error } = await supabase.rpc('create_group', {
        p_name: input.name,
        p_emoji: input.emoji,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupKeys.all }),
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string): Promise<string> => {
      const { data, error } = await supabase.rpc('join_group', { p_code: code });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupKeys.all }),
  });
}
