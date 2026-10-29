# Wett-App für Freundesgruppen

Wetten mit Freunden um **Fake-Coins**. Es gibt keine echten Einsätze und keine Gewinne, und Coins kann man nicht kaufen.
Gebaut mit Expo (SDK 58) und Supabase. Den Gesamtplan findest du in [`PLAN.md`](./PLAN.md).

## Stand

| Phase | Inhalt | Status |
|---|---|---|
| 1 | Grundgerüst, anonymer Login, Onboarding (Name + Emoji), Profil | ✅ |
| 2 | Gruppen, Einladungslink, Wetten, Rangliste, Verlierer der Woche | ⏳ |
| 3 | Werbung (AdMob, UMP, Rewarded, Pro-Banner) | ⏳ |
| 4 | Pro über RevenueCat (werbefrei, Themes, Emojis, Statistiken) | ⏳ |
| 5 | Feinschliff | ⏳ |

## Einrichtung

### 1. Supabase-Projekt anlegen (einmalig, kostenlos)

1. Auf <https://supabase.com> ein neues Projekt anlegen. Als Region am besten Frankfurt (`eu-central-1`) nehmen, wegen DSGVO.
2. **Anonymen Login einschalten:** Authentication → Sign In / Providers → **„Allow anonymous sign-ins“** aktivieren.
3. **Datenbank einrichten:** SQL Editor öffnen, den Inhalt von `supabase/migrations/20261029000000_profiles.sql` einfügen und **Run** klicken.
   (Wer die Supabase-CLI nutzt, nimmt stattdessen `supabase link` und `supabase db push`.)
4. Unter Project Settings → API Keys die **Project URL** und den **Publishable key** kopieren.
   ⚠️ Den `secret`/`service_role`-Key niemals in die App packen.

### 2. App konfigurieren

```bash
npm install
cp .env.example .env   # dann URL + Key eintragen
```

### 3. Starten

```bash
npx expo start
```

Phase 1 läuft noch in **Expo Go**: App aus dem Store laden und den QR-Code scannen.
Ab Phase 3 (AdMob/RevenueCat) brauchst du einen **Development Build** (`npx eas-cli@latest build --profile development`). Wie das geht, erkläre ich dann.

## Testen nur mit dem Android-Handy (ohne Computer)

Bei jedem Push baut GitHub Actions automatisch eine installierbare APK
(`.github/workflows/android-apk.yml`, ca. 15–25 Minuten).

1. Auf dem Handy öffnen: **<https://github.com/linusthw43-spec/Wetten-app-mit-freunden/releases/latest>**
2. Unter „Assets“ **`wett-app.apk`** antippen und herunterladen.
3. Die Datei öffnen. Beim ersten Mal fragt Android, ob der Browser Apps installieren darf: **erlauben**.
4. Wenn Google Play Protect warnt („Unbekannte App“), auf **„Trotzdem installieren“** tippen. Das ist normal bei Apps, die nicht aus dem Play Store kommen.

Neue Versionen lassen sich einfach drüber installieren, deine Daten bleiben erhalten.
Den Stand des Builds siehst du unter **Actions** im Repo: ein grüner Haken heißt fertig.

## Befehle

```bash
npx tsc --noEmit   # Typecheck
npx expo lint      # Lint
```

## Ordnerstruktur

```
src/app/            Screens (expo-router, Datei = Route)
src/auth/           Login + Profil-Context
src/components/     UI-Bausteine
src/constants/      Farben, Abstände, Standard-Emojis
src/lib/            Supabase-Client, Typen
supabase/migrations SQL für Tabellen + Zugriffsregeln (RLS)
```

## Hinweise

- `com.example.wettapp` in `app.json` ist ein Platzhalter. Ersetze ihn vor dem ersten Store-Build durch deine eigene ID, z. B. `de.deinname.wettapp`.
- Anonyme Konten hängen am Gerät. Wer die App löscht, verliert den Zugang. Ein Upgrade auf einen Apple- oder Google-Login lässt sich später ergänzen.
