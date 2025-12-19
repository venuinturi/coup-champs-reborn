-- Create game rooms table
CREATE TABLE public.game_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL UNIQUE,
  host_id TEXT NOT NULL,
  host_name TEXT NOT NULL,
  max_players INTEGER NOT NULL DEFAULT 6,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  game_state JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create room players table
CREATE TABLE public.room_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT false,
  is_ready BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, player_id)
);

-- Create indexes
CREATE INDEX idx_game_rooms_room_code ON public.game_rooms(room_code);
CREATE INDEX idx_game_rooms_status ON public.game_rooms(status);
CREATE INDEX idx_room_players_room_id ON public.room_players(room_id);
CREATE INDEX idx_room_players_player_id ON public.room_players(player_id);

-- Enable Row Level Security (public access for now - no auth)
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_rooms (public access - anyone can play)
CREATE POLICY "Anyone can view game rooms"
  ON public.game_rooms
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create game rooms"
  ON public.game_rooms
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update game rooms"
  ON public.game_rooms
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete game rooms"
  ON public.game_rooms
  FOR DELETE
  USING (true);

-- RLS Policies for room_players (public access)
CREATE POLICY "Anyone can view room players"
  ON public.room_players
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can join rooms"
  ON public.room_players
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update room players"
  ON public.room_players
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can leave rooms"
  ON public.room_players
  FOR DELETE
  USING (true);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_game_rooms_updated_at
  BEFORE UPDATE ON public.game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;