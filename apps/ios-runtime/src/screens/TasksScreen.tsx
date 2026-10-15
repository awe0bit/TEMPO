import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, FlatList, Keyboard, PanResponder, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';

import { NativeChromeGap, PrimaryButton, Screen, Sheet } from '../components/Primitives';
import { formatDate, t, weekdayLabels } from '../i18n';
import type { TempoTheme } from '../theme';
import type { TempoCommand, TempoTask } from '../types';

type Props = {
  route: 'inbox' | 'today'; theme: TempoTheme; tasks: TempoTask[];
  command?: TempoCommand; consumeCommand: () => void;
  perform: <T>(action: string, payload?: Record<string, unknown>) => Promise<T>;
};

export function TasksScreen({ route, theme, tasks, command, consumeCommand, perform }: Props) {
  const [composerVisible, setComposerVisible] = useState(false);
  const [editing, setEditing] = useState<TempoTask>();
  const [draftTitle, setDraftTitle] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [query, setQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const [undo, setUndo] = useState<TempoTask>();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarExpanded, setCalendarExpandedState] = useState(false);
  const calendar = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (command?.type === 'search') {
      setQuery(command.query ?? '');
      setSearchActive(command.active ?? false);
    }
    if (command?.type === 'newTask') openComposer();
    if (command?.type === 'showCompleted') setShowCompleted(true);
    if (command?.type === 'hideCompleted') setShowCompleted(false);
    if (command?.type === 'returnToday') setSelectedDate(new Date());
    if (command) consumeCommand();
  }, [command, consumeCommand]);

  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(undefined), 4200);
    return () => clearTimeout(timer);
  }, [undo]);

  function setCalendarExpanded(next: boolean) {
    setCalendarExpandedState(next);
    Animated.spring(calendar, { toValue: next ? 1 : 0, useNativeDriver: false, stiffness: 210, damping: 28, mass: .78 }).start();
  }

  const scoped = useMemo(() => tasks
    .filter((task) => task.status !== 'cancelled')
    .filter((task) => route === 'inbox' ? !task.startAt : sameDay(task.startAt, selectedDate)),
  [tasks, route, selectedDate]);

  const shown = useMemo(() => scoped
    .filter((task) => showCompleted || task.status !== 'completed')
    .filter((task) => `${task.title} ${task.notes}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed') || a.createdAt.localeCompare(b.createdAt)),
  [scoped, showCompleted, query]);

  function openComposer(task?: TempoTask) {
    setEditing(task);
    setDraftTitle(task?.title ?? '');
    setDraftNotes(task?.notes ?? '');
    setComposerVisible(true);
  }

  function closeComposer() {
    Keyboard.dismiss();
    setTimeout(() => setComposerVisible(false), 80);
  }

  async function saveTask() {
    const title = draftTitle.trim();
    if (!title) return;
    if (editing) {
      await perform('task.update', { id: editing.id, title, notes: draftNotes.trim() });
    } else {
      await perform('task.add', {
        title,
        notes: draftNotes.trim(),
        forToday: route === 'today',
        scheduledAt: route === 'today' ? selectedDate.toISOString() : undefined,
      });
    }
    setDraftTitle('');
    setDraftNotes('');
    setEditing(undefined);
    setComposerVisible(false);
  }

  async function remove(task: TempoTask) {
    await perform('task.delete', { id: task.id });
    setUndo(task);
  }

  return (
    <Screen theme={theme}>
      <View style={styles.flex}>
        <NativeChromeGap title={searchActive ? undefined : route === 'today' ? t('tasks.today') : t('tasks.inbox')} theme={theme} />

        {route === 'today' ? <CalendarStrip theme={theme} selected={selectedDate} onSelect={setSelectedDate} progress={calendar} expanded={calendarExpanded} onExpandedChange={setCalendarExpanded} /> : null}

        <View style={styles.listPanel}>
          <FlatList
            data={shown}
            keyExtractor={(item) => item.id}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={shown.length ? (
              <View style={styles.groupHeader}>
                <Text style={[styles.groupTitle, { color: theme.text }]}>{route === 'today' ? dayTitle(selectedDate) : query ? t('tasks.searchResults') : t('tasks.unorganized')}</Text>
                <Text style={[styles.groupCount, { color: theme.secondary }]}>{shown.length}</Text>
              </View>
            ) : null}
            ListEmptyComponent={<EmptyState theme={theme} route={route} searching={!!query} />}
            renderItem={({ item, index }) => (
              <TaskRow
                theme={theme}
                task={item}
                separated={index < shown.length - 1}
                onOpen={() => openComposer(item)}
                onToggle={() => perform('task.toggle', { id: item.id })}
                onDelete={() => remove(item)}
                onReschedule={(date) => perform('task.update', { id: item.id, scheduledAt: date })}
              />
            )}
            contentContainerStyle={shown.length ? [styles.listContent, { backgroundColor: theme.surface }] : styles.emptyContent}
          />
        </View>

        {undo ? (
          <Pressable onPress={() => { perform('task.restore', { id: undo.id }); setUndo(undefined); }} style={[styles.undo, { backgroundColor: theme.text }]}>
            <Text style={{ color: theme.background, fontWeight: '700' }}>↶  {t('tasks.undoDelete')}</Text>
          </Pressable>
        ) : null}
      </View>

      <Sheet visible={composerVisible} onClose={closeComposer} theme={theme} snapPoints={['68%', '94%']}>
        <View style={styles.sheetBody}>
          <Text style={[styles.sheetTitle, { color: theme.text }]}>{editing ? t('tasks.edit') : route === 'today' ? t('tasks.schedule') : t('tasks.capture')}</Text>
          <TextInput
            autoFocus
            value={draftTitle}
            onChangeText={setDraftTitle}
            onSubmitEditing={saveTask}
            returnKeyType="next"
            placeholder={t('tasks.titlePlaceholder')}
            placeholderTextColor={theme.tertiary}
            style={[styles.titleInput, { color: theme.text, backgroundColor: theme.surface }]}
          />
          <TextInput
            value={draftNotes}
            onChangeText={setDraftNotes}
            placeholder={t('tasks.notesPlaceholder')}
            placeholderTextColor={theme.tertiary}
            multiline
            textAlignVertical="top"
            style={[styles.notesInput, { color: theme.text, backgroundColor: theme.surface }]}
          />
          <Text style={[styles.destination, { color: theme.secondary }]}>{route === 'today' ? t('tasks.scheduleDestination', { date: fullDate(selectedDate) }) : t('tasks.inboxDestination')}</Text>
          <PrimaryButton theme={theme} label={editing ? t('tasks.saveChanges') : t('tasks.add')} onPress={saveTask} disabled={!draftTitle.trim()} />
        </View>
      </Sheet>
    </Screen>
  );
}

function CalendarStrip({ theme, selected, onSelect, progress, expanded, onExpandedChange }: {
  theme: TempoTheme;
  selected: Date;
  onSelect: (date: Date) => void;
  progress: Animated.Value;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const gridStart = useMemo(() => startOfWeek(new Date(selected.getFullYear(), selected.getMonth(), 1)), [selected.getFullYear(), selected.getMonth()]);
  const days = useMemo(() => Array.from({ length: 42 }, (_, index) => addDays(gridStart, index)), [gridStart]);
  const selectedIndex = Math.max(0, days.findIndex((date) => sameDay(date, selected)));
  const selectedRow = Math.floor(selectedIndex / 7);
  const dragStart = useRef(expanded ? 1 : 0);
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 3 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderGrant: () => { dragStart.current = expanded ? 1 : 0; },
    onPanResponderMove: (_, gesture) => progress.setValue(Math.max(0, Math.min(1, dragStart.current + gesture.dy / 210))),
    onPanResponderRelease: (_, gesture) => {
      const position = Math.max(0, Math.min(1, dragStart.current + gesture.dy / 210));
      onExpandedChange(gesture.vy > .22 ? true : gesture.vy < -.22 ? false : position >= .5);
    },
    onPanResponderTerminate: (_, gesture) => {
      const position = Math.max(0, Math.min(1, dragStart.current + gesture.dy / 210));
      onExpandedChange(position >= .5);
    },
  }), [expanded, onExpandedChange, progress]);
  const height = progress.interpolate({ inputRange: [0, 1], outputRange: [88, 298] });
  const gridHeight = progress.interpolate({ inputRange: [0, 1], outputRange: [42, 252] });
  const gridOffset = progress.interpolate({ inputRange: [0, 1], outputRange: [-selectedRow * 42, 0] });
  return (
    <Animated.View style={[styles.calendar, { height, backgroundColor: theme.surface }]}>
      <View style={styles.weekdayRow}>{weekdayLabels().map((day) => <Text key={day} style={[styles.weekday, { color: theme.secondary }]}>{day}</Text>)}</View>
      <Animated.View style={[styles.calendarGridViewport, { height: gridHeight }]}>
        <Animated.View style={{ transform: [{ translateY: gridOffset }] }}>
          {[0, 1, 2, 3, 4, 5].map((row) => <View key={row} style={styles.weekRow}>{days.slice(row * 7, row * 7 + 7).map((date) => <DateCell key={date.toISOString()} date={date} selected={sameDay(date, selected)} inCurrentMonth={date.getMonth() === selected.getMonth() && date.getFullYear() === selected.getFullYear()} theme={theme} onPress={() => onSelect(date)} />)}</View>)}
        </Animated.View>
      </Animated.View>
      <View {...pan.panHandlers} style={styles.calendarHandleTouch}>
        <Pressable onPress={() => onExpandedChange(!expanded)} hitSlop={8} style={styles.calendarHandleButton}><View style={[styles.calendarHandle, { backgroundColor: theme.tertiary }]} /></Pressable>
      </View>
    </Animated.View>
  );
}

function DateCell({ date, selected, inCurrentMonth, theme, onPress }: { date: Date; selected: boolean; inCurrentMonth: boolean; theme: TempoTheme; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.dateCell, pressed && { opacity: .55 }]}><View style={[styles.dateDot, selected && { backgroundColor: theme.accent }]}><Text style={[styles.dateNumber, { color: selected ? '#fff' : inCurrentMonth ? theme.text : theme.tertiary, opacity: selected || inCurrentMonth ? 1 : .48 }]}>{date.getDate()}</Text></View></Pressable>;
}

function TaskRow({ task, theme, separated, onOpen, onToggle, onDelete, onReschedule }: { task: TempoTask; theme: TempoTheme; separated: boolean; onOpen: () => void; onToggle: () => void; onDelete: () => void; onReschedule: (date?: string) => void }) {
  const x = useRef(new Animated.Value(0)).current;
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_, gesture) => x.setValue(Math.max(-148, Math.min(0, gesture.dx))),
    onPanResponderRelease: (_, gesture) => Animated.spring(x, { toValue: gesture.dx < -62 ? -148 : 0, useNativeDriver: true, stiffness: 240, damping: 25 }).start(),
  }), [x]);
  return (
    <View style={styles.swipeWrap}>
      <View style={styles.actions}>
        <Pressable onPress={() => onReschedule(addDays(new Date(), 1).toISOString())} style={[styles.action, { backgroundColor: theme.accent }]}><Text style={styles.actionText}>{t('tasks.tomorrow')}</Text></Pressable>
        <Pressable onPress={onDelete} style={[styles.action, { backgroundColor: theme.danger }]}><Text style={styles.actionText}>{t('tasks.delete')}</Text></Pressable>
      </View>
      <Animated.View {...pan.panHandlers} style={[styles.taskRow, { backgroundColor: theme.surface, transform: [{ translateX: x }] }]}>
        <Pressable onPress={onToggle} hitSlop={8} style={[styles.checkbox, { borderColor: task.status === 'completed' ? theme.success : theme.secondary, backgroundColor: task.status === 'completed' ? theme.success : 'transparent' }]}>{task.status === 'completed' ? <Text style={styles.check}>✓</Text> : null}</Pressable>
        <Pressable onPress={onOpen} style={({ pressed }) => [styles.taskMain, pressed && { opacity: .58 }]}>
          <View style={styles.taskText}>
            <Text numberOfLines={2} style={[styles.taskTitle, { color: task.status === 'completed' ? theme.secondary : theme.text, textDecorationLine: task.status === 'completed' ? 'line-through' : 'none' }]}>{task.title}</Text>
            {task.notes ? <Text numberOfLines={2} style={[styles.taskNotes, { color: theme.secondary }]}>{task.notes}</Text> : null}
          </View>
          {task.startAt ? <Text style={[styles.taskDate, { color: theme.secondary }]}>{sameDay(task.startAt, new Date()) ? t('tasks.today') : shortDate(task.startAt)}</Text> : null}
          <Text style={[styles.rowChevron, { color: theme.tertiary }]}>›</Text>
        </Pressable>
        {separated ? <View style={[styles.rowDivider, { backgroundColor: theme.separator }]} /> : null}
      </Animated.View>
    </View>
  );
}

function EmptyState({ theme, route, searching }: { theme: TempoTheme; route: string; searching: boolean }) {
  return <View style={styles.empty}><Text style={[styles.emptyIcon, { color: theme.tertiary }]}>{searching ? '⌕' : '✓'}</Text><Text style={[styles.emptyTitle, { color: theme.text }]}>{searching ? t('tasks.noMatches') : route === 'today' ? t('tasks.noToday') : t('tasks.inboxEmpty')}</Text><Text style={[styles.emptyBody, { color: theme.secondary }]}>{searching ? t('tasks.tryAnotherSearch') : route === 'today' ? t('tasks.timeForYourself') : t('tasks.captureAnything')}</Text></View>;
}

function sameDay(value: string | Date | null | undefined, compare: Date) { if (!value) return false; const date = typeof value === 'string' ? new Date(value) : value; return date.getFullYear() === compare.getFullYear() && date.getMonth() === compare.getMonth() && date.getDate() === compare.getDate(); }
function addDays(date: Date, count: number) { const result = new Date(date); result.setDate(result.getDate() + count); return result; }
function startOfWeek(date: Date) { return addDays(date, -((date.getDay() + 6) % 7)); }
function dayTitle(date: Date) { const today = new Date(); if (sameDay(date, today)) return t('tasks.today'); if (sameDay(date, addDays(today, -1))) return t('tasks.yesterday'); if (sameDay(date, addDays(today, 1))) return t('tasks.tomorrow'); return formatDate(date, { month: 'long', day: 'numeric' }); }
function fullDate(date: Date) { return formatDate(date, { month: 'long', day: 'numeric', weekday: 'long' }); }
function shortDate(value: string) { return formatDate(value, { month: 'numeric', day: 'numeric' }); }

const styles = StyleSheet.create({
  flex: { flex: 1 },
  calendar: { overflow: 'hidden', marginHorizontal: 20, paddingHorizontal: 12, borderRadius: 22 },
  weekdayRow: { height: 24, flexDirection: 'row', alignItems: 'center' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '500' },
  calendarGridViewport: { overflow: 'hidden' },
  weekRow: { height: 42, flexDirection: 'row' },
  dateCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dateDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dateNumber: { fontSize: 15, fontWeight: '500' },
  calendarHandleTouch: { height: 22, alignItems: 'center', justifyContent: 'center' },
  calendarHandleButton: { width: 104, height: 22, alignItems: 'center', justifyContent: 'center' },
  calendarHandle: { width: 34, height: 4, borderRadius: 2, opacity: .38 },
  listPanel: { flex: 1, marginHorizontal: 20, marginTop: 8, marginBottom: 78 },
  listContent: { borderRadius: 24, overflow: 'hidden' },
  emptyContent: { flexGrow: 1 },
  groupHeader: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  groupTitle: { flex: 1, fontSize: 18, fontWeight: '600', letterSpacing: -.2 },
  groupCount: { fontSize: 13, fontWeight: '600' },
  swipeWrap: { minHeight: 72, overflow: 'hidden' },
  actions: { ...StyleSheet.absoluteFill, flexDirection: 'row', justifyContent: 'flex-end' },
  action: { width: 74, justifyContent: 'center', alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '600' },
  taskRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingLeft: 20 },
  checkbox: { width: 24, height: 24, borderWidth: 1.6, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  check: { color: '#fff', fontWeight: '800' },
  taskMain: { minHeight: 72, flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: 14 },
  taskText: { flex: 1, paddingVertical: 12 },
  taskTitle: { fontSize: 17, fontWeight: '400', lineHeight: 22 },
  taskNotes: { fontSize: 14, lineHeight: 19, marginTop: 3 },
  taskDate: { fontSize: 12, fontWeight: '500', marginLeft: 10 },
  rowChevron: { fontSize: 23, fontWeight: '300', marginLeft: 8 },
  rowDivider: { position: 'absolute', height: StyleSheet.hairlineWidth, left: 53, right: 0, bottom: 0 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26, paddingBottom: 34 },
  emptyIcon: { fontSize: 38, lineHeight: 44, fontWeight: '200' },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 10 },
  emptyBody: { fontSize: 14, marginTop: 5 },
  undo: { position: 'absolute', left: 20, bottom: 23, borderRadius: 20, paddingHorizontal: 16, height: 42, justifyContent: 'center' },
  sheetBody: { flex: 1, paddingTop: 18 },
  sheetTitle: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -.45, paddingHorizontal: 24, marginBottom: 20 },
  titleInput: { marginHorizontal: 20, height: 60, borderRadius: 24, paddingHorizontal: 20, fontSize: 17 },
  notesInput: { marginHorizontal: 20, minHeight: 116, borderRadius: 24, padding: 20, fontSize: 16, lineHeight: 22, marginTop: 12 },
  destination: { fontSize: 13, lineHeight: 18, marginHorizontal: 22, marginTop: 12, marginBottom: 20 },
});
