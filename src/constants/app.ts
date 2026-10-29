/** Wo Freunde die App herunterladen. Vor dem Store-Release durch den Play-Store-Link ersetzen. */
export const APP_DOWNLOAD_URL = 'https://github.com/linusthw43-spec/Wetten-app-mit-freunden/releases/latest';

/** Startguthaben pro Gruppe (muss zu den SQL-Funktionen create_group/join_group passen). */
export const START_COINS = 1000;

/** Belohnung pro geschautem Video (muss zu claim_rewarded_coins passen). */
export const REWARDED_COINS = 100;

/** Test-Werkzeuge (z. B. "Pro simulieren") nur in Test-Builds anzeigen. */
export const SHOW_TEST_TOOLS = process.env.EXPO_PUBLIC_TEST_TOOLS === '1';
