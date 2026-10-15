import type { ComponentProps } from 'react';
import { Host, Image, Picker, Text } from '@expo/ui/swift-ui';
import { frame, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

import { t } from '../i18n';

type TimerDirection = 'countdown' | 'countUp';
export type NativeSymbolName = NonNullable<ComponentProps<typeof Image>['systemName']>;

export function NativeSymbol({ name, color, size = 25 }: {
  name: NativeSymbolName;
  color: string;
  size?: number;
}) {
  return (
    <Host style={{ width: 40, height: 40 }} useViewportSizeMeasurement>
      <Image systemName={name} size={size} color={color} />
    </Host>
  );
}

export function NativeTimerDirectionControl({ value, onChange }: {
  value: TimerDirection;
  onChange: (value: TimerDirection) => void;
}) {
  return (
    <Host style={{ width: 196, height: 48 }} useViewportSizeMeasurement>
      <Picker
        selection={value}
        onSelectionChange={(selection) => {
          if (selection === 'countdown' || selection === 'countUp') onChange(selection);
        }}
        modifiers={[pickerStyle('segmented'), frame({ maxWidth: 1000 })]}
      >
        <Text modifiers={[tag('countdown')]}>{t('focus.pomodoroTimer')}</Text>
        <Text modifiers={[tag('countUp')]}>{t('focus.stopwatch')}</Text>
      </Picker>
    </Host>
  );
}
