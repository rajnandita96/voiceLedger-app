/**
 * Glass FAB — the floating action button for starting a recording.
 * 64x64px, gold primary, fully rounded with glow shadow.
 */

import { StyleSheet, TouchableOpacity, type TouchableOpacityProps } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { GlassColors, GlassRadius } from '@/constants/glass-theme';

interface GlassFABProps extends TouchableOpacityProps {}

const micIcon: SFSymbol = 'mic.fill';

export function GlassFAB({ style, ...props }: GlassFABProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.fab, style]}
      {...props}
    >
      <SymbolView
        name={micIcon}
        size={28}
        weight="bold"
        tintColor="#3E2E00"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 64,
    height: 64,
    borderRadius: GlassRadius.full,
    backgroundColor: GlassColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow for depth
    shadowColor: GlassColors.primaryGlow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
});
