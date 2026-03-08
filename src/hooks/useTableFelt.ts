import { useMemo } from 'react';
import { getTableFelt, getFeltStyle, getFeltPatternStyle, type TableFelt } from '@/lib/tableFelts';

/**
 * Returns felt styles for a given felt ID (from player profile).
 * Falls back to 'classic-green' if not found.
 */
export const useTableFelt = (feltId: string | undefined) => {
  const felt = useMemo(() => getTableFelt(feltId ?? 'classic-green'), [feltId]);
  const feltStyle = useMemo(() => getFeltStyle(felt.id), [felt.id]);
  const patternStyle = useMemo(() => getFeltPatternStyle(felt.id), [felt.id]);

  return { felt, feltStyle, patternStyle };
};
