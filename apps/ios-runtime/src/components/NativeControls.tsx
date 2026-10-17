import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Host, Image, Picker, Text } from '@expo/ui/swift-ui';
import { frame, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

import { t } from '../i18n';

type TimerDirection = 'countdown' | 'countUp';
export type NativeSymbolName = NonNullable<ComponentProps<typeof Image>['systemName']>;

export function NativeSymbol({ name, color, size = 25, containerSize = 40 }: {
  name: NativeSymbolName;
  color: string;
  size?: number;
  containerSize?: number;
}) {
  return (
    <Host style={{ width: containerSize, height: containerSize }} useViewportSizeMeasurement>
      <Image systemName={name} size={size} color={color} />
    </Host>
  );
}

export function NativeTimerDirectionControl({ value, onChange }: {
  value: TimerDirection;
  onChange: (value: TimerDirection) => void | Promise<unknown>;
}) {
  const [selection, setSelection] = useState(value);
  const pending = useRef<TimerDirection | undefined>(undefined);

  useEffect(() => {
    if (pending.current) {
      if (pending.current === value) pending.current = undefined;
      else return;
    }
    setSelection(value);
  }, [value]);

  return (
    <Host style={{ width: 196, height: 48 }} useViewportSizeMeasurement>
      <Picker
        selection={selection}
        onSelectionChange={(selection) => {
          if (selection !== 'countdown' && selection !== 'countUp') return;
          pending.current = selection;
          setSelection(selection);
          const result = onChange(selection);
          if (result && typeof (result as Promise<unknown>).catch === 'function') {
            void (result as Promise<unknown>).catch(() => {
              pending.current = undefined;
              setSelection(value);
            });
          }
        }}
        modifiers={[pickerStyle('segmented'), frame({ maxWidth: 1000 })]}
      >
        <Text modifiers={[tag('countdown')]}>{t('focus.pomodoroTimer')}</Text>
        <Text modifiers={[tag('countUp')]}>{t('focus.stopwatch')}</Text>
      </Picker>
    </Host>
  );
}
