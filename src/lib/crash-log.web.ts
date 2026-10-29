// Im Browser gibt es keinen nativen Absturzbericht.
export function readLastCrash(): string | null {
  return null;
}
export function clearLastCrash() {}
export function isSafeMode(): boolean {
  return false;
}
export function setSafeMode(_on: boolean) {}
