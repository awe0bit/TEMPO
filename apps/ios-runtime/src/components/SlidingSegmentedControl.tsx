import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import type { TempoTheme } from '../theme';

type SegmentValue = string | number;

export function SlidingSegmentedControl<T extends SegmentValue>({
  theme,
  values,
  value,
  label,
  accessibilityLabel,
  onChange,
  height = 36,
  style,
}: {
  theme: TempoTheme;
  values: readonly T[];
  value: T;
  label: (value: T) => string;
  accessibilityLabel?: (value: T) => string;
  onChange: (value: T) => void | Promise<unknown>;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [localValue, setLocalValue] = useState(value);
  const [width, setWidth] = useState(0);
  const position = useRef(new Animated.Value(Math.max(0, values.indexOf(value)))).current;
  const pendingValue = useRef<T | undefined>(undefined);
  const latestValue = useRef(value);

  const moveTo = (nextValue: T) => {
    const index = Math.max(0, values.indexOf(nextValue));
    position.stopAnimation();
    Animated.spring(position, {
      toValue: index,
      useNativeDriver: true,
      stiffness: 340,
      damping: 29,
      mass: .68,
    }).start();
  };

  useEffect(() => {
    latestValue.current = value;
    if (pendingValue.current !== undefined) {
      if (pendingValue.current === value) pendingValue.current = undefined;
      else return;
    }
    setLocalValue(value);
    moveTo(value);
  }, [value]);

  const select = (nextValue: T) => {
    if (nextValue === localValue) return;
    pendingValue.current = nextValue;
    setLocalValue(nextValue);
    moveTo(nextValue);

    try {
      const result = onChange(nextValue);
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        void (result as Promise<unknown>).catch(() => {
          pendingValue.current = undefined;
          setLocalValue(latestValue.current);
          moveTo(latestValue.current);
        });
      }
    } catch {
      pendingValue.current = undefined;
      setLocalValue(latestValue.current);
      moveTo(latestValue.current);
    }
  };

  const inset = 3;
  const radius = height / 2;
  const indicatorRadius = (height - inset * 2) / 2;
  const segmentWidth = width > inset * 2 ? (width - inset * 2) / values.length : 0;
  const translateX = position.interpolate({
    inputRange: values.map((_, index) => index),
    outputRange: values.map((_, index) => index * segmentWidth),
  });

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[styles.control, { height, borderRadius: radius, backgroundColor: theme.surfaceMuted, borderColor: theme.separator }, style]}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              top: inset,
              bottom: inset,
              left: inset,
              width: segmentWidth,
              borderRadius: indicatorRadius,
              backgroundColor: theme.accent,
              transform: [{ translateX }],
            },
          ]}
        />
      ) : null}
      {values.map((item) => {
        const selected = item === localValue;
        return (
          <SegmentButton
            key={String(item)}
            label={label(item)}
            accessibilityLabel={accessibilityLabel?.(item) ?? label(item)}
            selected={selected}
            theme={theme}
            onPress={() => select(item)}
          />
        );
      })}
    </View>
  );
}

function SegmentButton({ label, accessibilityLabel, selected, theme, onPress }: {
  label: string;
  accessibilityLabel: string;
  selected: boolean;
  theme: TempoTheme;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (toValue: number, immediate = false) => {
    scale.stopAnimation();
    if (immediate) {
      Animated.timing(scale, { toValue, duration: 70, useNativeDriver: true }).start();
    } else {
      Animated.spring(scale, { toValue, stiffness: 460, damping: 27, mass: .55, useNativeDriver: true }).start();
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      onPressIn={() => animate(.94, true)}
      onPressOut={() => animate(1)}
      style={styles.segment}
    >
      <Animated.View style={[styles.segmentContent, { transform: [{ scale }] }]}>
        <Text numberOfLines={1} style={[styles.label, selected && styles.labelSelected, { color: selected ? '#FFFFFF' : theme.secondary }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  control: { flexDirection: 'row', overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  indicator: { position: 'absolute', shadowColor: '#000000', shadowOpacity: .1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  segment: { flex: 1, zIndex: 1 },
  segmentContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  label: { fontSize: 13.5, lineHeight: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
  labelSelected: { fontWeight: '700' },
});
