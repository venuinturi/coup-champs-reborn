
-- Player profiles table for avatar and display preferences
CREATE TABLE public.player_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id text UNIQUE NOT NULL,
  player_name text NOT NULL DEFAULT 'Player',
  avatar_url text,
  avatar_preset text DEFAULT 'default',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view profiles (needed for showing avatars in games)
CREATE POLICY "Anyone can view player profiles"
  ON public.player_profiles FOR SELECT
  USING (true);

-- Players can insert their own profile
CREATE POLICY "Players can insert own profile"
  ON public.player_profiles FOR INSERT
  WITH CHECK (player_id = (auth.uid())::text);

-- Players can update their own profile
CREATE POLICY "Players can update own profile"
  ON public.player_profiles FOR UPDATE
  USING (player_id = (auth.uid())::text)
  WITH CHECK (player_id = (auth.uid())::text);

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies for avatars bucket
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
