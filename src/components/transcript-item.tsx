/**
 * Transcript Item — displays a single transcription in a glass card.
 * Shows the transcribed text, date, duration, and status.
 */

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GlassCard } from './glass-card';
import { StatusBadge } from './status-badge';
import { GlassColors, GlassSpacing, GlassRadius } from '@/constants/glass-theme';
import type { StoredTranscription } from '@/lib/storage';

interface TranscriptItemProps {
  transcription: StoredTranscription;
  onPress?: () => void;
  onDelete?: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function TranscriptItem({ transcription, onPress, onDelete }: TranscriptItemProps) {
  const { text, fileName, duration, createdAt, status, error } = transcription;

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <GlassCard
        variant={status === 'failed' ? 'error' : 'default'}
        style={styles.card}
      >
        {/* Header row */}
        <View style={styles.header}>
          <View style={styles.meta}>
            <Text style={styles.filename} numberOfLines={1}>
              {fileName}
            </Text>
            <Text style={styles.duration}>{duration}</Text>
          </View>
          <StatusBadge status={status} />
        </View>

        {/* Transcription text */}
        {status === 'done' && (
          <Text style={styles.transcript} numberOfLines={3}>
            {text}
          </Text>
        )}

        {status === 'failed' && (
          <Text style={styles.error} numberOfLines={2}>
            {error ?? 'Transcription failed'}
          </Text>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.date}>{formatDate(createdAt)}</Text>
          {onDelete && (
            <TouchableOpacity onPress={onDelete} hitSlop={12}>
              <Text style={styles.deleteBtn}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: GlassSpacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: {
    flex: 1,
    marginRight: GlassSpacing.sm,
  },
  filename: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: GlassColors.textMain,
  },
  duration: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: GlassColors.textMuted,
    marginTop: 2,
  },
  transcript: {
    fontFamily: 'Outfit_300Light',
    fontSize: 14,
    lineHeight: 20,
    color: GlassColors.textMain,
    opacity: 0.85,
  },
  error: {
    fontFamily: 'Outfit_300Light',
    fontSize: 14,
    lineHeight: 20,
    color: GlassColors.red,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: GlassSpacing.xs,
    borderTopWidth: 1,
    borderTopColor: GlassColors.glassBorder,
  },
  date: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: GlassColors.textMuted,
    letterSpacing: 0.03,
  },
  deleteBtn: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: GlassColors.red,
    letterSpacing: 0.03,
  },
});
