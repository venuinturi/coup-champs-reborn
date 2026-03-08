
-- Game history table to track individual game results
CREATE TABLE public.game_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id text NOT NULL,
  player_name text NOT NULL,
  game_type text NOT NULL, -- 'poker', 'blackjack', 'rummy', 'coup'
  result text NOT NULL, -- 'win', 'loss', 'draw'
  room_code text,
  coins_won integer DEFAULT 0,
  played_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;

-- Anyone can read leaderboard data
CREATE POLICY "Anyone can read game history"
  ON public.game_history FOR SELECT
  USING (true);

-- Players can only insert their own records
CREATE POLICY "Players can insert own game history"
  ON public.game_history FOR INSERT
  WITH CHECK (player_id = (auth.uid())::text);

-- Enable realtime for leaderboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_history;
