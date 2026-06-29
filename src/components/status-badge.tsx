/**
 * Status Badge — chip showing job status with colored backgrounds.
 */

import { StyleSheet, Text, View } from 'react-native';
import { GlassColors, GlassRadius } from '@/constants/glass-theme';
import type { JobStatus } from '@/lib/api';

interface StatusBadgeProps {
  status: JobStatus;
}

const config: Record<JobStatus, { label: string; bg: string; color: string }> = {
  queued: {
    label: 'QUEUED',
    bg: 'rgba(255, 215, 115, 0.1)',
    color: GlassColors.primary,
  },
  processing: {
    label: 'PROCESSING',
    bg: 'rgba(255, 215, 115, 0.12)',
    color: GlassColors.primary,
  },
  done: {
    label: 'DONE',
    bg: GlassColors.greenMuted,
    color: GlassColors.green,
  },
  failed: {
    label: 'FAILED',
    bg: GlassColors.redMuted,
    color: GlassColors.red,
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, bg, color } = config[status];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
      {status === 'processing' && <View style={[styles.dot, { backgroundColor: color }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: GlassRadius.sm,
  },
  text: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 10,
    letterSpacing: 0.06,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
