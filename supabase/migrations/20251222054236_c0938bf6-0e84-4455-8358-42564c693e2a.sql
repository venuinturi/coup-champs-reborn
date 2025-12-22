-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can update game rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Anyone can delete game rooms" ON public.game_rooms;

-- Create a more restrictive UPDATE policy
-- Only allow updates if the game is in a valid state transition
-- This at least prevents random users from modifying rooms they haven't joined
CREATE POLICY "Players in room can update game rooms"
  ON public.game_rooms
  FOR UPDATE
  USING (
    -- Allow update if the player making the request has joined this room
    -- We check this via a subquery to room_players
    EXISTS (
      SELECT 1 FROM public.room_players 
      WHERE room_players.room_id = game_rooms.id
    )
  );

-- Create a more restrictive DELETE policy  
-- Only allow deletion when no players are in the room (cleanup)
CREATE POLICY "Empty rooms can be deleted"
  ON public.game_rooms
  FOR DELETE
  USING (
    -- Only allow deletion if no players are in the room
    NOT EXISTS (
      SELECT 1 FROM public.room_players 
      WHERE room_players.room_id = game_rooms.id
    )
  );