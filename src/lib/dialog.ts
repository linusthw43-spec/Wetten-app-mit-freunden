import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * Wie Alert.alert, funktioniert aber auch im Browser (dort tut Alert.alert nichts).
 * Im Web wird der erste Nicht-Abbrechen-Button per window.confirm bestätigt.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  const text = [title, message].filter(Boolean).join('\n\n');
  const action = buttons?.find((b) => b.style !== 'cancel');
  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    action?.onPress?.();
  } else if (window.confirm(text)) {
    action?.onPress?.();
  }
}
