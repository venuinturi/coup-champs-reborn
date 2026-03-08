ALTER TABLE public.player_profiles 
ADD COLUMN font_size text NOT NULL DEFAULT 'medium',
ADD COLUMN reduced_motion boolean NOT NULL DEFAULT false;