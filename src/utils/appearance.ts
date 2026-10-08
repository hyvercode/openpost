export type FontScale = 'small' | 'medium' | 'large';

const FONT_ROOT_PX: Record<FontScale, number> = {
  small: 14,
  medium: 16,
  large: 18,
};

export function readFontScale(): FontScale {
  const stored = localStorage.getItem('fontScale');
  return stored === 'small' || stored === 'large' ? stored : 'medium';
}

export function applyFontScale(scale: FontScale) {
  document.documentElement.style.fontSize = `${FONT_ROOT_PX[scale]}px`;
}

export function readReduceMotion(): boolean {
  return localStorage.getItem('reduceMotion') === '1';
}

export function applyReduceMotion(enabled: boolean) {
  if (enabled) {
    document.documentElement.dataset.motion = 'reduced';
  } else {
    delete document.documentElement.dataset.motion;
  }
}
