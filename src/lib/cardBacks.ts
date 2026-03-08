// Card back design definitions

export interface CardBack {
  id: string;
  name: string;
  /** Primary gradient for the card back */
  background: string;
  /** Inner pattern/decoration CSS */
  pattern?: string;
  /** Hex color for preview swatch */
  swatch: string;
  /** Center icon/symbol */
  symbol: string;
  /** Symbol color */
  symbolColor: string;
}

export const CARD_BACKS: CardBack[] = [
  {
    id: 'classic',
    name: 'Classic',
    swatch: '#1e40af',
    background: 'linear-gradient(135deg, hsl(220 70% 25%) 0%, hsl(220 65% 15%) 100%)',
    pattern:
      'url("data:image/svg+xml,%3Csvg width=\'8\' height=\'8\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0L8 8M8 0L0 8\' stroke=\'%23ffffff10\' stroke-width=\'0.5\'/%3E%3C/svg%3E")',
    symbol: '♠',
    symbolColor: 'rgba(255,255,255,0.5)',
  },
  {
    id: 'crimson',
    name: 'Crimson',
    swatch: '#991b1b',
    background: 'linear-gradient(135deg, hsl(0 60% 28%) 0%, hsl(0 55% 14%) 100%)',
    pattern:
      'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'10\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'5\' cy=\'5\' r=\'1\' fill=\'%23ffffff08\'/%3E%3C/svg%3E")',
    symbol: '♦',
    symbolColor: 'rgba(255,200,200,0.5)',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    swatch: '#065f46',
    background: 'linear-gradient(135deg, hsl(160 65% 20%) 0%, hsl(165 60% 10%) 100%)',
    pattern:
      'url("data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect width=\'1\' height=\'1\' fill=\'%23ffffff08\'/%3E%3C/svg%3E")',
    symbol: '♣',
    symbolColor: 'rgba(200,255,220,0.5)',
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    swatch: '#581c87',
    background: 'linear-gradient(135deg, hsl(270 60% 28%) 0%, hsl(275 55% 12%) 100%)',
    pattern:
      'url("data:image/svg+xml,%3Csvg width=\'12\' height=\'12\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M6 0L12 6L6 12L0 6Z\' fill=\'none\' stroke=\'%23ffffff06\' stroke-width=\'0.5\'/%3E%3C/svg%3E")',
    symbol: '♠',
    symbolColor: 'rgba(220,200,255,0.5)',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    swatch: '#0f172a',
    background: 'linear-gradient(135deg, hsl(220 40% 10%) 0%, hsl(230 30% 4%) 100%)',
    pattern:
      'url("data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect width=\'1\' height=\'1\' fill=\'%23ffffff04\'/%3E%3C/svg%3E")',
    symbol: '★',
    symbolColor: 'rgba(200,200,255,0.4)',
  },
  {
    id: 'gold',
    name: 'Gold',
    swatch: '#92400e',
    background: 'linear-gradient(135deg, hsl(35 70% 30%) 0%, hsl(25 60% 15%) 100%)',
    pattern:
      'url("data:image/svg+xml,%3Csvg width=\'8\' height=\'8\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 4h8M4 0v8\' stroke=\'%23ffffff08\' stroke-width=\'0.5\'/%3E%3C/svg%3E")',
    symbol: '♦',
    symbolColor: 'rgba(255,215,0,0.6)',
  },
];

export const getCardBack = (id: string): CardBack =>
  CARD_BACKS.find((cb) => cb.id === id) ?? CARD_BACKS[0];
