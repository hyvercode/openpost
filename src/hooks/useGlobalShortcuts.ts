import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export function useGlobalShortcuts() {
  const {
    isQuickSearchOpen,
    setIsQuickSearchOpen,
    isQuickEnvModalOpen,
    setIsQuickEnvModalOpen,
    isKeyboardShortcutsModalOpen,
    setIsKeyboardShortcutsModalOpen,
    isHelpModalOpen,
    setIsHelpModalOpen,
    isAgentModalOpen,
    setIsAgentModalOpen,
    setActiveView
  } = useStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // 1. Close Modals on ESC
      if (e.key === 'Escape') {
        let closedAny = false;
        if (isQuickSearchOpen) { setIsQuickSearchOpen(false); closedAny = true; }
        if (isQuickEnvModalOpen) { setIsQuickEnvModalOpen(false); closedAny = true; }
        if (isKeyboardShortcutsModalOpen) { setIsKeyboardShortcutsModalOpen(false); closedAny = true; }
        if (isHelpModalOpen) { setIsHelpModalOpen(false); closedAny = true; }
        if (isAgentModalOpen) { setIsAgentModalOpen(false); closedAny = true; }
        if (closedAny) return;
      }

      // 2. Ctrl + / or Cmd + / -> Toggle Keyboard Shortcuts Cheatsheet
      if (isCmdOrCtrl && e.key === '/') {
        e.preventDefault();
        setIsKeyboardShortcutsModalOpen(!isKeyboardShortcutsModalOpen);
        return;
      }

      // 3. Ctrl + K or Cmd + K -> Toggle Quick Search
      if (isCmdOrCtrl && key === 'k') {
        e.preventDefault();
        setIsQuickSearchOpen(!isQuickSearchOpen);
        return;
      }

      // 4. Ctrl + E or Cmd + E -> Toggle Quick Environment Manager (unless Shift+E)
      if (isCmdOrCtrl && key === 'e' && !e.shiftKey) {
        e.preventDefault();
        setIsQuickEnvModalOpen(!isQuickEnvModalOpen);
        return;
      }

      // 5. Ctrl + S or Cmd + S -> Save Request
      if (isCmdOrCtrl && key === 's') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('app:save-request'));
        return;
      }

      // 6. Ctrl + N -> Create New Standalone Request
      if (isCmdOrCtrl && key === 'n') {
        e.preventDefault();
        useStore.getState().createStandaloneRequest();
        return;
      }

      // 6. Ctrl + Enter or Cmd + Enter -> Send Request
      if (isCmdOrCtrl && e.key === 'Enter') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('app:send-request'));
        return;
      }

      // 7. F1 -> Help Guide
      if (e.key === 'F1') {
        e.preventDefault();
        setIsHelpModalOpen(!isHelpModalOpen);
        return;
      }

      // 8. Alt + 1..5 -> Switch Views
      if (e.altKey && !isCmdOrCtrl) {
        if (e.key === '1') { e.preventDefault(); setActiveView('request'); }
        if (e.key === '2') { e.preventDefault(); setActiveView('environment'); }
        if (e.key === '3') { e.preventDefault(); setActiveView('test_suite'); }
        if (e.key === '4') { e.preventDefault(); setActiveView('deployments'); }
        if (e.key === '5') { e.preventDefault(); setActiveView('settings'); }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isQuickSearchOpen,
    setIsQuickSearchOpen,
    isQuickEnvModalOpen,
    setIsQuickEnvModalOpen,
    isKeyboardShortcutsModalOpen,
    setIsKeyboardShortcutsModalOpen,
    isHelpModalOpen,
    setIsHelpModalOpen,
    isAgentModalOpen,
    setIsAgentModalOpen,
    setActiveView
  ]);
}
