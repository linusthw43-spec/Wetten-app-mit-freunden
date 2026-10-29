import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

/** Lädt Daten neu, wenn man zu einem Screen zurücknavigiert (nicht beim ersten Öffnen). */
export function useRefreshOnFocus(refetch: () => unknown) {
  // In einer Ref, damit eine bei jedem Render neue Funktion keine Lade-Schleife auslöst.
  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  });

  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refetchRef.current();
    }, [])
  );
}
