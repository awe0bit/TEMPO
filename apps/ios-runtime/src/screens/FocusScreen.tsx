import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { NativeSymbol, NativeTimerDirectionControl, type NativeSymbolName } from '../components/NativeControls';
import { Screen, Sheet } from '../components/Primitives';
import { t } from '../i18n';
import type { TempoTheme } from '../theme';
import type { PomodoroState, TempoCommand } from '../types';

export function FocusScreen({ theme, pomodoro, remaining, command, consumeCommand, perform }: {
  theme: TempoTheme; pomodoro?: PomodoroState; remaining: number; command?: TempoCommand; consumeCommand: () => void;
  perform: <T>(action: string, payload?: Record<string, unknown>) => Promise<T>;
}) {
  const [statistics, setStatistics] = useState(false);
  useEffect(() => {
    if (command?.type === 'statistics') setStatistics(true);
    if (command?.type === 'resetTimer') void perform('pomodoro.reset');
    if (command?.type === 'stopTimer') void perform('pomodoro.stop');
    if (command) consumeCommand();
  }, [command, consumeCommand]);
  const state = pomodoro ?? { mode: 'focus', status: 'idle', remainingSeconds: remaining, completedFocusSessions: 0, focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, longBreakEvery: 4, dailyFocusGoal: 4, timerDirection: 'countdown', focusHistory: [] } as PomodoroState;
  const totalSeconds = Math.max(1, (state.mode === 'focus' ? state.focusMinutes : state.mode === 'shortBreak' ? state.shortBreakMinutes : state.longBreakMinutes) * 60);
  const progress = state.timerDirection === 'countUp'
    ? Math.min(1, remaining / totalSeconds)
    : Math.min(1, Math.max(0, remaining / totalSeconds));
  return (
    <Screen theme={theme}>
      <View style={styles.timerChrome}>
        <NativeTimerDirectionControl
          value={state.timerDirection}
          onChange={(direction) => void perform('pomodoro.direction', { direction })}
        />
      </View>
      <View style={styles.timerBody}>
        <TimerDial theme={theme} progress={progress}>
          <Text style={[styles.mode, { color: theme.secondary }]}>{modeTitle(state.mode)}</Text>
          <Text style={[styles.time, { color: theme.text }]}>{formatTime(remaining)}</Text>
          <Text style={[styles.status, { color: theme.secondary }]}>{state.status === 'running' ? t('focus.running') : state.status === 'paused' ? t('focus.paused') : t('focus.todayProgress', { completed: state.completedFocusSessions, goal: state.dailyFocusGoal })}</Text>
        </TimerDial>
        {state.status === 'idle' ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('focus.start')} onPress={() => perform('pomodoro.toggle')} style={({ pressed }) => [styles.startButton, { backgroundColor: theme.accent }, pressed && styles.buttonPressed]}><NativeSymbol name="play.fill" color="#FFFFFF" size={16} /><Text style={styles.startText}>{t('focus.start')}</Text></Pressable>
        ) : (
          <View style={styles.controls}>
            <TimerActionButton theme={theme} label={t('focus.stopTimer')} symbol="stop.fill" onPress={() => perform('pomodoro.stop')} />
            <TimerActionButton theme={theme} primary label={state.status === 'running' ? t('focus.pauseTimer') : t('focus.resumeTimer')} symbol={state.status === 'running' ? 'pause.fill' : 'play.fill'} onPress={() => perform('pomodoro.toggle')} />
          </View>
        )}
      </View>
      <Sheet visible={statistics} onClose={() => setStatistics(false)} theme={theme} snapPoints={['78%', '94%']}>
        <FocusStatistics theme={theme} state={state} perform={perform} />
      </Sheet>
    </Screen>
  );
}
function TimerDial({ theme, progress, children }: { theme: TempoTheme; progress: number; children: React.ReactNode }) { const progressWidth = `${Math.round(progress * 100)}%` as `${number}%`; return <View style={[styles.timerDial, { borderColor: theme.separator }]}>{children}<View style={[styles.dialTrack, { backgroundColor: theme.surfaceMuted }]}><View style={[styles.dialFill, { width: progressWidth, backgroundColor: theme.accent }]} /></View></View>; }
function TimerActionButton({ theme, label, symbol, primary = false, onPress }: { theme: TempoTheme; label: string; symbol: NativeSymbolName; primary?: boolean; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.actionButton, { backgroundColor: primary ? theme.accent : theme.surface, borderColor: primary ? theme.accent : theme.separator }, pressed && styles.buttonPressed]}><NativeSymbol name={symbol} color={primary ? '#FFFFFF' : theme.secondary} size={15} /><Text numberOfLines={1} style={[styles.actionLabel, { color: primary ? '#FFFFFF' : theme.text }]}>{label}</Text></Pressable>; }
function FocusStatistics({ theme, state, perform }: { theme: TempoTheme; state: PomodoroState; perform: <T>(action: string, payload?: Record<string, unknown>) => Promise<T> }) {
  const completedHistory = state.focusHistory.filter((item) => item.completed);
  const totalSeconds = completedHistory.reduce((sum, item) => sum + item.durationSeconds, 0);
  const goalProgress = Math.min(1, state.completedFocusSessions / Math.max(1, state.dailyFocusGoal));
  const goalWidth = `${Math.round(goalProgress * 100)}%` as `${number}%`;
  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stats}>
    <Text style={[styles.statsTitle, { color: theme.text }]}>{t('focus.statistics')}</Text>
    <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
      <View style={styles.summaryTop}>
        <View>
          <Text style={[styles.summaryLabel, { color: theme.secondary }]}>{t('focus.todayPomodoros')}</Text>
          <Text style={[styles.summaryValue, { color: theme.text }]}>{state.completedFocusSessions}<Text style={[styles.summaryGoal, { color: theme.tertiary }]}> / {state.dailyFocusGoal}</Text></Text>
        </View>
        <View style={styles.totalFocus}>
          <Text style={[styles.summaryLabel, { color: theme.secondary }]}>{t('focus.totalFocus')}</Text>
          <Text style={[styles.totalValue, { color: theme.text }]}>{formatFocusDuration(totalSeconds)}</Text>
        </View>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: theme.surfaceMuted }]}><View style={[styles.progressFill, { backgroundColor: theme.accent, width: goalWidth }]} /></View>
    </View>
    <Text style={[styles.sectionTitle, { color: theme.secondary }]}>{t('focus.heatmap')}</Text>
    <WeeklyTrend theme={theme} history={completedHistory} />
    <Text style={[styles.sectionTitle, { color: theme.secondary }]}>{t('focus.timerSettings')}</Text>
    <View style={[styles.settingsGroup, { backgroundColor: theme.surface }]}>
      <OptionRow theme={theme} label={t('focus.duration')} values={[25, 35, 45, 60]} selected={state.focusMinutes} accessibilityLabel={(value) => t('focus.minutes', { count: value })} onSelect={(focus) => perform('pomodoro.settings', { focus })} />
      <View style={[styles.settingDivider, { backgroundColor: theme.separator }]} />
      <OptionRow theme={theme} label={t('focus.todayGoal')} values={[2, 4, 6, 8]} selected={state.dailyFocusGoal} accessibilityLabel={(value) => t('focus.sessions', { count: value })} onSelect={(dailyFocusGoal) => perform('pomodoro.settings', { dailyFocusGoal })} />
    </View>
  </ScrollView>;
}
function WeeklyTrend({ theme, history }: { theme: TempoTheme; history: PomodoroState['focusHistory'] }) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => { const date = addDays(new Date(), index - 6); const seconds = history.filter((item) => sameDate(new Date(item.startedAt), date)).reduce((sum, item) => sum + item.durationSeconds, 0); return { date, minutes: Math.round(seconds / 60) }; }), [history]);
  const peak = Math.max(1, ...days.map((day) => day.minutes));
  return <View style={[styles.trendCard, { backgroundColor: theme.surface }]}>{days.map((day) => { const active = day.minutes > 0; return <View key={day.date.toDateString()} style={styles.trendColumn}><Text style={[styles.trendValue, { color: active ? theme.text : theme.tertiary }]}>{active ? day.minutes : '·'}</Text><View style={[styles.barTrack, { backgroundColor: theme.surfaceMuted }]}><View style={[styles.barFill, { backgroundColor: theme.accent, height: active ? Math.max(8, Math.round(day.minutes / peak * 70)) : 4, opacity: active ? 1 : .25 }]} /></View><Text style={[styles.dayLabel, { color: theme.secondary }]}>{day.date.toLocaleDateString(undefined, { weekday: 'narrow' })}</Text></View>; })}</View>;
}
function OptionRow({ theme, label, values, selected, accessibilityLabel, onSelect }: { theme: TempoTheme; label: string; values: number[]; selected: number; accessibilityLabel: (value: number) => string; onSelect: (value: number) => void }) { return <View style={styles.optionRow}><Text style={[styles.optionLabel, { color: theme.text }]}>{label}</Text><View style={[styles.optionControl, { backgroundColor: theme.surfaceMuted }]}>{values.map((value) => { const active = value === selected; return <Pressable key={value} accessibilityRole="button" accessibilityLabel={accessibilityLabel(value)} accessibilityState={{ selected: active }} onPress={() => onSelect(value)} style={({ pressed }) => [styles.option, active && { backgroundColor: theme.accent }, pressed && styles.optionPressed]}><Text style={[styles.optionText, { color: active ? '#FFFFFF' : theme.secondary }]}>{value}</Text></Pressable>; })}</View></View>; }
function modeTitle(mode: PomodoroState['mode']) { return mode === 'focus' ? t('focus.focus') : mode === 'shortBreak' ? t('focus.shortBreak') : t('focus.longBreak'); }
function formatTime(seconds: number) { const safe = Math.max(0, seconds); return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`; }
function formatFocusDuration(seconds: number) { return seconds < 3600 ? t('focus.minutes', { count: Math.round(seconds / 60) }) : t('focus.hours', { count: Math.round(seconds / 360) / 10 }); }
function addDays(date: Date, count: number) { const result = new Date(date); result.setDate(result.getDate() + count); return result; }
function sameDate(a: Date, b: Date) { return a.toDateString() === b.toDateString(); }
const styles = StyleSheet.create({
  timerChrome: { height: 58, alignItems: 'center', justifyContent: 'center' },
  timerBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 26 },
  timerDial: { width: 300, height: 300, borderRadius: 150, borderWidth: 5, alignItems: 'center', justifyContent: 'center', marginBottom: 44 },
  mode: { fontSize: 14, fontWeight: '600', letterSpacing: .1, marginBottom: 8 },
  time: { fontSize: 61, lineHeight: 70, fontWeight: '500', letterSpacing: -2.2, fontVariant: ['tabular-nums'] },
  status: { fontSize: 14, marginTop: 5 },
  dialTrack: { width: 132, height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 18 },
  dialFill: { height: 4, borderRadius: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionButton: { width: 136, height: 54, borderRadius: 27, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionLabel: { maxWidth: 88, fontSize: 14, fontWeight: '600' },
  startButton: { width: 180, height: 56, borderRadius: 28, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  startText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  buttonPressed: { opacity: .76, transform: [{ scale: .94 }] },
  stats: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 50 },
  statsTitle: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -.45, marginBottom: 16 },
  summaryCard: { borderRadius: 18, padding: 16 },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  summaryValue: { fontSize: 42, lineHeight: 48, fontWeight: '600', letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  summaryGoal: { fontSize: 18, fontWeight: '500', letterSpacing: -.3 },
  totalFocus: { alignItems: 'flex-end', paddingBottom: 5 },
  totalValue: { fontSize: 18, lineHeight: 24, fontWeight: '600', marginTop: 3, fontVariant: ['tabular-nums'] },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 15 },
  progressFill: { height: 6, borderRadius: 3 },
  sectionTitle: { fontSize: 13, lineHeight: 18, fontWeight: '500', marginTop: 22, marginBottom: 8, paddingHorizontal: 4 },
  trendCard: { height: 138, borderRadius: 18, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  trendColumn: { flex: 1, height: 118, alignItems: 'center', justifyContent: 'flex-end' },
  trendValue: { height: 18, fontSize: 11, lineHeight: 16, fontVariant: ['tabular-nums'] },
  barTrack: { width: 12, height: 74, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end', marginVertical: 4 },
  barFill: { width: 12, borderRadius: 6 },
  dayLabel: { fontSize: 11, lineHeight: 16 },
  settingsGroup: { borderRadius: 18, overflow: 'hidden' },
  optionRow: { minHeight: 60, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  optionLabel: { fontSize: 16, lineHeight: 22, fontWeight: '500', flexShrink: 1 },
  optionControl: { flex: 1, minWidth: 168, maxWidth: 204, height: 36, borderRadius: 18, padding: 3, flexDirection: 'row' },
  option: { flex: 1, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  optionText: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  optionPressed: { opacity: .72, transform: [{ scale: .94 }] },
  settingDivider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
});
