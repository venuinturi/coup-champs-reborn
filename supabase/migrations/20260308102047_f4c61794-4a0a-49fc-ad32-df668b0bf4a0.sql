
-- Drop the host-only policy (too restrictive, breaks non-host player actions)
DROP POLICY IF EXISTS "Only host can update game rooms" ON public.game_rooms;

-- Create policy: only players IN THIS SPECIFIC room can update it
CREATE POLICY "Players in own room can update game rooms"
  ON public.game_rooms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.room_players
      WHERE room_players.room_id = game_rooms.id
      AND room_players.player_id = (auth.uid())::text
    )
  );
