/**
 * Dashboard — main screen with transcription history and FAB.
 * Shows recent transcriptions in glass cards with a floating record button.
 */

import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/glass-card';
import { GlassFAB } from '@/components/glass-fab';
import { TranscriptItem } from '@/components/transcript-item';
import { useRecordings } from '@/hooks/use-recordings';
import { GlassColors, GlassSpacing, GlassTypography, GlassRadius } from '@/constants/glass-theme';
import { healthCheck } from '@/lib/api';

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { recordings, loading, refresh, remove } = useRecordings();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  // Refresh list on focus and check API health
  useFocusEffect(
    useCallback(() => {
      refresh();
      healthCheck().then(setApiOnline).catch(() => setApiOnline(false));
    }, [refresh]),
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <GlassCard style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>No Transcriptions Yet</Text>
        <Text style={styles.emptyBody}>
          Tap the gold button to record your first voice note.
          Your words will be transcribed and stored here.
        </Text>
      </GlassCard>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.title}>VoiceLedger</Text>
          <Text style={styles.subtitle}>Your voice-powered financial journal</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/history' as any)}
          style={styles.historyBtn}
        >
          <Text style={styles.historyBtnText}>History</Text>
        </TouchableOpacity>
      </View>
      {apiOnline !== null && (
        <View style={[styles.apiBadge, apiOnline ? styles.apiOnline : styles.apiOffline]}>
          <View style={[styles.apiDot, { backgroundColor: apiOnline ? GlassColors.green : GlassColors.red }]} />
          <Text style={styles.apiText}>
            {apiOnline ? 'API Online' : 'API Offline'}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={recordings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TranscriptItem
            transcription={item}
            onPress={() => {
              // Could navigate to detail view
            }}
            onDelete={() => remove(item.id)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? renderEmpty : null}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={GlassColors.primary} size="large" />
        </View>
      )}

      {/* FAB */}
      <View style={[styles.fabContainer, { bottom: insets.bottom + 32 }]}>
        <GlassFAB onPress={() => router.push('/record' as any)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GlassColors.bg,
  },
  listContent: {
    paddingHorizontal: GlassSpacing.lg,
    paddingTop: GlassSpacing.sm,
  },
  header: {
    paddingTop: GlassSpacing.xl,
    paddingBottom: GlassSpacing.xl,
    gap: GlassSpacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historyBtn: {
    paddingHorizontal: GlassSpacing.md,
    paddingVertical: GlassSpacing.xs,
    borderRadius: GlassRadius.sm,
    borderWidth: 1,
    borderColor: GlassColors.glassBorderStrong,
  },
  historyBtnText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: GlassColors.textMuted,
    letterSpacing: 0.04,
  },
  title: {
    ...GlassTypography.headline,
    color: GlassColors.textMain,
  },
  subtitle: {
    ...GlassTypography.bodySm,
    color: GlassColors.textMuted,
    marginTop: 4,
  },
  apiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: GlassRadius.sm,
  },
  apiOnline: {
    backgroundColor: GlassColors.greenMuted,
  },
  apiOffline: {
    backgroundColor: GlassColors.redMuted,
  },
  apiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  apiText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11,
    color: GlassColors.textMuted,
    letterSpacing: 0.03,
  },
  empty: {
    paddingTop: GlassSpacing.xxl,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: GlassSpacing.xxl,
    gap: GlassSpacing.md,
  },
  emptyTitle: {
    ...GlassTypography.headlineSm,
    color: GlassColors.textMain,
    textAlign: 'center',
  },
  emptyBody: {
    ...GlassTypography.bodySm,
    color: GlassColors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  separator: {
    height: GlassSpacing.md,
  },
  loadingOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 14, 13, 0.5)',
  },
  fabContainer: {
    position: 'absolute',
    right: GlassSpacing.lg,
    alignItems: 'center',
  },
});
