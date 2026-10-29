import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { formatCoins } from '@/lib/format';

/** Coin-Betrag mit Münz-Symbol, z. B. "1.250 🪙". */
export function Coins({ value, ...rest }: ThemedTextProps & { value: number }) {
  return <ThemedText {...rest}>{formatCoins(value)} 🪙</ThemedText>;
}
