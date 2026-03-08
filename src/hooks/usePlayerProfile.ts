import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlayerProfile {
  player_id: string;
  player_name: string;
  avatar_url: string | null;
  avatar_preset: string;
}

// Preset avatar configurations - emoji-based for simplicity
export const AVATAR_PRESETS: Record<string, { emoji: string; bg: string }> = {
  default: { emoji: '🎮', bg: 'from-slate-500 to-slate-700' },
  crown: { emoji: '👑', bg: 'from-amber-500 to-yellow-600' },
  fire: { emoji: '🔥', bg: 'from-red-500 to-orange-600' },
  star: { emoji: '⭐', bg: 'from-purple-500 to-violet-600' },
  diamond: { emoji: '💎', bg: 'from-cyan-500 to-blue-600' },
  skull: { emoji: '💀', bg: 'from-gray-600 to-gray-900' },
  robot: { emoji: '🤖', bg: 'from-emerald-500 to-teal-600' },
  alien: { emoji: '👽', bg: 'from-green-400 to-emerald-600' },
  ninja: { emoji: '🥷', bg: 'from-indigo-500 to-purple-700' },
  wizard: { emoji: '🧙', bg: 'from-violet-500 to-fuchsia-600' },
  cat: { emoji: '🐱', bg: 'from-orange-400 to-amber-600' },
  wolf: { emoji: '🐺', bg: 'from-blue-600 to-indigo-800' },
  dragon: { emoji: '🐉', bg: 'from-red-600 to-rose-800' },
  shark: { emoji: '🦈', bg: 'from-blue-500 to-cyan-700' },
  eagle: { emoji: '🦅', bg: 'from-amber-600 to-brown-700' },
  lion: { emoji: '🦁', bg: 'from-yellow-500 to-amber-700' },
};

export const usePlayerProfile = (playerId: string | null) => {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch or create profile
  useEffect(() => {
    if (!playerId) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('player_id', playerId)
        .maybeSingle();

      if (data) {
        setProfile(data as PlayerProfile);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [playerId]);

  const ensureProfile = useCallback(async (playerName: string) => {
    if (!playerId) return null;

    // Check if profile exists
    const { data: existing } = await supabase
      .from('player_profiles')
      .select('*')
      .eq('player_id', playerId)
      .maybeSingle();

    if (existing) {
      // Update name if changed
      if (existing.player_name !== playerName) {
        await supabase
          .from('player_profiles')
          .update({ player_name: playerName })
          .eq('player_id', playerId);
      }
      setProfile(existing as PlayerProfile);
      return existing as PlayerProfile;
    }

    // Create new profile
    const { data: newProfile, error } = await supabase
      .from('player_profiles')
      .insert({
        player_id: playerId,
        player_name: playerName,
        avatar_preset: 'default',
      })
      .select()
      .single();

    if (newProfile) {
      setProfile(newProfile as PlayerProfile);
      return newProfile as PlayerProfile;
    }
    return null;
  }, [playerId]);

  const updateAvatar = useCallback(async (preset: string, customUrl?: string) => {
    if (!playerId) return;

    const updates: any = { avatar_preset: preset };
    if (customUrl) updates.avatar_url = customUrl;
    else updates.avatar_url = null;

    const { data, error } = await supabase
      .from('player_profiles')
      .update(updates)
      .eq('player_id', playerId)
      .select()
      .single();

    if (data) {
      setProfile(data as PlayerProfile);
    }
  }, [playerId]);

  const uploadAvatar = useCallback(async (file: File) => {
    if (!playerId) return null;

    const fileExt = file.name.split('.').pop();
    const filePath = `${playerId}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Add cache buster
    const url = `${urlData.publicUrl}?t=${Date.now()}`;
    await updateAvatar('custom', url);
    return url;
  }, [playerId, updateAvatar]);

  return { profile, loading, ensureProfile, updateAvatar, uploadAvatar };
};

// Hook to fetch multiple profiles at once (for rooms/games)
export const usePlayersProfiles = (playerIds: string[]) => {
  const [profiles, setProfiles] = useState<Map<string, PlayerProfile>>(new Map());

  useEffect(() => {
    if (playerIds.length === 0) return;

    const fetchProfiles = async () => {
      const { data } = await supabase
        .from('player_profiles')
        .select('*')
        .in('player_id', playerIds);

      if (data) {
        const map = new Map<string, PlayerProfile>();
        data.forEach((p: any) => map.set(p.player_id, p as PlayerProfile));
        setProfiles(map);
      }
    };

    fetchProfiles();
  }, [playerIds.join(',')]);

  return profiles;
};
