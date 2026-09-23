/**
 * Platform and runtime environment detection utilities.
 */

export const isDesktopEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;

  // 1. Electron window flag set by preload script
  if ((window as any).isElectron || (window as any).isDesktop) {
    return true;
  }

  // 2. Electron process object
  if (typeof (window as any).process !== 'undefined' && (window as any).process?.versions?.electron) {
    return true;
  }

  // 3. User agent check
  if (typeof window.navigator !== 'undefined') {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes('electron')) {
      return true;
    }
  }

  // 4. URL query parameter flag (e.g. ?isDesktop=true or ?desktop=true)
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('isDesktop') === 'true' || params.get('desktop') === 'true') {
      return true;
    }
  } catch {
    // Ignore in non-browser environments
  }

  // 5. Explicit local storage override for development testing
  try {
    if (localStorage.getItem('openpost_desktop_mode') === 'true') {
      return true;
    }
  } catch {
    // Ignore local storage errors
  }

  return false;
};
