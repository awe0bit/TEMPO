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
      damping: 31,
      mass: .72,
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
  const radius = height >= 40 ? 14 : 13;
  const segmentWidth = width > inset * 2 ? (width - inset * 2) / values.length : 0;
  const translateX = position.interpolate({
    inputRange: values.map((_, index) => index),
    outputRange: values.map((_, index) => index * segmentWidth),
  });

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[styles.control, { height, borderRadius: radius, backgroundColor: theme.surfaceMuted }, style]}
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
              borderRadius: radius,
              backgroundColor: theme.accent,
              transform: [{ translateX }],
            },
          ]}
        />
      ) : null}
      {values.map((item) => {
        const selected = item === localValue;
        return (
          <Pressable
            key={String(item)}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel?.(item) ?? label(item)}
            accessibilityState={{ selected }}
            onPress={() => select(item)}
            style={({ pressed }) => [styles.segment, pressed && styles.pressed]}
          >
            <Text numberOfLines={1} style={[styles.label, { color: selected ? '#FFFFFF' : theme.secondary }]}>{label(item)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  control: { flexDirection: 'row', overflow: 'hidden' },
  indicator: { position: 'absolute' },
  segment: { flex: 1, zIndex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  label: { fontSize: 13.5, lineHeight: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
  pressed: { opacity: .6 },
});
