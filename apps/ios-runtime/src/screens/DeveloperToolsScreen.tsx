import * as Updates from 'expo-updates';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Divider, Row, Section } from '../components/Primitives';
import { formatDate, t } from '../i18n';
import type { TempoTheme } from '../theme';
import type { TempoSnapshot } from '../types';

type Props = { theme: TempoTheme; snapshot: TempoSnapshot };

export function DeveloperToolsContent({ theme, snapshot }: Props) {
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
  valueRow: { minHeight: 64, paddingHorizontal: 20, paddingVertical: 11 },
  valueTitle: { fontSize: 17, lineHeight: 22 },
  valueDetail: { fontSize: 12.5, lineHeight: 17, marginTop: 3 },
  note: { fontSize: 12.5, lineHeight: 18, marginHorizontal: 30, marginTop: 2 },
});
