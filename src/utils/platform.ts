/**
 * Platform and runtime environment detection utilities.
 */

export const isDesktopEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;

  // 1. Secure preload bridge (contextBridge, preferred).
  const bridged = (window as any).openpost;
  if (bridged && bridged.isDesktop === true) {
    return true;
  }

  // 2. Legacy preload flags (read-only booleans, kept for back-compat).
  if ((window as any).isElectron === true || (window as any).isDesktop === true) {
    return true;
  }

  // 3. User agent check
  if (typeof window.navigator !== 'undefined') {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes('electron')) {
      return true;
    }
  }

  // NOTE: URL query params (?isDesktop=true) and localStorage overrides are
  // deliberately NOT trusted here — anyone can set them, so they must never
  // gate security-sensitive behavior. They only ever enabled UI conveniences.

  return false;
};
