import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FREE_EMOJIS, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type EmojiPickerProps = {
  value: string;
  onChange: (emoji: string) => void;
  options?: readonly string[];
};

export function EmojiPicker({ value, onChange, options = FREE_EMOJIS }: EmojiPickerProps) {
  const theme = useTheme();
  return (
    <View style={styles.grid}>
      {options.map((emoji) => {
        const selected = emoji === value;
        return (
          <Pressable
            key={emoji}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(emoji)}
            style={[
              styles.cell,
              {
                backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
                borderColor: selected ? theme.accent : 'transparent',
              },
            ]}>
            <Text style={styles.emoji}>{emoji}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  cell: {
    width: 64,
    height: 64,
    borderRadius: Radius.medium,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 32 },
});
