import { useEffect } from 'react';

/**
 * Hook that applies a custom accent color to the document root
 * Modifies CSS variables for primary, accent, and ring colors
 */
export const useAccentColor = (accentColorHsl: string | null) => {
  useEffect(() => {
    const root = document.documentElement;
    
    if (accentColorHsl) {
      // Apply custom accent color
      root.style.setProperty('--primary', accentColorHsl);
      root.style.setProperty('--accent', accentColorHsl);
      root.style.setProperty('--ring', accentColorHsl);
      root.style.setProperty('--sidebar-primary', accentColorHsl);
      root.style.setProperty('--sidebar-ring', accentColorHsl);
    } else {
      // Reset to default (remove inline styles to use CSS values)
      root.style.removeProperty('--primary');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--sidebar-primary');
      root.style.removeProperty('--sidebar-ring');
    }

    return () => {
      // Cleanup on unmount
      root.style.removeProperty('--primary');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--sidebar-primary');
      root.style.removeProperty('--sidebar-ring');
    };
  }, [accentColorHsl]);
};
