import { useStore } from '../store/useStore';

class SSEManager {
  private sources: Map<string, EventSource> = new Map();

  connect(requestId: string, url: string) {
    if (this.sources.has(requestId)) {
      this.disconnect(requestId);
    }
    
    useStore.getState().setWsStatus(requestId, 'connecting');
    useStore.getState().addWsMessage(requestId, {
      id: Math.random().toString(36).substring(2, 9),
      type: 'info',
      data: `Connecting to SSE ${url}...`,
      timestamp: Date.now()
    });

    try {
      const source = new EventSource(url);
      
      source.onopen = () => {
        useStore.getState().setWsStatus(requestId, 'connected');
        useStore.getState().addWsMessage(requestId, {
          id: Math.random().toString(36).substring(2, 9),
          type: 'info',
          data: `Connected to SSE ${url}`,
          timestamp: Date.now()
        });
      };

      source.onmessage = (event) => {
        useStore.getState().addWsMessage(requestId, {
          id: Math.random().toString(36).substring(2, 9),
          type: 'received',
          data: event.data,
          timestamp: Date.now()
        });
      };

      source.onerror = (error) => {
        // SSE often auto-reconnects, but if it fails to connect initially or loses connection...
        if (source.readyState === EventSource.CLOSED) {
          useStore.getState().setWsStatus(requestId, 'disconnected');
          useStore.getState().addWsMessage(requestId, {
            id: Math.random().toString(36).substring(2, 9),
            type: 'error',
            data: 'SSE Connection Closed',
            timestamp: Date.now()
          });
          this.sources.delete(requestId);
        } else {
          useStore.getState().addWsMessage(requestId, {
            id: Math.random().toString(36).substring(2, 9),
            type: 'error',
            data: 'SSE Error (Reconnecting...)',
            timestamp: Date.now()
          });
        }
      };

      this.sources.set(requestId, source);
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
    const source = this.sources.get(requestId);
    if (source) {
      source.close();
      useStore.getState().setWsStatus(requestId, 'disconnected');
      useStore.getState().addWsMessage(requestId, {
        id: Math.random().toString(36).substring(2, 9),
        type: 'info',
        data: 'Disconnected',
        timestamp: Date.now()
      });
      this.sources.delete(requestId);
    }
  }

  getStatus(requestId: string) {
    const source = this.sources.get(requestId);
    if (!source) return 'disconnected';
    if (source.readyState === EventSource.CONNECTING) return 'connecting';
    if (source.readyState === EventSource.OPEN) return 'connected';
    return 'disconnected';
  }
}

export const sseManager = new SSEManager();
