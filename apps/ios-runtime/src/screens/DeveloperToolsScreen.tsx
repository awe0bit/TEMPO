import * as Updates from 'expo-updates';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Divider, Row, Section } from '../components/Primitives';
import { formatDate, t } from '../i18n';
import type { TempoTheme } from '../theme';
import type { TempoSnapshot } from '../types';

type Props = { theme: TempoTheme; snapshot: TempoSnapshot };

export function DeveloperToolsContent({ theme, snapshot }: Props) {
  const update = Updates.useUpdates();
  const sync = snapshot.sync;
  const updateID = Updates.updateId ?? t('dev.embeddedVersion');
  const createdAt = Updates.createdAt
    ? formatDate(Updates.createdAt, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : t('common.notAvailable');

  return (
    <ScrollView
      style={styles.scroll}
      alwaysBounceVertical
      keyboardDismissMode="interactive"
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.intro, { color: theme.secondary }]}>{t('dev.intro')}</Text>

      <OTAProgress theme={theme} update={update} />

      <Section theme={theme} title={t('dev.otaLayer')}>
        <Row theme={theme} title={t('dev.runtimeVersion')} detail={Updates.runtimeVersion ?? t('common.notAvailable')} />
        <Divider theme={theme} />
        <Row theme={theme} title={t('dev.channel')} detail={Updates.channel ?? 'production'} />
        <Divider theme={theme} />
        <Row theme={theme} title={t('dev.source')} detail={Updates.isEmbeddedLaunch ? t('dev.embeddedSource') : t('dev.otaSource')} />
        <Divider theme={theme} />
        <View style={styles.valueRow}>
          <Text style={[styles.valueTitle, { color: theme.text }]}>{t('dev.updateID')}</Text>
          <Text selectable numberOfLines={2} style={[styles.valueDetail, { color: theme.secondary }]}>{updateID}</Text>
        </View>
        <Divider theme={theme} />
        <Row theme={theme} title={t('dev.publishedAt')} detail={createdAt} />
      </Section>

      <Section theme={theme} title={t('dev.app')}>
        <Row theme={theme} title={t('dev.appVersion')} detail={`v${snapshot.app?.version ?? t('common.notAvailable')}`} />
        <Divider theme={theme} />
        <Row theme={theme} title={t('dev.build')} detail={snapshot.app?.build ?? t('common.notAvailable')} />
        <Divider theme={theme} />
        <Row theme={theme} title={t('dev.automaticUpdates')} detail={Updates.isEnabled ? t('dev.checkOnLaunch') : t('dev.unavailable')} />
      </Section>

      <Section theme={theme} title={t('dev.syncDiagnostics')}>
        <Row theme={theme} title={t('dev.status')} detail={syncLabel(sync?.phase, sync?.pendingChangeCount ?? 0)} />
        <Divider theme={theme} />
        <Row theme={theme} title="Revision" detail={`${sync?.revision ?? 0}`} />
        <Divider theme={theme} />
        <Row theme={theme} title={t('dev.pendingUploads')} detail={`${sync?.pendingChangeCount ?? 0}`} />
        <Divider theme={theme} />
        <Row theme={theme} title={t('dev.autoSync')} detail={sync?.autoSync ? t('common.enabled') : t('common.disabled')} />
      </Section>

      <Text style={[styles.note, { color: theme.tertiary }]}>{t('dev.note')}</Text>
    </ScrollView>
  );
}

function OTAProgress({ theme, update }: { theme: TempoTheme; update: ReturnType<typeof Updates.useUpdates> }) {
  const state = otaState(update);
  const progressWidth = `${Math.round(state.progress * 100)}%` as `${number}%`;
  const updateInfo = update.downloadedUpdate ?? update.availableUpdate;
  const updateID = updateInfo?.updateId?.slice(0, 8);
  const publishedAt = updateInfo?.createdAt
    ? formatDate(updateInfo.createdAt, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : undefined;

  return (
    <Section theme={theme} title={t('dev.updateProgress')}>
      <View style={styles.progressBody}>
        <View style={styles.progressHeader}>
          <View style={styles.progressText}>
            <Text style={[styles.progressTitle, { color: theme.text }]}>{state.title}</Text>
            <Text style={[styles.progressDetail, { color: state.error ? theme.danger : theme.secondary }]}>{state.detail}</Text>
          </View>
          <Text style={[styles.progressPercent, { color: theme.secondary }]}>{Math.round(state.progress * 100)}%</Text>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: theme.surfaceMuted }]}>
          <View style={[styles.progressFill, { width: progressWidth, backgroundColor: state.error ? theme.danger : theme.accent }]} />
        </View>

        {updateID || publishedAt ? <View style={[styles.targetRow, { borderTopColor: theme.separator }]}><Text style={[styles.targetLabel, { color: theme.secondary }]}>{t('dev.targetUpdate')}</Text><Text style={[styles.targetValue, { color: theme.text }]}>{[updateID, publishedAt].filter(Boolean).join(' · ')}</Text></View> : null}
      </View>
    </Section>
  );
}

function otaState(update: ReturnType<typeof Updates.useUpdates>) {
  if (!Updates.isEnabled) return { progress: 0, title: t('dev.otaUnavailable'), detail: t('dev.otaUnavailableDetail'), error: true };
  if (update.checkError) return { progress: .08, title: t('dev.checkFailed'), detail: update.checkError.message, error: true };
  if (update.downloadError) return { progress: .18, title: t('dev.downloadFailed'), detail: update.downloadError.message, error: true };
  if (update.isRestarting) return { progress: .96, title: t('dev.restarting'), detail: t('dev.restartingDetail'), error: false };
  if (update.isUpdatePending) return { progress: .92, title: t('dev.readyToRestart'), detail: t('dev.readyToRestartDetail'), error: false };
  if (update.isDownloading) {
    const download = Math.max(0, Math.min(1, update.downloadProgress ?? 0));
    return { progress: .18 + download * .67, title: t('dev.downloading'), detail: t('dev.downloadingDetail', { progress: Math.round(download * 100) }), error: false };
  }
  if (update.isUpdateAvailable) return { progress: .16, title: t('dev.updatePublished'), detail: t('dev.updatePublishedDetail'), error: false };
  if (update.isChecking || update.isStartupProcedureRunning) return { progress: .08, title: t('dev.checkingUpdate'), detail: t('dev.checkingUpdateDetail'), error: false };
  return { progress: 1, title: t('dev.updateComplete'), detail: t('dev.updateCompleteDetail'), error: false };
}

function syncLabel(phase?: string, pending = 0) {
  if (pending) return t('sync.pending', { count: pending });
  if (phase === 'syncing' || phase === '正在同步') return t('sync.syncing');
  if (phase === 'error' || phase === '同步异常') return t('sync.error');
  if (!phase || phase === '已实时同步') return t('sync.current');
  return phase;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingTop: 4, paddingBottom: 112 },
  intro: { fontSize: 13.5, lineHeight: 19, marginHorizontal: 32, marginBottom: 14 },
  progressBody: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14 },
  progressHeader: { flexDirection: 'row', alignItems: 'center' },
  progressText: { flex: 1 },
  progressTitle: { fontSize: 16, lineHeight: 21, fontWeight: '600' },
  progressDetail: { fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  progressPercent: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'], marginLeft: 10 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 14 },
  progressFill: { height: 6, borderRadius: 3 },
  targetRow: { marginTop: 14, paddingTop: 11, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center' },
  targetLabel: { flex: 1, fontSize: 12.5, lineHeight: 18 },
  targetValue: { fontSize: 12.5, lineHeight: 18, fontWeight: '500', fontVariant: ['tabular-nums'] },
  valueRow: { minHeight: 64, paddingHorizontal: 20, paddingVertical: 11 },
  valueTitle: { fontSize: 17, lineHeight: 22 },
  valueDetail: { fontSize: 12.5, lineHeight: 17, marginTop: 3 },
  note: { fontSize: 12.5, lineHeight: 18, marginHorizontal: 30, marginTop: 2 },
});
