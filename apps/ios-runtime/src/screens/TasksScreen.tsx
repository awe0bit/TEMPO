import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, FlatList, Keyboard, PanResponder, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const safeAreaInsets = useSafeAreaInsets();
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
  const listRef = useRef<FlatList<TempoTask>>(null);

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
            ref={listRef}
            data={shown}
            directionalLockEnabled
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
                first={index === 0}
                last={index === shown.length - 1}
                onOpen={() => openComposer(item)}
                onToggle={() => perform('task.toggle', { id: item.id })}
                onDelete={() => remove(item)}
                onSwipeLock={(locked) => listRef.current?.setNativeProps({ scrollEnabled: !locked })}
              />
            )}
            contentContainerStyle={shown.length ? styles.listContent : styles.emptyContent}
          />
        </View>

        {undo ? <UndoBanner key={undo.id} task={undo} theme={theme} bottomInset={safeAreaInsets.bottom} onUndo={() => perform('task.restore', { id: undo.id })} onDismiss={() => setUndo(undefined)} /> : null}
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

const DELETE_THRESHOLD = 68;
const MAX_DELETE_DRAG = 116;
const DELETE_EXIT_DISTANCE = 460;

function TaskRow({ task, theme, first, last, onOpen, onToggle, onDelete, onSwipeLock }: { task: TempoTask; theme: TempoTheme; first: boolean; last: boolean; onOpen: () => void; onToggle: () => void; onDelete: () => void; onSwipeLock: (locked: boolean) => void }) {
  const x = useRef(new Animated.Value(0)).current;
  const dragStart = useRef(0);
  const deleting = useRef(false);
  const reset = () => Animated.spring(x, { toValue: 0, useNativeDriver: true, stiffness: 280, damping: 28, mass: .72 }).start();
  const deleteOpacity = x.interpolate({ inputRange: [-DELETE_THRESHOLD, -10, 0], outputRange: [1, .2, 0], extrapolate: 'clamp' });
  const deleteScale = x.interpolate({ inputRange: [-DELETE_THRESHOLD, -12, 0], outputRange: [1, .72, .68], extrapolate: 'clamp' });
  const wantsHorizontalSwipe = (_: unknown, gesture: { dx: number; dy: number }) => {
    const horizontal = gesture.dx < -6 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * .72;
    if (horizontal) onSwipeLock(true);
    return horizontal;
  };
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: wantsHorizontalSwipe,
    onMoveShouldSetPanResponderCapture: wantsHorizontalSwipe,
    onPanResponderGrant: () => x.stopAnimation((value) => { dragStart.current = value; }),
    onPanResponderMove: (_, gesture) => {
      let next = dragStart.current + gesture.dx;
      if (next > 0) next *= .12;
      if (next < -MAX_DELETE_DRAG) next = -MAX_DELETE_DRAG + (next + MAX_DELETE_DRAG) * .28;
      x.setValue(next);
    },
    onPanResponderRelease: (_, gesture) => {
      const shouldDelete = gesture.dx <= -DELETE_THRESHOLD || (gesture.dx < -22 && gesture.vx < -.85);
      if (!shouldDelete) { onSwipeLock(false); reset(); return; }
      deleting.current = true;
      Animated.timing(x, { toValue: -DELETE_EXIT_DISTANCE, duration: 190, useNativeDriver: true }).start(({ finished }) => {
        onSwipeLock(false);
        if (!finished || !deleting.current) return;
        x.setValue(0);
        deleting.current = false;
        onDelete();
      });
    },
    onPanResponderReject: () => onSwipeLock(false),
    onPanResponderTerminate: () => { onSwipeLock(false); deleting.current = false; reset(); },
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
  }), [onDelete, onSwipeLock, x]);
  const priorityColor = task.priority === 'high' ? theme.danger : task.priority === 'medium' ? theme.warning : theme.accent;
  return (
    <View style={[styles.swipeWrap, first && styles.groupTop, last && styles.groupBottom, { backgroundColor: theme.surface }]}>
      <Animated.View pointerEvents="none" style={[styles.deleteAction, { opacity: deleteOpacity, transform: [{ scale: deleteScale }] }]}><View style={[styles.deleteBubble, { backgroundColor: theme.danger }]}><Text style={styles.deleteLabel}>{t('tasks.delete')}</Text></View></Animated.View>
      <Animated.View {...pan.panHandlers} style={[styles.taskRow, first && styles.groupTop, last && styles.groupBottom, { backgroundColor: theme.surface, transform: [{ translateX: x }] }]}>
        <Pressable onPress={onToggle} hitSlop={8} style={[styles.checkbox, { borderColor: task.status === 'completed' ? theme.success : theme.tertiary, backgroundColor: task.status === 'completed' ? theme.success : 'transparent' }]}>{task.status === 'completed' ? <Text style={styles.check}>✓</Text> : null}</Pressable>
        <Pressable onPress={onOpen} style={({ pressed }) => [styles.taskMain, pressed && { opacity: .58 }]}>
          <View style={styles.taskText}>
            <View style={styles.titleLine}>{task.priority ? <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} /> : null}<Text numberOfLines={1} style={[styles.taskTitle, { color: task.status === 'completed' ? theme.secondary : theme.text, textDecorationLine: task.status === 'completed' ? 'line-through' : 'none' }]}>{task.title}</Text></View>
            {task.notes ? <Text numberOfLines={1} style={[styles.taskNotes, { color: theme.secondary }]}>{task.notes}</Text> : null}
          </View>
          {task.startAt ? <View style={[styles.dateBadge, { backgroundColor: theme.accentSoft }]}><Text style={[styles.taskDate, { color: theme.accent }]}>{sameDay(task.startAt, new Date()) ? t('tasks.today') : shortDate(task.startAt)}</Text></View> : null}
        </Pressable>
        {!last ? <View style={[styles.rowDivider, { backgroundColor: theme.separator }]} /> : null}
      </Animated.View>
    </View>
  );
}

function UndoBanner({ task, theme, bottomInset, onUndo, onDismiss }: { task: TempoTask; theme: TempoTheme; bottomInset: number; onUndo: () => void; onDismiss: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);

  function close(completion?: () => void) {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      completion?.();
      onDismiss();
    });
  }

  useEffect(() => {
    Animated.spring(progress, { toValue: 1, useNativeDriver: true, stiffness: 250, damping: 24, mass: .72 }).start();
    const timer = setTimeout(() => close(), 3800);
    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <Animated.View style={[styles.undoBanner, {
      bottom: 49 + bottomInset + 12,
      backgroundColor: theme.surfaceElevated,
      borderColor: theme.separator,
      opacity: progress,
      transform: [
        { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
        { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [.97, 1] }) },
      ],
    }]}>
      <View style={styles.undoText}>
        <Text style={[styles.undoTitle, { color: theme.text }]}>{t('tasks.deleted')}</Text>
        <Text numberOfLines={1} style={[styles.undoTask, { color: theme.secondary }]}>{task.title}</Text>
      </View>
      <Pressable onPress={() => close(onUndo)} style={({ pressed }) => [styles.undoButton, pressed && { opacity: .52 }]}>
        <Text style={[styles.undoButtonText, { color: theme.accent }]}>{t('tasks.undo')}</Text>
      </Pressable>
    </Animated.View>
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
  listPanel: { flex: 1, marginHorizontal: 18, marginTop: 8, marginBottom: 78 },
  listContent: { paddingBottom: 18 },
  emptyContent: { flexGrow: 1 },
  groupHeader: { height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
  groupTitle: { flex: 1, fontSize: 15, fontWeight: '600', letterSpacing: -.12 },
  groupCount: { minWidth: 26, height: 24, borderRadius: 12, textAlign: 'center', textAlignVertical: 'center', fontSize: 12, fontWeight: '600' },
  swipeWrap: { minHeight: 66, overflow: 'hidden' },
  groupTop: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  groupBottom: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  deleteAction: { position: 'absolute', top: 0, right: 8, bottom: 0, width: 60, justifyContent: 'center', alignItems: 'center' },
  deleteBubble: { width: 54, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  deleteLabel: { color: '#FFFFFF', fontSize: 12.5, lineHeight: 17, fontWeight: '600' },
  taskRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingLeft: 16 },
  checkbox: { width: 22, height: 22, borderWidth: 1.5, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  check: { color: '#fff', fontWeight: '800' },
  taskMain: { minHeight: 66, flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: 14 },
  taskText: { flex: 1, paddingVertical: 10 },
  titleLine: { flexDirection: 'row', alignItems: 'center' },
  priorityDot: { width: 5, height: 5, borderRadius: 3, marginRight: 7 },
  taskTitle: { flexShrink: 1, fontSize: 16.5, fontWeight: '500', lineHeight: 21 },
  taskNotes: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  dateBadge: { minWidth: 40, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginLeft: 10, paddingHorizontal: 9 },
  taskDate: { fontSize: 11.5, fontWeight: '600' },
  rowDivider: { position: 'absolute', height: StyleSheet.hairlineWidth, left: 50, right: 14, bottom: 0 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26, paddingBottom: 34 },
  emptyIcon: { fontSize: 38, lineHeight: 44, fontWeight: '200' },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 10 },
  emptyBody: { fontSize: 14, marginTop: 5 },
  undoBanner: { position: 'absolute', left: 18, right: 18, zIndex: 20, minHeight: 58, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingLeft: 16, paddingRight: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#000000', shadowOpacity: .1, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
  undoText: { flex: 1, minWidth: 0, paddingVertical: 9 },
  undoTitle: { fontSize: 14.5, lineHeight: 19, fontWeight: '600' },
  undoTask: { fontSize: 12.5, lineHeight: 17, marginTop: 1 },
  undoButton: { minWidth: 56, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, marginLeft: 8 },
  undoButtonText: { fontSize: 14.5, lineHeight: 19, fontWeight: '700' },
  sheetBody: { flex: 1, paddingTop: 18 },
  sheetTitle: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -.45, paddingHorizontal: 24, marginBottom: 20 },
  titleInput: { marginHorizontal: 20, height: 60, borderRadius: 24, paddingHorizontal: 20, fontSize: 17 },
  notesInput: { marginHorizontal: 20, minHeight: 116, borderRadius: 24, padding: 20, fontSize: 16, lineHeight: 22, marginTop: 12 },
  destination: { fontSize: 13, lineHeight: 18, marginHorizontal: 22, marginTop: 12, marginBottom: 20 },
});
