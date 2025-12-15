import { WebSocketClient } from 'orgnote-api';
import { logger } from 'src/boot/logger';

export let wsClient: WebSocketClient;

export const initWebSocketClient = () => {
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/events';
  wsClient = new WebSocketClient(wsUrl, logger);
  return wsClient;
};
