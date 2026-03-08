export interface ChipStyle {
  id: string;
  name: string;
  /** Outer ring gradient */
  outerGradient: string;
  /** Inner circle gradient */
  innerGradient: string;
  /** Edge stripe color */
  stripeColor: string;
  /** Text/value color */
  textColor: string;
  /** Preview swatch hex */
  swatch: string;
  /** Emoji symbol on chip face */
  symbol: string;
}

export const CHIP_STYLES: ChipStyle[] = [
  {
    id: 'classic',
    name: 'Classic',
    outerGradient: 'linear-gradient(135deg, hsl(0 70% 45%) 0%, hsl(0 65% 30%) 100%)',
    innerGradient: 'linear-gradient(135deg, hsl(0 60% 50%) 0%, hsl(0 55% 35%) 100%)',
    stripeColor: 'rgba(255,255,255,0.35)',
    textColor: '#ffffff',
    swatch: '#b91c1c',
    symbol: '$',
  },
  {
    id: 'royal-blue',
    name: 'Royal Blue',
    outerGradient: 'linear-gradient(135deg, hsl(220 70% 45%) 0%, hsl(225 65% 28%) 100%)',
    innerGradient: 'linear-gradient(135deg, hsl(220 65% 50%) 0%, hsl(225 60% 35%) 100%)',
    stripeColor: 'rgba(255,255,255,0.3)',
    textColor: '#ffffff',
    swatch: '#1e40af',
    symbol: '♠',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    outerGradient: 'linear-gradient(135deg, hsl(152 60% 35%) 0%, hsl(160 55% 20%) 100%)',
    innerGradient: 'linear-gradient(135deg, hsl(152 55% 40%) 0%, hsl(160 50% 28%) 100%)',
    stripeColor: 'rgba(255,255,255,0.3)',
    textColor: '#ffffff',
    swatch: '#065f46',
    symbol: '♣',
  },
  {
    id: 'gold',
    name: 'Gold',
    outerGradient: 'linear-gradient(135deg, hsl(42 80% 48%) 0%, hsl(35 75% 32%) 100%)',
    innerGradient: 'linear-gradient(135deg, hsl(42 75% 55%) 0%, hsl(35 70% 38%) 100%)',
    stripeColor: 'rgba(255,255,255,0.25)',
    textColor: '#1a1a1a',
    swatch: '#b45309',
    symbol: '★',
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    outerGradient: 'linear-gradient(135deg, hsl(0 0% 22%) 0%, hsl(0 0% 8%) 100%)',
    innerGradient: 'linear-gradient(135deg, hsl(0 0% 28%) 0%, hsl(0 0% 14%) 100%)',
    stripeColor: 'rgba(255,255,255,0.15)',
    textColor: '#d4d4d4',
    swatch: '#1c1917',
    symbol: '♦',
  },
  {
    id: 'violet',
    name: 'Violet',
    outerGradient: 'linear-gradient(135deg, hsl(270 55% 45%) 0%, hsl(275 50% 28%) 100%)',
    innerGradient: 'linear-gradient(135deg, hsl(270 50% 52%) 0%, hsl(275 48% 35%) 100%)',
    stripeColor: 'rgba(255,255,255,0.3)',
    textColor: '#ffffff',
    swatch: '#6d28d9',
    symbol: '♠',
  },
  {
    id: 'casino-red',
    name: 'Casino Red',
    outerGradient: 'linear-gradient(135deg, hsl(350 80% 48%) 0%, hsl(340 70% 30%) 100%)',
    innerGradient: 'linear-gradient(135deg, hsl(350 75% 55%) 0%, hsl(340 65% 38%) 100%)',
    stripeColor: 'rgba(255,215,0,0.35)',
    textColor: '#ffd700',
    swatch: '#be123c',
    symbol: '$',
  },
  {
    id: 'ivory',
    name: 'Ivory',
    outerGradient: 'linear-gradient(135deg, hsl(40 30% 88%) 0%, hsl(35 25% 72%) 100%)',
    innerGradient: 'linear-gradient(135deg, hsl(40 25% 92%) 0%, hsl(35 20% 80%) 100%)',
    stripeColor: 'rgba(0,0,0,0.1)',
    textColor: '#44403c',
    swatch: '#d6d3d1',
    symbol: '♦',
  },
];

export const getChipStyle = (id: string): ChipStyle =>
  CHIP_STYLES.find((cs) => cs.id === id) ?? CHIP_STYLES[0];
