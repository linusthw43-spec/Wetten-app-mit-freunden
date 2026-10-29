# Wett-App für Freundesgruppen

Wetten mit Freunden um **Fake-Coins**. Es gibt keine echten Einsätze und keine Gewinne, und Coins kann man nicht kaufen.
Gebaut mit Expo (SDK 58) und Supabase. Den Gesamtplan findest du in [`PLAN.md`](./PLAN.md).

## Stand

| Phase | Inhalt | Status |
|---|---|---|
| 1 | Grundgerüst, anonymer Login, Onboarding (Name + Emoji), Profil | ✅ |
| 2 | Gruppen, Einladungslink, Wetten, Rangliste, Verlierer der Woche | ✅ |
| 3 | Werbung (AdMob, UMP, Rewarded, Pro-Banner) | ⏳ |
| 4 | Pro über RevenueCat (werbefrei, Themes, Emojis, Statistiken) | ⏳ |
| 5 | Feinschliff | ⏳ |

## Einrichtung

### 1. Supabase-Projekt anlegen (einmalig, kostenlos)

1. Auf <https://supabase.com> ein neues Projekt anlegen. Als Region am besten Frankfurt (`eu-central-1`) nehmen, wegen DSGVO.
2. **Anonymen Login einschalten:** Authentication → Sign In / Providers → **„Allow anonymous sign-ins“** aktivieren.
3. **Datenbank einrichten:** Im SQL Editor **nacheinander** jede Datei aus `supabase/migrations/` einfügen und **Run** klicken (jede genau einmal, in der Reihenfolge der Dateinamen):
   1. `20261029000000_profiles.sql` (Phase 1)
   2. `20261029120000_groups_bets.sql` (Phase 2)

   Wer die Supabase-CLI nutzt, nimmt stattdessen `supabase link` und `supabase db push`.
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
npm test           # Unit-Tests (Auszahl-Logik, Formatierung)
DATABASE_URL=postgres://… npm run test:db   # SQL-Tests gegen ein leeres Postgres
```

Bei jedem Push laufen alle Tests automatisch in GitHub Actions (Workflow „Tests“).

## So funktionieren Wetten

- Jede Gruppe hat ihr eigenes Guthaben, jedes Mitglied startet mit **1.000 🪙**.
- Wetten sind Ja/Nein-Fragen. Man setzt auf eine Seite und kann dort nachlegen.
- Der Ersteller kann die **Einsätze stoppen**, trägt das **Ergebnis** ein oder **bricht ab** (dann gibt es alles zurück).
- **Auszahlung:** Der ganze Topf geht an die Gewinnerseite, aufgeteilt nach Einsatz. Ein Rundungsrest geht an den höchsten Einsatz. Hat niemand richtig getippt, bekommt jeder seinen Einsatz zurück.
- **Verlierer der Woche:** wer seit Montag (deutsche Zeit) in ausgewerteten Wetten netto am meisten verloren hat.
- Alle Coin-Buchungen passieren in der Datenbank (`security definer`-Funktionen), die App kann Coins nicht direkt ändern.

## Ordnerstruktur

```
src/app/            Screens (expo-router, Datei = Route)
src/api/            Datenzugriff (React Query + Supabase)
src/auth/           Login + Profil-Context
src/components/     UI-Bausteine
src/constants/      Farben, Abstände, Standard-Emojis
src/lib/            Supabase-Client, Typen, Auszahl-Logik, Formatierung
supabase/migrations SQL für Tabellen, Zugriffsregeln (RLS) und Coin-Funktionen
supabase/tests      SQL-Tests (laufen gegen ein normales Postgres)
```

## Hinweise

- `com.example.wettapp` in `app.json` ist ein Platzhalter. Ersetze ihn vor dem ersten Store-Build durch deine eigene ID, z. B. `de.deinname.wettapp`.
- Anonyme Konten hängen am Gerät. Wer die App löscht, verliert den Zugang. Ein Upgrade auf einen Apple- oder Google-Login lässt sich später ergänzen.
