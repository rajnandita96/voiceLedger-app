/**
 * History — full transcription history view with search/scroll.
 */

import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TranscriptItem } from '@/components/transcript-item';
import { GlassCard } from '@/components/glass-card';
import { useRecordings } from '@/hooks/use-recordings';
import { GlassColors, GlassSpacing, GlassTypography } from '@/constants/glass-theme';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { recordings, loading, refresh, remove } = useRecordings();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={16}>
          <Text style={styles.backBtn}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History</Text>
        <Text style={styles.count}>
          {recordings.length} {recordings.length === 1 ? 'entry' : 'entries'}
        </Text>
      </View>

      <FlatList
        data={recordings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TranscriptItem
            transcription={item}
            onDelete={() => remove(item.id)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + GlassSpacing.lg },
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No History</Text>
            <Text style={styles.emptyBody}>
              Your transcribed recordings will appear here.
            </Text>
          </GlassCard>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GlassColors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GlassSpacing.lg,
    paddingVertical: GlassSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: GlassColors.glassBorder,
  },
  backBtn: {
    ...GlassTypography.label,
    color: GlassColors.primary,
  },
  headerTitle: {
    ...GlassTypography.headlineSm,
    color: GlassColors.textMain,
  },
  count: {
    ...GlassTypography.label,
    color: GlassColors.textMuted,
  },
  listContent: {
    paddingHorizontal: GlassSpacing.lg,
    paddingTop: GlassSpacing.lg,
  },
  separator: {
    height: GlassSpacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: GlassSpacing.xxl,
    gap: GlassSpacing.md,
    marginTop: GlassSpacing.xxl,
  },
  emptyTitle: {
    ...GlassTypography.headlineSm,
    color: GlassColors.textMain,
  },
  emptyBody: {
    ...GlassTypography.bodySm,
    color: GlassColors.textMuted,
    textAlign: 'center',
  },
});
