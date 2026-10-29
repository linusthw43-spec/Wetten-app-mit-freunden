/** Holt die lesbare Meldung aus Supabase-/JS-Fehlern (unsere SQL-Funktionen werfen deutsche Texte). */
export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return String(error);
}
