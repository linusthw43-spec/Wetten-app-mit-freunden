import type { ConfigContext, ExpoConfig } from 'expo/config';

// Ergänzt app.json um Werte, die erst beim Build feststehen.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  android: {
    ...config.android,
    // Jeder GitHub-Actions-Build bekommt eine höhere Nummer, damit sich die APK
    // ohne Deinstallieren über die alte installieren lässt.
    versionCode: Number(process.env.ANDROID_VERSION_CODE ?? 1),
  },
});
