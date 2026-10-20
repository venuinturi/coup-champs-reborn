-- Create poker_ledger_rooms table for shareable poker ledger rooms
CREATE TABLE public.poker_ledger_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL UNIQUE,
  room_name TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  session_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_poker_ledger_rooms_room_code ON public.poker_ledger_rooms(room_code);
CREATE INDEX idx_poker_ledger_rooms_creator_id ON public.poker_ledger_rooms(creator_id);
CREATE INDEX idx_poker_ledger_rooms_status ON public.poker_ledger_rooms(status);

-- Enable Row Level Security (public access for now - no auth)
ALTER TABLE public.poker_ledger_rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies (public access - no auth system)
CREATE POLICY "Anyone can view poker ledger rooms"
  ON public.poker_ledger_rooms
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create poker ledger rooms"
  ON public.poker_ledger_rooms
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update poker ledger rooms"
  ON public.poker_ledger_rooms
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete poker ledger rooms"
  ON public.poker_ledger_rooms
  FOR DELETE
  USING (true);

-- Trigger for automatic timestamp updates (reuses existing function)
CREATE TRIGGER update_poker_ledger_rooms_updated_at
  BEFORE UPDATE ON public.poker_ledger_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.poker_ledger_rooms;
