import { useState, useEffect, useCallback, useRef } from 'react';

// WebSocket message types
export const WebSocketMessageTypes = {
  TOKEN_CREATED: 'token.created',
  TOKEN_CALLED: 'token.called',
  TOKEN_SERVED: 'token.served',
  TOKEN_NO_SHOW: 'token.no_show',
  QUEUE_UPDATE: 'queue.update',
  DEPARTMENT_UPDATE: 'department.update',
  DOCTOR_UPDATE: 'doctor.update',
  CURRENT_TOKEN_UPDATE: 'current.token.update',
};

// WebSocket message interface
export interface WebSocketMessage {
  type: string;
  payload: any;
}

// Create WebSocket URL based on current protocol
export function getWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  // Vite's websocket is on root path, so we need to use a different path
  // The server is configured to handle WebSocket connections at /ws
  const wsUrl = `${protocol}//${host}/ws`;
  console.log(`Creating WebSocket URL: ${wsUrl} on host: ${host}`);
  return wsUrl;
}

// Create a function to initialize a WebSocket connection
export function createWebSocket(): WebSocket {
  const wsUrl = getWebSocketUrl();
  console.log('Creating WebSocket connection to:', wsUrl);
  
  try {
    return new WebSocket(wsUrl);
  } catch (error) {
    console.error('Failed to create WebSocket:', error);
    throw error;
  }
}

// Custom hook for using WebSocket
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const socket = createWebSocket();
    socketRef.current = socket;

    // Setup event listeners
    socket.addEventListener('open', () => {
      setIsConnected(true);
    });

    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        setLastMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });

    socket.addEventListener('close', () => {
      setIsConnected(false);
    });

    socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    });

    // Cleanup on unmount
    return () => {
      socket.close();
    };
  }, []);

  // Function to send messages
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  return { isConnected, lastMessage, sendMessage };
}
