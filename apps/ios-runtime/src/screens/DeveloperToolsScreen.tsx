import { useState } from 'react';
import * as Updates from 'expo-updates';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Divider, Row, Section } from '../components/Primitives';
import type { TempoTheme } from '../theme';
import type { TempoSnapshot } from '../types';

type Props = { theme: TempoTheme; snapshot: TempoSnapshot };

export function DeveloperToolsContent({ theme, snapshot }: Props) {
  const [message, setMessage] = useState('');
  const sync = snapshot.sync;
  const updateID = Updates.updateId ?? '内置版本';
  const createdAt = Updates.createdAt ? formatDate(Updates.createdAt) : '—';

  async function reloadRuntime() {
    setMessage('正在重新载入内容层…');
    try {
      await Updates.reloadAsync();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '内容层重新载入失败');
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      alwaysBounceVertical
      keyboardDismissMode="interactive"
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.intro, { color: theme.secondary }]}>当前运行信息会随 OTA 内容层同步更新。</Text>

      <Section theme={theme} title="OTA 内容层">
        <Row theme={theme} title="运行时版本" detail={Updates.runtimeVersion ?? '—'} />
        <Divider theme={theme} />
        <Row theme={theme} title="更新通道" detail={Updates.channel ?? 'production'} />
        <Divider theme={theme} />
        <Row theme={theme} title="当前来源" detail={Updates.isEmbeddedLaunch ? '安装包内置' : 'OTA 更新'} />
        <Divider theme={theme} />
        <View style={styles.valueRow}>
          <Text style={[styles.valueTitle, { color: theme.text }]}>更新 ID</Text>
          <Text selectable numberOfLines={2} style={[styles.valueDetail, { color: theme.secondary }]}>{updateID}</Text>
        </View>
        <Divider theme={theme} />
        <Row theme={theme} title="发布时间" detail={createdAt} />
      </Section>

      <Section theme={theme} title="应用">
        <Row theme={theme} title="应用版本" detail={`v${snapshot.app?.version ?? '—'}`} />
        <Divider theme={theme} />
        <Row theme={theme} title="构建号" detail={snapshot.app?.build ?? '—'} />
        <Divider theme={theme} />
        <Row theme={theme} title="自动更新" detail={Updates.isEnabled ? '启动时自动检查' : '当前不可用'} />
      </Section>

      <Section theme={theme} title="同步诊断">
        <Row theme={theme} title="状态" detail={syncLabel(sync?.phase, sync?.pendingChangeCount ?? 0)} />
        <Divider theme={theme} />
        <Row theme={theme} title="Revision" detail={`${sync?.revision ?? 0}`} />
        <Divider theme={theme} />
        <Row theme={theme} title="待上传修改" detail={`${sync?.pendingChangeCount ?? 0}`} />
        <Divider theme={theme} />
        <Row theme={theme} title="自动同步" detail={sync?.autoSync ? '开启' : '关闭'} />
      </Section>

      <Pressable
        accessibilityRole="button"
        onPress={reloadRuntime}
        style={({ pressed }) => [styles.reload, { backgroundColor: theme.groupedSurface, opacity: pressed ? .62 : 1 }]}
      >
        <Text style={[styles.reloadText, { color: theme.accent }]}>重新载入内容层</Text>
      </Pressable>
      {message ? <Text style={[styles.message, { color: theme.secondary }]}>{message}</Text> : null}
      <Text style={[styles.note, { color: theme.tertiary }]}>不会显示或导出同步密钥、AI 密钥及其他敏感信息。</Text>
    </ScrollView>
  );
}

function syncLabel(phase?: string, pending = 0) {
  if (pending) return `${pending} 项待同步`;
  if (phase === 'syncing' || phase === '正在同步') return '正在同步';
  if (phase === 'error' || phase === '同步异常') return '同步异常';
  return phase || '已实时同步';
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(value);
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingTop: 4, paddingBottom: 112 },
  intro: { fontSize: 13.5, lineHeight: 19, marginHorizontal: 32, marginBottom: 14 },
  valueRow: { minHeight: 64, paddingHorizontal: 20, paddingVertical: 11 },
  valueTitle: { fontSize: 17, lineHeight: 22 },
  valueDetail: { fontSize: 12.5, lineHeight: 17, marginTop: 3 },
  reload: { height: 52, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginHorizontal: 20 },
  reloadText: { fontSize: 16, fontWeight: '600' },
  message: { textAlign: 'center', fontSize: 13.5, lineHeight: 19, marginTop: 12, paddingHorizontal: 24 },
  note: { fontSize: 12.5, lineHeight: 18, marginHorizontal: 30, marginTop: 18 },
});
