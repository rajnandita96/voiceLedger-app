/**
 * Glass Card — the primary container for all content blocks.
 * Uses translucent surface with backdrop blur and subtle border.
 */

import { StyleSheet, View, type ViewProps } from 'react-native';
import { GlassColors, GlassRadius, GlassSpacing } from '@/constants/glass-theme';

interface GlassCardProps extends ViewProps {
  variant?: 'default' | 'error' | 'active';
}

export function GlassCard({ style, variant = 'default', ...props }: GlassCardProps) {
  const borderColor =
    variant === 'error'
      ? 'rgba(196, 69, 54, 0.3)'
      : variant === 'active'
        ? 'rgba(255, 215, 115, 0.2)'
        : GlassColors.glassBorder;

  return (
    <View
      style={[
        styles.card,
        {
          borderColor,
          backgroundColor: GlassColors.glass,
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: GlassRadius.lg,
    padding: GlassSpacing.lg,
    // Note: backdrop-blur is not natively supported on RN.
    // Use expo-glass-effect for iOS blur if needed.
  },
});
