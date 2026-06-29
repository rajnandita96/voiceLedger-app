/**
 * Recording Screen — modal screen for voice recording and transcription.
 * Shows the animated mic button, timer, upload progress, and final transcript.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RecordButton } from '@/components/record-button';
import { StatusBadge } from '@/components/status-badge';
import { GlassCard } from '@/components/glass-card';
import { useTranscription } from '@/hooks/use-transcription';
import { logger } from '@/lib/logger';
import { GlassColors, GlassSpacing, GlassTypography, GlassRadius } from '@/constants/glass-theme';
import type { ProcessState } from '@/hooks/use-transcription';

const stateLabel: Record<ProcessState, string> = {
  idle: 'Tap to record',
  recording: 'Recording...',
  uploading: 'Uploading audio...',
  polling: 'Transcribing...',
  done: 'Transcription complete',
  error: 'Error',
};

export default function RecordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    state,
    jobStatus,
    errorMessage,
    recordingDuration,
    startRecording,
    stopRecording,
    result,
    reset,
  } = useTranscription();

  // Reset when leaving the screen
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  const handlePress = () => {
    if (state === 'recording') {
      stopRecording();
    } else if (state === 'idle' || state === 'error') {
      startRecording();
    }
  };

  const handleDone = () => {
    reset();
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            reset();
            router.back();
          }}
          hitSlop={16}
        >
          <Text style={styles.closeBtn}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Recording</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* State indicator */}
        <View style={styles.stateSection}>
          {state === 'polling' && jobStatus && (
            <StatusBadge status={jobStatus} />
          )}
          {state !== 'polling' && (
            <Text style={styles.stateLabel}>{stateLabel[state]}</Text>
          )}
        </View>

        {/* Timer */}
        {(state === 'recording' || state === 'uploading' || state === 'polling') && (
          <Text style={styles.timer}>{recordingDuration}</Text>
        )}

        {/* Recording button */}
        <View style={styles.buttonSection}>
          <RecordButton
            isRecording={state === 'recording'}
            onPress={handlePress}
          />
        </View>

        {/* Upload/Polling progress */}
        {(state === 'uploading' || state === 'polling') && (
          <View style={styles.progressSection}>
            <ActivityIndicator color={GlassColors.primary} size="small" />
            <Text style={styles.progressText}>
              {state === 'uploading' ? 'Uploading audio...' : 'Processing transcription...'}
            </Text>
          </View>
        )}

        {/* Error */}
        {errorMessage ? (
          <GlassCard variant="error" style={styles.errorCard}>
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorText} selectable>
              {errorMessage}
            </Text>
            <View style={styles.errorActions}>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => {
                  Clipboard.setStringAsync(errorMessage);
                  logger.info('Error copied to clipboard');
                }}
              >
                <Text style={styles.copyBtnText}>Copy Error</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => {
                  reset();
                  startRecording();
                }}
              >
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        ) : null}

        {/* Debug log (only shown when there's something to debug) */}
        {__DEV__ && <DebugLogPanel />}

        {/* Result */}
        {state === 'done' && result && (
          <GlassCard variant="active" style={styles.resultCard}>
            <Text style={styles.resultLabel}>Transcription</Text>
            <Text style={styles.resultText} selectable>
              {result.text}
            </Text>
            <View style={styles.resultMeta}>
              <Text style={styles.resultMetaText}>{result.fileName}</Text>
              <Text style={styles.resultMetaText}>{result.duration}</Text>
            </View>
            <View style={styles.resultActions}>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => {
                  Clipboard.setStringAsync(result.text);
                  logger.info('Transcript copied to clipboard');
                }}
              >
                <Text style={styles.copyBtnText}>Copy Text</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        )}
      </View>
    </View>
  );
}

function DebugLogPanel() {
  const [expanded, setExpanded] = useState(false);
  const entries = logger.getEntries();

  if (entries.length === 0) return null;

  const lastEntry = entries[0];

  return (
    <View style={debugStyles.container}>
      <TouchableOpacity
        style={debugStyles.toggle}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={debugStyles.toggleText}>
          {expanded ? '▼' : '▶'} Debug ({entries.length})
        </Text>
        <Text style={debugStyles.lastMsg} numberOfLines={1}>
          {lastEntry.level.toUpperCase()}: {lastEntry.message}
        </Text>
      </TouchableOpacity>
      {expanded && (
        <ScrollView style={debugStyles.logList}>
          {entries.map((e, i) => (
            <Text key={i} style={[debugStyles.logEntry, debugStyles[`level${e.level}`] as any]}>
              [{e.timestamp}] {e.level.toUpperCase()} {e.message}
            </Text>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const debugStyles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: GlassRadius.sm,
    overflow: 'hidden',
  },
  toggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: GlassSpacing.sm,
    paddingVertical: GlassSpacing.xs,
  },
  toggleText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: GlassColors.textMuted,
  },
  lastMsg: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    color: GlassColors.textDim,
    flex: 1,
    marginLeft: GlassSpacing.sm,
  },
  logList: {
    maxHeight: 200,
    paddingHorizontal: GlassSpacing.sm,
    paddingBottom: GlassSpacing.sm,
  },
  logEntry: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    lineHeight: 14,
    color: GlassColors.textDim,
  },
  leveldebug: { color: GlassColors.textDim },
  levelinfo: { color: GlassColors.textMuted },
  levelwarn: { color: GlassColors.primary },
  levelerror: { color: GlassColors.red },
});

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
  },
  closeBtn: {
    ...GlassTypography.label,
    color: GlassColors.primary,
  },
  headerTitle: {
    ...GlassTypography.headlineSm,
    color: GlassColors.textMain,
  },
  headerSpacer: {
    width: 50,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: GlassSpacing.lg,
    gap: GlassSpacing.xl,
  },
  stateSection: {
    alignItems: 'center',
  },
  stateLabel: {
    ...GlassTypography.bodySm,
    color: GlassColors.textMuted,
  },
  timer: {
    ...GlassTypography.dataLg,
    color: GlassColors.primary,
    fontFamily: 'JetBrainsMono_400Regular',
    letterSpacing: 2,
  },
  buttonSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: GlassSpacing.xl,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GlassSpacing.sm,
  },
  progressText: {
    ...GlassTypography.bodySm,
    color: GlassColors.textMuted,
  },
  errorCard: {
    width: '100%',
    gap: GlassSpacing.sm,
    alignItems: 'center',
  },
  errorTitle: {
    ...GlassTypography.headlineSm,
    color: GlassColors.red,
  },
  errorText: {
    ...GlassTypography.bodySm,
    color: GlassColors.red,
    textAlign: 'center',
  },
  errorActions: {
    flexDirection: 'row',
    gap: GlassSpacing.sm,
    marginTop: GlassSpacing.sm,
  },
  copyBtn: {
    paddingHorizontal: GlassSpacing.md,
    paddingVertical: GlassSpacing.sm,
    borderRadius: GlassRadius.sm,
    borderWidth: 1,
    borderColor: GlassColors.glassBorderStrong,
  },
  copyBtnText: {
    ...GlassTypography.label,
    color: GlassColors.textMuted,
  },
  retryBtn: {
    paddingHorizontal: GlassSpacing.lg,
    paddingVertical: GlassSpacing.sm,
    borderRadius: GlassRadius.sm,
    borderWidth: 1,
    borderColor: GlassColors.primary,
  },
  retryText: {
    ...GlassTypography.label,
    color: GlassColors.primary,
  },
  resultCard: {
    width: '100%',
    gap: GlassSpacing.md,
  },
  resultLabel: {
    ...GlassTypography.label,
    color: GlassColors.textMuted,
  },
  resultText: {
    ...GlassTypography.body,
    color: GlassColors.textMain,
    lineHeight: 26,
  },
  resultMeta: {
    flexDirection: 'row',
    gap: GlassSpacing.md,
    paddingTop: GlassSpacing.xs,
    borderTopWidth: 1,
    borderTopColor: GlassColors.glassBorder,
  },
  resultMetaText: {
    ...GlassTypography.bodySm,
    color: GlassColors.textDim,
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: GlassSpacing.sm,
    marginTop: GlassSpacing.sm,
  },
  doneBtn: {
    paddingHorizontal: GlassSpacing.xl,
    paddingVertical: GlassSpacing.sm,
    borderRadius: GlassRadius.md,
    backgroundColor: GlassColors.primary,
  },
  doneText: {
    ...GlassTypography.label,
    color: '#3E2E00',
  },
});
