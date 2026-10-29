import * as Linking from 'expo-linking';
import { Share } from 'react-native';

import { APP_DOWNLOAD_URL } from '@/constants/app';
import type { Group } from '@/lib/types';

export function inviteLink(code: string): string {
  return Linking.createURL(`join/${code}`);
}

export function inviteMessage(group: Pick<Group, 'name' | 'emoji' | 'invite_code'>): string {
  return [
    `Komm in meine Wettgruppe „${group.name}“ ${group.emoji}`,
    '',
    `Einladungscode: ${group.invite_code}`,
    `Direkt-Link: ${inviteLink(group.invite_code)}`,
    '',
    `Noch keine App? ${APP_DOWNLOAD_URL}`,
    'Dann in der App auf „Beitreten“ tippen und den Code eingeben.',
  ].join('\n');
}

export function shareInvite(group: Pick<Group, 'name' | 'emoji' | 'invite_code'>) {
  return Share.share({ message: inviteMessage(group) });
}
