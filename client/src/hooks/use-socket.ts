import { useEffect, useState } from 'react';
import { useWebSocket, WebSocketMessageTypes, WebSocketMessage } from '@/lib/socket';

// Custom hook to subscribe to specific WebSocket message types
export function useSocketMessage<T>(messageType: string): T | null {
  const { lastMessage } = useWebSocket();
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    if (lastMessage && lastMessage.type === messageType) {
      setData(lastMessage.payload);
    }
  }, [lastMessage, messageType]);

  return data;
}

// Custom hook to subscribe to multiple WebSocket message types
export function useSocketMessages<T>(messageTypes: string[]): T | null {
  const { lastMessage } = useWebSocket();
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    if (lastMessage && messageTypes.includes(lastMessage.type)) {
      setData(lastMessage.payload);
    }
  }, [lastMessage, messageTypes]);

  return data;
}

// Custom hook for handling WebSocket connection status
export function useSocketStatus() {
  const { isConnected } = useWebSocket();
  return { isConnected };
}

// Custom hook for sending WebSocket messages
export function useSendSocketMessage() {
  const { sendMessage } = useWebSocket();
  
  const send = (type: string, payload: any) => {
    return sendMessage({ type, payload });
  };
  
  return send;
}
