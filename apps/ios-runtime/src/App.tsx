import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { useTempo } from './hooks/useTempo';
import { FocusScreen } from './screens/FocusScreen';
import { RSSScreen } from './screens/RSSScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TasksScreen } from './screens/TasksScreen';
import type { TempoRoute } from './types';

type RuntimeProps = {
  route?: TempoRoute;
  locale?: string;
};

export default function App(props: RuntimeProps) {
  const tempo = useTempo(props.route);
  const { snapshot, route, theme, error, clearError } = tempo;

  return (
    <View style={[styles.safeArea, { backgroundColor: route === 'settings' ? theme.groupedBackground : theme.background }]}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      {snapshot ? <RouteView tempo={tempo} /> : <View style={styles.loading}><ActivityIndicator color={theme.accent} /></View>}
      {error ? <Pressable accessibilityRole="button" accessibilityLabel="关闭错误提示" onPress={clearError} style={({ pressed }) => [styles.toast, { backgroundColor: theme.text, opacity: pressed ? .82 : 1 }]}><Text numberOfLines={2} style={[styles.toastText, { color: theme.background }]}>{error}</Text><Text style={[styles.toastClose, { color: theme.background }]}>×</Text></Pressable> : null}
    </View>
  );
}

function RouteView({ tempo }: { tempo: ReturnType<typeof useTempo> }) {
  const { snapshot, route, theme, command, consumeCommand, perform } = tempo;
  if (!snapshot) return null;
  if (route === 'inbox' || route === 'today') return <TasksScreen route={route} theme={theme} tasks={snapshot.tasks} command={command} consumeCommand={consumeCommand} perform={perform} />;
  if (route === 'focus') return <FocusScreen theme={theme} pomodoro={snapshot.pomodoro} remaining={snapshot.displayedRemainingSeconds} command={command} consumeCommand={consumeCommand} perform={perform} />;
  if (route === 'rss') return <RSSScreen theme={theme} articles={snapshot.rss?.articles ?? []} subscriptions={snapshot.rss?.subscriptions ?? []} folders={snapshot.rss?.folders ?? []} phase={snapshot.rss?.phase ?? 'idle'} command={command} consumeCommand={consumeCommand} perform={perform} />;
  return <SettingsScreen theme={theme} snapshot={snapshot} command={command} consumeCommand={consumeCommand} perform={perform} />;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'absolute', left: 18, right: 18, bottom: 84, zIndex: 100, minHeight: 50, borderRadius: 25, paddingLeft: 18, paddingRight: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: .2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  toastText: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '600' },
  toastClose: { width: 30, textAlign: 'center', fontSize: 22, fontWeight: '500', opacity: .72 },
});
