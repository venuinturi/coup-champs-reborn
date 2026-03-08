
-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "Players in room can update game rooms" ON public.game_rooms;

-- Create restrictive policy: only the host can update game rooms
CREATE POLICY "Only host can update game rooms"
  ON public.game_rooms FOR UPDATE
  USING (host_id = (auth.uid())::text)
  WITH CHECK (host_id = (auth.uid())::text);
