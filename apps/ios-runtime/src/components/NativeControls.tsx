import { Host, Picker, Text } from '@expo/ui/swift-ui';
import { frame, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

type TimerDirection = 'countdown' | 'countUp';

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
        <Text modifiers={[tag('countdown')]}>番茄计时</Text>
        <Text modifiers={[tag('countUp')]}>正计时</Text>
      </Picker>
    </Host>
  );
}
