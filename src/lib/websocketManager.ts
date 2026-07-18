import { useStore } from '../store/useStore';

class WebSocketManager {
  private sockets: Map<string, WebSocket> = new Map();

  connect(requestId: string, url: string) {
    if (this.sockets.has(requestId)) {
      this.disconnect(requestId);
    }
    
    useStore.getState().setWsStatus(requestId, 'connecting');
    useStore.getState().addWsMessage(requestId, {
      id: Math.random().toString(36).substring(2, 9),
      type: 'info',
      data: `Connecting to ${url}...`,
      timestamp: Date.now()
    });

    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        useStore.getState().setWsStatus(requestId, 'connected');
        useStore.getState().addWsMessage(requestId, {
          id: Math.random().toString(36).substring(2, 9),
          type: 'info',
          data: `Connected to ${url}`,
          timestamp: Date.now()
        });
      };

      ws.onmessage = (event) => {
        useStore.getState().addWsMessage(requestId, {
          id: Math.random().toString(36).substring(2, 9),
          type: 'received',
          data: event.data,
          timestamp: Date.now()
        });
      };

      ws.onclose = () => {
        useStore.getState().setWsStatus(requestId, 'disconnected');
        useStore.getState().addWsMessage(requestId, {
          id: Math.random().toString(36).substring(2, 9),
          type: 'info',
          data: 'Disconnected',
          timestamp: Date.now()
        });
        this.sockets.delete(requestId);
      };

      ws.onerror = (error) => {
        useStore.getState().addWsMessage(requestId, {
          id: Math.random().toString(36).substring(2, 9),
          type: 'error',
          data: 'WebSocket Error',
          timestamp: Date.now()
        });
      };

      this.sockets.set(requestId, ws);
    } catch (err: any) {
      useStore.getState().setWsStatus(requestId, 'disconnected');
      useStore.getState().addWsMessage(requestId, {
        id: Math.random().toString(36).substring(2, 9),
        type: 'error',
        data: `Failed to connect: ${err.message}`,
        timestamp: Date.now()
      });
    }
  }

  disconnect(requestId: string) {
    const ws = this.sockets.get(requestId);
    if (ws) {
      ws.close();
      this.sockets.delete(requestId);
    }
  }

  sendMessage(requestId: string, message: string) {
    const ws = this.sockets.get(requestId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
      useStore.getState().addWsMessage(requestId, {
        id: Math.random().toString(36).substring(2, 9),
        type: 'sent',
        data: message,
        timestamp: Date.now()
      });
    } else {
      useStore.getState().addWsMessage(requestId, {
        id: Math.random().toString(36).substring(2, 9),
        type: 'error',
        data: 'Cannot send message: Not connected',
        timestamp: Date.now()
      });
    }
  }

  getStatus(requestId: string) {
    const ws = this.sockets.get(requestId);
    if (!ws) return 'disconnected';
    if (ws.readyState === WebSocket.CONNECTING) return 'connecting';
    if (ws.readyState === WebSocket.OPEN) return 'connected';
    return 'disconnected';
  }
}

export const wsManager = new WebSocketManager();
