import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState } from 'react-native';

const SIGNAL_URL = 'wss://todo.darker.one/api/ota/events';
const RETRY_DELAYS = [0, 3000, 8000] as const;

type OTAAnnouncement = {
  type: 'ota-ready';
  channel: string;
  runtimeVersion: string;
};

export function useForegroundOTA() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    let active = AppState.currentState === 'active';
    let disposed = false;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let socket: WebSocket | undefined;
    let updateTask: Promise<void> | undefined;

    const clearReconnect = () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    };

    const disconnect = () => {
      clearReconnect();
      const current = socket;
      socket = undefined;
      if (current && current.readyState < WebSocket.CLOSING) current.close(1000, 'background');
    };

    const checkAndDownload = async (announcement: OTAAnnouncement) => {
      if (announcement.channel !== (Updates.channel ?? 'production')) return;
      if (announcement.runtimeVersion !== Updates.runtimeVersion) return;
      if (updateTask) return updateTask;

      updateTask = (async () => {
        for (const delay of RETRY_DELAYS) {
          if (delay) await wait(delay);
          if (disposed || !active) return;
          const result = await Updates.checkForUpdateAsync();
          if (!result.isAvailable) continue;
          await Updates.fetchUpdateAsync();
          return;
        }
      })().catch(() => {
        // expo-updates exposes check/download failures through useUpdates.
      }).finally(() => {
        updateTask = undefined;
      });
      return updateTask;
    };

    const connect = () => {
      if (disposed || !active || socket) return;
      clearReconnect();
      const next = new WebSocket(SIGNAL_URL);
      socket = next;
      next.onopen = () => {
        reconnectAttempt = 0;
      };
      next.onmessage = event => {
        if (typeof event.data !== 'string') return;
        try {
          const announcement = JSON.parse(event.data) as Partial<OTAAnnouncement>;
          if (announcement.type !== 'ota-ready' || !announcement.channel || !announcement.runtimeVersion) return;
          void checkAndDownload(announcement as OTAAnnouncement);
        } catch {
          // Ignore malformed signal payloads; the connection stays usable.
        }
      };
      next.onerror = () => {
        next.close();
      };
      next.onclose = () => {
        if (socket === next) socket = undefined;
        if (disposed || !active) return;
        const delay = Math.min(30000, 1000 * 2 ** Math.min(reconnectAttempt, 5));
        reconnectAttempt += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    const subscription = AppState.addEventListener('change', state => {
      active = state === 'active';
      if (active) connect();
      else disconnect();
    });
    if (active) connect();

    return () => {
      disposed = true;
      subscription.remove();
      disconnect();
    };
  }, []);
}

function wait(milliseconds: number) {
  return new Promise<void>(resolve => setTimeout(resolve, milliseconds));
}
