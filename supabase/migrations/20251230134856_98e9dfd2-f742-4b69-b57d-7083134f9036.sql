-- Fix MISSING_RLS: Update room_players policies to restrict UPDATE/DELETE to own records
-- This fixes the vulnerability where any user can modify/delete other players' records

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can update room players" ON public.room_players;
DROP POLICY IF EXISTS "Anyone can leave rooms" ON public.room_players;

-- Create policy for players to update only their own record
CREATE POLICY "Players can update own record"
  ON public.room_players
  FOR UPDATE
  USING (player_id = auth.uid()::text)
  WITH CHECK (player_id = auth.uid()::text);

-- Create policy for players to delete only their own record
CREATE POLICY "Players can delete own record"
  ON public.room_players
  FOR DELETE
  USING (player_id = auth.uid()::text);

-- Update INSERT policy to require auth.uid() match
DROP POLICY IF EXISTS "Anyone can join rooms" ON public.room_players;
CREATE POLICY "Authenticated users can join rooms"
  ON public.room_players
  FOR INSERT
  WITH CHECK (player_id = auth.uid()::text);

-- Update game_rooms policies to use auth.uid()
DROP POLICY IF EXISTS "Anyone can create game rooms" ON public.game_rooms;
CREATE POLICY "Authenticated users can create game rooms"
  ON public.game_rooms
  FOR INSERT
  WITH CHECK (host_id = auth.uid()::text);

-- Update room_messages policies  
DROP POLICY IF EXISTS "Anyone can send messages" ON public.room_messages;
CREATE POLICY "Authenticated users can send messages"
  ON public.room_messages
  FOR INSERT
  WITH CHECK (player_id = auth.uid()::text);

-- Create trigger to prevent host changes via direct UPDATE
CREATE OR REPLACE FUNCTION public.prevent_host_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_host != OLD.is_host THEN
    RAISE EXCEPTION 'Cannot change host status directly';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS prevent_host_change_trigger ON public.room_players;
CREATE TRIGGER prevent_host_change_trigger
  BEFORE UPDATE ON public.room_players
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_host_change();