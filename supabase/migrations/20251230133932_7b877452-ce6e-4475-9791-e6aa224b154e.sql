-- Create room_messages table for in-game chat
CREATE TABLE public.room_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read messages from rooms they can see
CREATE POLICY "Anyone can read room messages"
ON public.room_messages
FOR SELECT
USING (true);

-- Allow anyone to insert messages
CREATE POLICY "Anyone can send messages"
ON public.room_messages
FOR INSERT
WITH CHECK (true);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;

-- Create index for faster queries
CREATE INDEX idx_room_messages_room_id ON public.room_messages(room_id);
CREATE INDEX idx_room_messages_created_at ON public.room_messages(created_at DESC);