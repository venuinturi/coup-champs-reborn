// Table felt texture definitions
// Each felt has a CSS background style that simulates felt/table textures

export interface TableFelt {
  id: string;
  name: string;
  /** CSS background shorthand applied to the game table area */
  background: string;
  /** Hex color for the preview swatch */
  swatch: string;
  /** Optional subtle pattern overlay (CSS) */
  pattern?: string;
}

export const TABLE_FELTS: TableFelt[] = [
  {
    id: 'classic-green',
    name: 'Classic Green',
    swatch: '#1a6b3c',
    background: 'radial-gradient(ellipse at 50% 40%, hsl(150 55% 28%) 0%, hsl(150 50% 16%) 100%)',
    pattern: 'url("data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect width=\'1\' height=\'1\' fill=\'%23ffffff08\'/%3E%3C/svg%3E")',
  },
  {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    swatch: '#1a2744',
    background: 'radial-gradient(ellipse at 50% 40%, hsl(217 55% 22%) 0%, hsl(220 60% 10%) 100%)',
    pattern: 'url("data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect width=\'1\' height=\'1\' fill=\'%23ffffff06\'/%3E%3C/svg%3E")',
  },
  {
    id: 'royal-red',
    name: 'Royal Red',
    swatch: '#6b1a2a',
    background: 'radial-gradient(ellipse at 50% 40%, hsl(345 55% 28%) 0%, hsl(345 50% 14%) 100%)',
    pattern: 'url("data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect width=\'1\' height=\'1\' fill=\'%23ffffff08\'/%3E%3C/svg%3E")',
  },
  {
    id: 'velvet-purple',
    name: 'Velvet Purple',
    swatch: '#3b1a6b',
    background: 'radial-gradient(ellipse at 50% 40%, hsl(270 55% 26%) 0%, hsl(270 50% 12%) 100%)',
    pattern: 'url("data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect width=\'1\' height=\'1\' fill=\'%23ffffff06\'/%3E%3C/svg%3E")',
  },
  {
    id: 'dark-slate',
    name: 'Dark Slate',
    swatch: '#1e2a2e',
    background: 'radial-gradient(ellipse at 50% 40%, hsl(195 20% 18%) 0%, hsl(200 15% 8%) 100%)',
    pattern: 'url("data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect width=\'1\' height=\'1\' fill=\'%23ffffff05\'/%3E%3C/svg%3E")',
  },
  {
    id: 'mahogany',
    name: 'Mahogany',
    swatch: '#4a2010',
    background: 'radial-gradient(ellipse at 50% 40%, hsl(20 60% 22%) 0%, hsl(15 50% 10%) 100%)',
    pattern: 'url("data:image/svg+xml,%3Csvg width=\'4\' height=\'4\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0L4 4M4 0L0 4\' stroke=\'%23ffffff04\' stroke-width=\'0.5\'/%3E%3C/svg%3E")',
  },
  {
    id: 'emerald-night',
    name: 'Emerald Night',
    swatch: '#0a3a2a',
    background: 'radial-gradient(ellipse at 50% 40%, hsl(160 70% 16%) 0%, hsl(165 60% 6%) 100%)',
    pattern: 'url("data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect width=\'1\' height=\'1\' fill=\'%23ffffff06\'/%3E%3C/svg%3E")',
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    swatch: '#0d0d0d',
    background: 'radial-gradient(ellipse at 50% 40%, hsl(0 0% 12%) 0%, hsl(0 0% 4%) 100%)',
    pattern: 'url("data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect width=\'1\' height=\'1\' fill=\'%23ffffff04\'/%3E%3C/svg%3E")',
  },
];

export const getTableFelt = (id: string): TableFelt =>
  TABLE_FELTS.find((f) => f.id === id) ?? TABLE_FELTS[0];

/** Returns CSS style object for applying felt to a container */
export const getFeltStyle = (feltId: string): React.CSSProperties => {
  const felt = getTableFelt(feltId);
  return {
    background: felt.background,
    backgroundSize: 'cover',
  };
};

/** Returns CSS for the pattern overlay */
export const getFeltPatternStyle = (feltId: string): React.CSSProperties => {
  const felt = getTableFelt(feltId);
  if (!felt.pattern) return {};
  return {
    backgroundImage: felt.pattern,
    backgroundRepeat: 'repeat',
  };
};
