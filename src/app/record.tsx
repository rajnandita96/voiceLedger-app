/**
 * Recording Screen — modal screen for voice recording.
 * Recording stops → fires transcription job to background store → you can close immediately.
 */

import { useEffect, useState } from 'react';
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
import { GlassCard } from '@/components/glass-card';
import { useTranscription } from '@/hooks/use-transcription';
import { useTranscriptionJobs } from '@/lib/transcription-jobs';
import { logger } from '@/lib/logger';
import { GlassColors, GlassSpacing, GlassTypography, GlassRadius } from '@/constants/glass-theme';
import type { ProcessState } from '@/hooks/use-transcription';

const stateLabel: Record<ProcessState, string> = {
  idle: 'Tap to record',
  recording: 'Recording...',
  uploading: 'Submitting job...',
  done: 'Job submitted!',
};

export default function RecordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { jobs } = useTranscriptionJobs();
  const { state, errorMessage, recordingDuration, startRecording, stopRecording, reset } =
    useTranscription();

  useEffect(() => {
    return () => reset();
  }, [reset]);

  const handlePress = () => {
    if (state === 'recording') {
      stopRecording();
    } else if (state === 'idle') {
      startRecording();
    }
  };

  const handleDone = () => {
    reset();
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleDone} hitSlop={16}>
          <Text style={styles.closeBtn}>Close</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Recording</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {/* State */}
        <View style={styles.stateSection}>
          <Text style={styles.stateLabel}>{stateLabel[state]}</Text>
        </View>

        {/* Timer */}
        {(state === 'recording' || state === 'uploading') && (
          <Text style={styles.timer}>{recordingDuration}</Text>
        )}

        {/* Record button */}
        <View style={styles.buttonSection}>
          <RecordButton isRecording={state === 'recording'} onPress={handlePress} />
        </View>

        {/* Uploading */}
        {state === 'uploading' && (
          <View style={styles.progressSection}>
            <ActivityIndicator color={GlassColors.primary} size="small" />
            <Text style={styles.progressText}>Submitting for transcription...</Text>
          </View>
        )}

        {/* Done — user can close immediately */}
        {state === 'done' && (
          <GlassCard variant="active" style={styles.resultCard}>
            <Text style={styles.resultLabel}>Job Submitted</Text>
            <Text style={styles.resultBody}>
              Your recording is being transcribed. You'll see the result on the dashboard
              shortly — feel free to close this screen.
            </Text>
            <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
              <Text style={styles.doneText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        {/* Error */}
        {errorMessage ? (
          <GlassCard variant="error" style={styles.errorCard}>
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorText} selectable>
              {errorMessage}
            </Text>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={() => {
                Clipboard.setStringAsync(errorMessage);
                logger.info('Error copied to clipboard');
              }}
            >
              <Text style={styles.copyBtnText}>Copy Error</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : null}

        {/* Active jobs from the background store */}
        {jobs.length > 0 && (
          <View style={styles.jobsSection}>
            <Text style={styles.jobsTitle}>Active Jobs ({jobs.length})</Text>
            {jobs.map((job) => (
              <View key={job.localId} style={styles.jobRow}>
                <Text style={styles.jobName} numberOfLines={1}>
                  {job.fileName}
                </Text>
                <Text style={styles.jobStatus}>
                  {job.status === 'submitting'
                    ? 'Submitting...'
                    : job.status === 'queued'
                      ? 'Queued'
                      : job.status === 'processing'
                        ? 'Processing...'
                        : job.status === 'done'
                          ? '✓ Done'
                          : 'Failed'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {__DEV__ && <DebugLogPanel />}
      </View>
    </View>
  );
}

function DebugLogPanel() {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const entries = logger.getEntries();
  if (entries.length === 0) return null;
  const lastEntry = entries[0];
  const handleCopy = () => {
    Clipboard.setStringAsync(logger.dump());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <View style={debugStyles.container}>
      <View style={debugStyles.header}>
        <TouchableOpacity style={debugStyles.toggle} onPress={() => setExpanded(!expanded)}>
          <Text style={debugStyles.toggleText}>{expanded ? '▼' : '▶'} Debug ({entries.length})</Text>
          <Text style={debugStyles.lastMsg} numberOfLines={1}>
            {lastEntry.level.toUpperCase()}: {lastEntry.message}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={debugStyles.copyBtn} onPress={handleCopy}>
          <Text style={debugStyles.copyBtnText}>{copied ? 'Copied!' : 'Copy All'}</Text>
        </TouchableOpacity>
      </View>
      {expanded && (
        <ScrollView style={debugStyles.logList}>
          <Text style={debugStyles.logText} selectable>{logger.dump()}</Text>
        </ScrollView>
      )}
    </View>
  );
}

const debugStyles = StyleSheet.create({
  container: { width: '100%', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: GlassRadius.sm, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center' },
  toggle: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: GlassSpacing.sm, paddingVertical: GlassSpacing.xs },
  toggleText: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: GlassColors.textMuted },
  lastMsg: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, color: GlassColors.textDim, flex: 1, marginLeft: GlassSpacing.xs },
  copyBtn: { paddingHorizontal: GlassSpacing.sm, paddingVertical: GlassSpacing.xs },
  copyBtnText: { fontFamily: 'Outfit_500Medium', fontSize: 10, color: GlassColors.primary, letterSpacing: 0.03 },
  logList: { maxHeight: 200, paddingHorizontal: GlassSpacing.sm, paddingBottom: GlassSpacing.sm },
  logText: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, lineHeight: 14, color: GlassColors.textDim },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GlassColors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GlassSpacing.lg, paddingVertical: GlassSpacing.md },
  closeBtn: { ...GlassTypography.label, color: GlassColors.primary },
  headerTitle: { ...GlassTypography.headlineSm, color: GlassColors.textMain },
  headerSpacer: { width: 50 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: GlassSpacing.lg, gap: GlassSpacing.xl },
  stateSection: { alignItems: 'center' },
  stateLabel: { ...GlassTypography.bodySm, color: GlassColors.textMuted },
  timer: { ...GlassTypography.dataLg, color: GlassColors.primary, fontFamily: 'JetBrainsMono_400Regular', letterSpacing: 2 },
  buttonSection: { alignItems: 'center', justifyContent: 'center', paddingVertical: GlassSpacing.xl },
  progressSection: { flexDirection: 'row', alignItems: 'center', gap: GlassSpacing.sm },
  progressText: { ...GlassTypography.bodySm, color: GlassColors.textMuted },
  resultCard: { width: '100%', gap: GlassSpacing.md, alignItems: 'center' },
  resultLabel: { ...GlassTypography.label, color: GlassColors.textMuted },
  resultBody: { ...GlassTypography.bodySm, color: GlassColors.textMain, textAlign: 'center', lineHeight: 22 },
  doneBtn: { paddingHorizontal: GlassSpacing.xl, paddingVertical: GlassSpacing.sm, borderRadius: GlassRadius.md, backgroundColor: GlassColors.primary, marginTop: GlassSpacing.sm },
  doneText: { ...GlassTypography.label, color: '#3E2E00' },
  errorCard: { width: '100%', gap: GlassSpacing.sm, alignItems: 'center' },
  errorTitle: { ...GlassTypography.headlineSm, color: GlassColors.red },
  errorText: { ...GlassTypography.bodySm, color: GlassColors.red, textAlign: 'center' },
  copyBtn: { paddingHorizontal: GlassSpacing.md, paddingVertical: GlassSpacing.sm, borderRadius: GlassRadius.sm, borderWidth: 1, borderColor: GlassColors.glassBorderStrong, marginTop: GlassSpacing.sm },
  copyBtnText: { ...GlassTypography.label, color: GlassColors.textMuted },
  jobsSection: { width: '100%', gap: GlassSpacing.xs },
  jobsTitle: { ...GlassTypography.label, color: GlassColors.textMuted, marginBottom: GlassSpacing.xs },
  jobRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: GlassSpacing.sm, paddingVertical: GlassSpacing.xs, backgroundColor: 'rgba(255,215,115,0.06)', borderRadius: GlassRadius.sm },
  jobName: { fontFamily: 'Outfit_500Medium', fontSize: 12, color: GlassColors.textMain, flex: 1 },
  jobStatus: { fontFamily: 'Outfit_500Medium', fontSize: 11, color: GlassColors.primary },
});
