import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type GameType = 'poker' | 'blackjack' | 'rummy' | 'coup';
export type GameResult = 'win' | 'loss' | 'draw';

export interface GameHistoryEntry {
  id: string;
  player_id: string;
  player_name: string;
  game_type: string;
  result: string;
  room_code: string | null;
  coins_won: number;
  played_at: string;
}

export interface LeaderboardEntry {
  player_name: string;
  player_id: string;
  total_wins: number;
  total_games: number;
  total_coins: number;
  win_rate: number;
}

export const useGameHistory = () => {
  const recordGame = useCallback(async (
    playerId: string,
    playerName: string,
    gameType: GameType,
    result: GameResult,
    roomCode?: string,
    coinsWon?: number,
  ) => {
    try {
      const { error } = await supabase
        .from('game_history')
        .insert({
          player_id: playerId,
          player_name: playerName,
          game_type: gameType,
          result,
          room_code: roomCode || null,
          coins_won: coinsWon || 0,
        });

      if (error) {
        console.error('Failed to record game:', error);
      }
    } catch (err) {
      console.error('Error recording game history:', err);
    }
  }, []);

  const fetchLeaderboard = useCallback(async (gameType?: GameType): Promise<LeaderboardEntry[]> => {
    try {
      let query = supabase.from('game_history').select('*');
      if (gameType) {
        query = query.eq('game_type', gameType);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate by player
      const playerMap = new Map<string, {
        player_name: string;
        player_id: string;
        wins: number;
        games: number;
        coins: number;
      }>();

      (data || []).forEach((entry: any) => {
        const existing = playerMap.get(entry.player_id) || {
          player_name: entry.player_name,
          player_id: entry.player_id,
          wins: 0,
          games: 0,
          coins: 0,
        };
        existing.games++;
        if (entry.result === 'win') existing.wins++;
        existing.coins += entry.coins_won || 0;
        // Use the most recent name
        existing.player_name = entry.player_name;
        playerMap.set(entry.player_id, existing);
      });

      return Array.from(playerMap.values())
        .map(p => ({
          player_name: p.player_name,
          player_id: p.player_id,
          total_wins: p.wins,
          total_games: p.games,
          total_coins: p.coins,
          win_rate: p.games > 0 ? Math.round((p.wins / p.games) * 100) : 0,
        }))
        .sort((a, b) => b.total_wins - a.total_wins || b.total_coins - a.total_coins);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      return [];
    }
  }, []);

  const fetchPlayerStats = useCallback(async (playerId: string) => {
    try {
      const { data, error } = await supabase
        .from('game_history')
        .select('*')
        .eq('player_id', playerId)
        .order('played_at', { ascending: false });

      if (error) throw error;

      const games = data || [];
      const wins = games.filter((g: any) => g.result === 'win').length;
      const totalCoins = games.reduce((sum: number, g: any) => sum + (g.coins_won || 0), 0);

      return {
        totalGames: games.length,
        wins,
        losses: games.filter((g: any) => g.result === 'loss').length,
        draws: games.filter((g: any) => g.result === 'draw').length,
        winRate: games.length > 0 ? Math.round((wins / games.length) * 100) : 0,
        totalCoins,
        recentGames: games.slice(0, 10) as GameHistoryEntry[],
      };
    } catch (err) {
      console.error('Error fetching player stats:', err);
      return null;
    }
  }, []);

  return { recordGame, fetchLeaderboard, fetchPlayerStats };
};
