import { File, Paths } from 'expo-file-system';

// Dateinamen müssen zu plugins/with-crash-screen.js (CrashReporter.kt) passen.
const REPORT = 'last-crash.txt';
const SAFE_MODE = 'safe-mode';

function file(name: string) {
  return new File(Paths.document, name);
}

/** Letzter gespeicherter Absturzbericht (vom nativen CrashReporter), sonst null. */
export function readLastCrash(): string | null {
  try {
    const f = file(REPORT);
    return f.exists ? f.textSync() : null;
  } catch {
    return null;
  }
}

export function clearLastCrash() {
  try {
    const f = file(REPORT);
    if (f.exists) f.delete();
  } catch {
    // egal
  }
}

/** Abgesicherter Modus: nach einem Absturz ohne Werbung starten. */
export function isSafeMode(): boolean {
  try {
    return file(SAFE_MODE).exists;
  } catch {
    return false;
  }
}

export function setSafeMode(on: boolean) {
  try {
    const f = file(SAFE_MODE);
    if (on) {
      if (!f.exists) f.create();
      f.write('1');
    } else if (f.exists) {
      f.delete();
    }
  } catch {
    // egal
  }
}
