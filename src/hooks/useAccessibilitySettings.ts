import { useEffect } from 'react';

export type FontSize = 'small' | 'medium' | 'large' | 'x-large';

const FONT_SCALE: Record<FontSize, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
  'x-large': '20px',
};

/**
 * Applies font size and reduced motion preferences to the document root.
 */
export const useAccessibilitySettings = (
  fontSize: FontSize | null,
  reducedMotion: boolean | null
) => {
  // Font size
  useEffect(() => {
    const root = document.documentElement;
    const size = fontSize && FONT_SCALE[fontSize] ? FONT_SCALE[fontSize] : FONT_SCALE.medium;
    root.style.setProperty('--base-font-size', size);
    root.style.fontSize = size;

    return () => {
      root.style.removeProperty('--base-font-size');
      root.style.fontSize = '';
    };
  }, [fontSize]);

  // Reduced motion
  useEffect(() => {
    const root = document.documentElement;
    if (reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
    return () => root.classList.remove('reduce-motion');
  }, [reducedMotion]);
};
