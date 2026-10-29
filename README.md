# Wett-App für Freundesgruppen

Wetten mit Freunden um **Fake-Coins**. Es gibt keine echten Einsätze und keine Gewinne, und Coins kann man nicht kaufen.
Gebaut mit Expo (SDK 58) und Supabase. Den Gesamtplan findest du in [`PLAN.md`](./PLAN.md).

## Stand

| Phase | Inhalt | Status |
|---|---|---|
| 1 | Grundgerüst, anonymer Login, Onboarding (Name + Emoji), Profil | ✅ |
| 2 | Gruppen, Einladungslink, Wetten, Rangliste, Verlierer der Woche | ✅ |
| 3 | Werbung (AdMob, UMP, Rewarded, Pro-Banner) | ✅ |
| 4 | Pro über RevenueCat (werbefrei, Themes, Emojis, Statistiken) | ⏳ |
| 5 | Feinschliff | ⏳ |

## Einrichtung

### 1. Supabase-Projekt anlegen (einmalig, kostenlos)

1. Auf <https://supabase.com> ein neues Projekt anlegen. Als Region am besten Frankfurt (`eu-central-1`) nehmen, wegen DSGVO.
2. **Anonymen Login einschalten:** Authentication → Sign In / Providers → **„Allow anonymous sign-ins“** aktivieren.
3. **Datenbank einrichten:** Im SQL Editor **nacheinander** jede Datei aus `supabase/migrations/` einfügen und **Run** klicken (jede genau einmal, in der Reihenfolge der Dateinamen):
   1. `20261029000000_profiles.sql` (Phase 1)
   2. `20261029120000_groups_bets.sql` (Phase 2)
   3. `20261030090000_rewarded_ads.sql` (Phase 3)

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

Ab Phase 3 (AdMob) läuft die App **nicht mehr in Expo Go**, weil sie native Module enthält.
Zum Testen die APK aus GitHub Actions nehmen (siehe unten) oder lokal `npx expo run:android`.

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

## Werbung (Gratis-Version)

Alles liegt in `src/ads/`. Mit Pro wird nichts davon angezeigt.

- **Einwilligung zuerst:** Beim Start (nach dem Onboarding) fragt Googles UMP-SDK nach der Einwilligung. Erst danach startet das Werbe-SDK.
  Wer personalisierte Werbung ablehnt, bekommt nur **nicht-personalisierte/eingeschränkte** Werbung.
  Im Profil gibt es „Datenschutz-Optionen“, um die Entscheidung zu ändern (Google-Pflicht in der EU).
- **Banner** unten auf: Gruppenliste, Gruppe, Rangliste. Nicht auf Formularen und nicht auf dem Wett-Screen (dort wird getippt).
- **Interstitial** nur an natürlichen Pausen: nach „Wette erstellt“ bzw. „Wette ausgewertet“, und zwar erst beim Zurückkehren in die Gruppe.
  Höchstens eins alle 3 Minuten, keins in der ersten Minute nach App-Start, und nur, wenn es schon geladen ist. Die App wartet nie auf Werbung.
- **Pro-Hinweis** nach jedem Interstitial: „Kein Bock mehr auf Werbung? Hol dir Pro 👑“. Er sitzt über dem Banner (verdeckt keine Anzeige), lässt sich wegtippen und verschwindet nach 8 s.
- **Belohnungsvideo:** +100 🪙 fürs vollständige Anschauen, höchstens 5 pro Tag und Gruppe (wird in der Datenbank geprüft, *bevor* das Video startet). Pro-Nutzer können freiwillig weiter schauen.
- **Nur Test-IDs:** Solange keine echten IDs gesetzt sind, nutzt die App Googles Test-Anzeigen.
  Für den Store später die App-IDs in `app.json` ersetzen und die Anzeigenblöcke per ENV setzen
  (`EXPO_PUBLIC_ADMOB_BANNER_ANDROID`, `…_INTERSTITIAL_ANDROID`, `…_REWARDED_ANDROID`). In Debug-Builds werden immer Test-IDs verwendet.

**Bekannte Grenze:** Ein Bastler könnte `claim_rewarded_coins` ohne Video aufrufen (max. 500 🪙/Tag/Gruppe).
Wasserdicht wäre die serverseitige Prüfung (AdMob „Server-Side Verification“ über eine Supabase Edge Function). Das lässt sich später ergänzen.

## Absturzbericht (ohne Computer)

Stürzt die App ab, erscheint ein Bildschirm „Die App ist abgestürzt 😵“ mit dem Fehlertext.
Dort: **„Bericht teilen“** (z. B. per WhatsApp/Mail an den Entwickler), **„Kopieren“**,
**„App neu starten“** oder **„Ohne Werbung neu starten“** (abgesicherter Modus, falls die Werbung schuld ist).
Der letzte Bericht lässt sich auch später im Profil teilen. Im Test-Build gibt es im Profil „Test-Absturz auslösen“.

Technik: `plugins/with-crash-screen.js` (Expo-Config-Plugin) baut einen nativen Absturz-Handler und eine eigene
Activity im Prozess `:crash` ein. Das fängt native Abstürze und fatale JavaScript-Fehler ab.

## Ordnerstruktur

```
src/app/            Screens (expo-router, Datei = Route)
src/ads/            Werbung: Einwilligung, Banner, Interstitial, Video, Pro-Hinweis
src/purchases/      Pro-Status (Phase 3: simuliert, Phase 4: RevenueCat)
src/api/            Datenzugriff (React Query + Supabase)
src/auth/           Login + Profil-Context
src/components/     UI-Bausteine
src/constants/      Farben, Abstände, Standard-Emojis
src/lib/            Supabase-Client, Typen, Auszahl-Logik, Formatierung, Absturzbericht
plugins/            Eigene Expo-Config-Plugins (Absturz-Anzeige)
supabase/migrations SQL für Tabellen, Zugriffsregeln (RLS) und Coin-Funktionen
supabase/tests      SQL-Tests (laufen gegen ein normales Postgres)
```

## Hinweise

- `com.example.wettapp` in `app.json` ist ein Platzhalter. Ersetze ihn vor dem ersten Store-Build durch deine eigene ID, z. B. `de.deinname.wettapp`.
- Anonyme Konten hängen am Gerät. Wer die App löscht, verliert den Zugang. Ein Upgrade auf einen Apple- oder Google-Login lässt sich später ergänzen.
