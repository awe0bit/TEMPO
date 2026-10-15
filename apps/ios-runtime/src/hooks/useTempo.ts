import { useCallback, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { t } from '../i18n';
import { tempoNative } from '../native/TempoNative';
import { makeTheme } from '../theme';
import type { TempoCommand, TempoSnapshot } from '../types';

export function useTempo(routeOverride?: TempoSnapshot['route']) {
  const systemScheme = useColorScheme();
  const [snapshot, setSnapshot] = useState<TempoSnapshot>();
  const [command, setCommand] = useState<TempoCommand>();
  const [error, setError] = useState<string>();
  const [activeRoute, setActiveRoute] = useState<TempoSnapshot['route'] | undefined>(routeOverride);

  useEffect(() => {
    let active = true;
    const acceptSnapshot = (value: TempoSnapshot) => {
      if (!active) return;
      setSnapshot(value);
      tempoNative.notifyReady();
    };
    tempoNative.bootstrap().then(acceptSnapshot).catch((reason) => {
      if (active) setError(messageOf(reason));
    });
    const offState = tempoNative.subscribe(acceptSnapshot);
    const offCommand = tempoNative.subscribeCommands((value) => {
      if (!active) return;
      if (value.type === 'navigate' && value.route) {
        setActiveRoute(value.route);
        return;
      }
      setCommand(value);
    });
    return () => {
      active = false;
      offState();
      offCommand();
    };
  }, []);

  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => setError(undefined), 4800);
    return () => clearTimeout(timer);
  }, [error]);

  const perform = useCallback(async <T,>(action: string, payload: Record<string, unknown> = {}) => {
    try {
      setError(undefined);
      return await tempoNative.perform(action, payload) as T;
    } catch (reason) {
      const message = messageOf(reason);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const consumeCommand = useCallback(() => setCommand(undefined), []);
  const route = activeRoute ?? snapshot?.route ?? 'today';
  const appearance = snapshot?.preferences?.appearance;
  const effectiveScheme = appearance === 'system'
    ? systemScheme
    : appearance ?? snapshot?.colorScheme ?? systemScheme;
  const theme = useMemo(
    () => makeTheme(effectiveScheme),
    [effectiveScheme],
  );

  return { snapshot, route, theme, command, consumeCommand, perform, error, clearError: () => setError(undefined) };
}

function messageOf(reason: unknown) {
  if (reason instanceof Error) return reason.message;
  return String(reason ?? t('error.operationFailed'));
}
