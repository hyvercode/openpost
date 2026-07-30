import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

export function useAgentPing() {
  const { setAgentMode, addToast } = useStore();
  const pingInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const pingAgent = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8765/ping', {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && data.agent === 'DesktopAgentBridge') {
            const currentMode = useStore.getState().agentMode;
            if (currentMode !== 'desktop') {
              setAgentMode('desktop');
              addToast('Desktop Agent detected. Automatically switched to local mode.', 'success', 3000);
            }
          }
        }
      } catch (err) {
        // Automatically switch back to cloud if Desktop agent goes offline
        const currentMode = useStore.getState().agentMode;
        if (currentMode === 'desktop') {
          setAgentMode('cloud');
          addToast('Desktop Agent connection lost. Switched back to Cloud mode.', 'warning', 3000);
        }
      }
    };

    // Initial ping
    pingAgent();

    // Ping every 5 seconds
    pingInterval.current = setInterval(pingAgent, 5000);

    return () => {
      if (pingInterval.current) {
        clearInterval(pingInterval.current);
      }
    };
  }, [setAgentMode, addToast]);
}
