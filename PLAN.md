# Plan: Wett-App für Freundesgruppen

Expo (React Native) + TypeScript. Es wird nur mit Fake-Coins gewettet: kein echtes Geld, keine Auszahlung, **Coins kann man nicht kaufen**.

---

## 1. Tech-Stack

| Bereich | Wahl | Warum |
|---|---|---|
| App | Expo SDK (aktuell) + TypeScript + `expo-router` | Dateibasiertes Routing, Deep-Links für Einladungen gibt's gratis |
| Backend | **Supabase** (Postgres + Auth + RLS + RPC) | Gruppen mit Freunden brauchen einen gemeinsamen Server. Coins werden **nur serverseitig** gebucht, damit niemand schummelt |
| Login | Supabase Anonymous Auth + Anzeigename (später optional Apple/Google) | Kein Passwort-Stress, Einstieg in 10 Sekunden |
| State/Daten | `@tanstack/react-query` | Caching und Refresh |
| Werbung | `react-native-google-mobile-ads` (inkl. UMP) | Wie gewünscht |
| Pro | `react-native-purchases` (RevenueCat) | Wie gewünscht |
| Build | EAS Development Build | AdMob und RevenueCat laufen **nicht in Expo Go**, man braucht einen Dev-Build |

## 2. Datenmodell (Supabase)

```
profiles      id, display_name, avatar_emoji, created_at
groups        id, name, emoji, theme, invite_code (unique), owner_id
memberships   group_id, user_id, coins (Start: 1000), joined_at
bets          id, group_id, creator_id, question, status (open|locked|resolved|cancelled),
              outcome (yes|no|null), closes_at, resolved_at
wagers        bet_id, user_id, side (yes|no), amount
coin_events   id, group_id, user_id, delta, reason (start|wager|payout|refund|rewarded_ad), ref_id, created_at
```

- **Coins gelten pro Gruppe.** Jede Gruppe hat ihre eigene Rangliste, und man startet überall bei 1000.
- **RLS:** Man sieht nur Gruppen, in denen man Mitglied ist.
- **RPC-Funktionen** (Postgres `security definer`, atomar):
  - `create_group(name, emoji)`, `join_group(invite_code)`
  - `place_wager(bet_id, side, amount)` prüft das Guthaben und zieht ab
  - `resolve_bet(bet_id, outcome)` darf nur der Ersteller. Verteilt den Topf
  - `cancel_bet(bet_id)` zahlt allen ihren Einsatz zurück
  - `claim_rewarded_coins(group_id)` gibt +100, höchstens 5× pro Tag
- **Auszahlung (Pari-Mutuel):** Der ganze Topf geht an die Gewinnerseite, aufgeteilt nach Einsatz. Hat niemand auf die Gewinnerseite gesetzt, bekommt jeder seinen Einsatz zurück.
- **Verlierer der Woche:** Das Mitglied mit der höchsten Netto-Coin-Bilanz im Minus aus Wetten, die diese Woche (Mo–So) ausgewertet wurden. Wird aus `coin_events` berechnet.

## 3. Screens (expo-router)

```
app/
  (onboarding)/name.tsx        Name + Emoji wählen
  (tabs)/index.tsx             Meine Gruppen                [Banner]
  (tabs)/profile.tsx           Profil, Pro-Status, Einstellungen, "Datenschutz-Optionen"
  group/[id]/index.tsx         Wetten der Gruppe (offen/vorbei) [Banner]
  group/[id]/leaderboard.tsx   Rangliste + Verlierer der Woche  [Banner]
  group/[id]/stats.tsx         Statistiken (Pro)
  group/[id]/settings.tsx      Einladen, Theme (Pro), Emoji (Pro)
  bet/new.tsx                  Wette erstellen (kein Banner, Formular)
  bet/[id].tsx                 Wette ansehen, setzen, auswerten
  join/[code].tsx              Deep-Link-Ziel für Einladungen
  pro.tsx                      Pro-Seite (Paywall)
```

**Einladungslink:** `wettapp://join/ABC123`, später als Universal Link (`https://…/join/ABC123`). Geteilt wird über das Share-Sheet.

## 4. Werbung (nur Gratis-Version)

Alles liegt in `src/ads/`, gesteuert über einen `AdsProvider`. Ist der Nutzer **Pro, wird nichts geladen und nichts angezeigt**, auch das SDK wird nicht initialisiert.

1. **Einwilligung (UMP) zuerst:** Beim App-Start läuft `AdsConsent.gatherConsent()`. Erst wenn `canRequestAds` true ist, folgt `mobileAds().initialize()`.
   - Lehnt jemand ab, laden wir trotzdem Werbung, dann aber **nicht personalisiert bzw. eingeschränkt** (`requestNonPersonalizedAdsOnly: true`, abgeleitet aus `getUserChoices()`). Die Einwilligung bleibt im TCF-String gespeichert, und Google liefert dann Limited Ads aus.
   - Im Profil gibt es den Button **„Datenschutz-Optionen“** (`showPrivacyOptionsForm`). Diesen Weg schreibt Google vor.
2. **Banner:** Ein adaptiver Banner unten auf Gruppen, Gruppe und Rangliste. Auf Formularen und auf der Pro-Seite gibt es keinen.
3. **Interstitial** nur an natürlichen Pausen:
   - nachdem eine Wette **erfolgreich erstellt** wurde (Wechsel zurück zur Gruppe)
   - nachdem eine Wette **erfolgreich ausgewertet** wurde (nach dem Ergebnis-Screen)
   - **Frequency Cap:** höchstens 1 alle 3 Minuten und nicht in den ersten 60 s nach dem App-Start. Wird vorgeladen; ist nichts geladen, kommt eben keine Werbung. Wir warten nie auf eine Anzeige und zeigen nie welche beim Tippen oder mitten in einer Aktion.
4. **Rewarded:** Der Button „🎬 Video schauen: +100 Coins“ steht in der Gruppe. Coins gibt es erst bei `EARNED_REWARD`, also fürs Anschauen. Vorher ist klar zu sehen, was man bekommt. Server-Limit: 5 pro Tag.
5. **Nur Test-IDs:** `TestIds.BANNER/INTERSTITIAL/REWARDED` und die Test-App-IDs von Google in `app.json`. Echte IDs kommen später über ENV und werden nur in Production-Builds aktiv.

## 5. Eigene Pro-Werbung

Nach **jedem geschlossenen Interstitial** (`AdEventType.CLOSED`) fährt unten ein eigener Banner ein: **„Kein Bock mehr auf Werbung? Hol dir Pro 👑“**
- Antippen öffnet `/pro`.
- Er lässt sich mit einem ✕ schließen und verschwindet nach ca. 8 s von selbst. Er blockiert nichts und sieht nicht aus wie Google-Werbung (das wäre gegen die Richtlinien).

## 6. Pro über RevenueCat

- Entitlement `pro`, Angebot z. B. monatlich / jährlich / lifetime (die Preise legst du im Store fest).
- `PurchasesProvider` bzw. `usePro()`-Hook hört auf `addCustomerInfoUpdateListener`. Dazu gibt es „Käufe wiederherstellen“.
- Pro bietet:
  - **Werbefrei**: keine Banner, Interstitials oder Pro-Banner. Rewarded Ads bleiben **freiwillig** verfügbar, sonst würden Pro-Nutzer weniger Coins bekommen. Alternative: Pro-Nutzer bekommen die 100 Coins ohne Video. Sag Bescheid, was dir lieber ist.
  - **Gruppen-Themes**: Farbpaletten pro Gruppe. Für alle Mitglieder sichtbar, setzen darf sie ein Pro-Mitglied.
  - **Eigene Emojis**: Gruppen- und Profil-Emoji frei wählbar statt aus 8 Standard-Emojis.
  - **Statistiken**: Trefferquote, größter Gewinn/Verlust, Verlauf der Coins (Chart), Lieblings-Seite Ja/Nein.
- Der Pro-Status wird zusätzlich per RevenueCat-Webhook → Supabase gespiegelt, damit der Server Themes prüfen kann. Das kommt in Phase 2. Im MVP prüft das der Client.

## 7. Richtlinien / Store-Hinweise

- **Keine echten Einsätze:** Coins sind nicht kaufbar und nicht auszahlbar. Das steht auch so in der App und in der Store-Beschreibung.
- Im IARC-Fragebogen von Google Play muss vermutlich **„simuliertes Glücksspiel“** angegeben werden. Das hebt die Altersfreigabe an (eher 12+/16+). Gut zu wissen, bevor du veröffentlichst.
- Nötig sind eine Datenschutzerklärung (AdMob, RevenueCat, Supabase), das Data-Safety-Formular und `app-ads.txt`.
- iOS: ATT-Abfrage (`expo-tracking-transparency`) nach UMP.

## 8. Ordnerstruktur

```
app/                  Routen (siehe oben)
src/
  ads/                AdsProvider, consent.ts, BannerSlot, useInterstitial, useRewarded, ProPromoBanner
  purchases/          PurchasesProvider, usePro
  api/                supabase client, queries/mutations
  components/         UI-Bausteine
  theme/              Standard- + Pro-Themes
  lib/                payout.ts (Auszahl-Logik, testbar), week.ts
supabase/
  migrations/         Tabellen, RLS, RPCs
tests/                Jest: Auszahlung, Frequency-Cap, Verlierer der Woche
```

## 9. Umsetzung in Phasen

1. **Grundgerüst:** Expo-Projekt, Router, Supabase-Client, anonymer Login, Onboarding
2. **Kernfunktionen:** Gruppen, Einladungslink, Wetten, Setzen, Auswerten, Rangliste, Verlierer der Woche (inkl. SQL-Migrationen und Tests der Auszahl-Logik)
3. **Werbung:** UMP, Banner, Interstitials mit Frequency Cap, Rewarded, Pro-Promo-Banner
4. **Pro:** RevenueCat, Paywall, Themes, Emojis, Statistiken
5. **Feinschliff:** Leere Zustände, Fehlerbehandlung, README mit Setup-Anleitung (Supabase-Projekt, EAS-Build, AdMob- und RevenueCat-Konten)

Was ich von hier aus **nicht** kann: auf einem echten Gerät testen, Konten anlegen (Supabase, AdMob, RevenueCat, Play Console) und einen EAS-Build starten. Dafür schreibe ich dir eine Schritt-für-Schritt-Anleitung ins README.
