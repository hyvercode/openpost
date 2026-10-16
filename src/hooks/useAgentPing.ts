import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { DESKTOP_AGENT_PING_URL, getAgentToken } from '../lib/api';

export function useAgentPing() {
  const { setAgentMode, setIsAgentModalOpen, addToast } = useStore();
  const pingInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const pingAgent = async () => {
      try {
        const res = await fetch(DESKTOP_AGENT_PING_URL, {
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
              if (!getAgentToken()) {
                // Bridge answers but every /api/proxy call will 403 without
                // the pairing token — say so now instead of failing silently.
                addToast('Desktop Agent detected, but no pairing token is saved. Paste it in the Agent settings to use it.', 'warning', 8000, {
                  title: 'Pairing Required',
                  action: {
                    label: 'Open Agent Settings',
                    onClick: () => setIsAgentModalOpen(true),
                  },
                });
              } else {
                addToast('Desktop Agent detected. Automatically switched to local mode.', 'success', 3000);
              }
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
  }, [setAgentMode, setIsAgentModalOpen, addToast]);
}
