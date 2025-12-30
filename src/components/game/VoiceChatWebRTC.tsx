import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface VoiceChatProps {
  roomId: string;
  playerId: string;
  playerName: string;
}

interface VoiceParticipant {
  id: string;
  name: string;
  isMuted: boolean;
  isSpeaking: boolean;
}

interface PeerConnection {
  connection: RTCPeerConnection;
  audioElement: HTMLAudioElement;
}

export const VoiceChat = ({ roomId, playerId, playerName }: VoiceChatProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());

  // ICE servers configuration (using public STUN servers)
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setAudioLevel(average / 255);
    
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  const createPeerConnection = useCallback(async (targetId: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection(iceServers);
    const audioEl = document.createElement('audio');
    audioEl.autoplay = true;
    (audioEl as any).playsInline = true;
    document.body.appendChild(audioEl);

    // Add local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming stream
    pc.ontrack = (event) => {
      audioEl.srcObject = event.streams[0];
      if (isDeafened) {
        audioEl.muted = true;
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate && channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            from: playerId,
            to: targetId,
            candidate: event.candidate,
          },
        });
      }
    };

    peerConnectionsRef.current.set(targetId, { connection: pc, audioElement: audioEl });

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'offer',
          payload: {
            from: playerId,
            to: targetId,
            sdp: offer,
          },
        });
      }
    }

    return pc;
  }, [playerId, isDeafened]);

  const handleOffer = useCallback(async (from: string, sdp: RTCSessionDescriptionInit) => {
    const pc = await createPeerConnection(from, false);
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'answer',
        payload: {
          from: playerId,
          to: from,
          sdp: answer,
        },
      });
    }
  }, [createPeerConnection, playerId]);

  const handleAnswer = useCallback(async (from: string, sdp: RTCSessionDescriptionInit) => {
    const peer = peerConnectionsRef.current.get(from);
    if (peer) {
      await peer.connection.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  }, []);

  const handleIceCandidate = useCallback(async (from: string, candidate: RTCIceCandidateInit) => {
    const peer = peerConnectionsRef.current.get(from);
    if (peer) {
      await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  const connect = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      localStreamRef.current = stream;
      
      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      // Start audio level monitoring
      updateAudioLevel();

      // Join presence channel for signaling
      const channel = supabase.channel(`voice_${roomId}`, {
        config: {
          presence: {
            key: playerId,
          },
          broadcast: {
            self: false,
          },
        },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const newParticipants: VoiceParticipant[] = [];
          
          Object.entries(state).forEach(([key, presences]) => {
            const presence = presences[0] as any;
            if (presence) {
              newParticipants.push({
                id: key,
                name: presence.name,
                isMuted: presence.isMuted,
                isSpeaking: presence.isSpeaking,
              });
            }
          });
          
          setParticipants(newParticipants);
        })
        .on('presence', { event: 'join' }, async ({ key, newPresences }) => {
          if (key !== playerId) {
            toast({
              title: 'Player joined voice',
              description: `${(newPresences[0] as any)?.name || 'Someone'} joined voice chat`,
            });
            // Initiate connection with new peer
            await createPeerConnection(key, true);
          }
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          // Clean up peer connection
          const peer = peerConnectionsRef.current.get(key);
          if (peer) {
            peer.connection.close();
            peer.audioElement.remove();
            peerConnectionsRef.current.delete(key);
          }
          
          toast({
            title: 'Player left voice',
            description: `${(leftPresences[0] as any)?.name || 'Someone'} left voice chat`,
          });
        })
        .on('broadcast', { event: 'offer' }, async ({ payload }) => {
          if (payload.to === playerId) {
            await handleOffer(payload.from, payload.sdp);
          }
        })
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          if (payload.to === playerId) {
            await handleAnswer(payload.from, payload.sdp);
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.to === playerId) {
            await handleIceCandidate(payload.from, payload.candidate);
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              name: playerName,
              isMuted: false,
              isSpeaking: false,
            });
          }
        });

      channelRef.current = channel;
      setIsConnected(true);
      
      toast({
        title: 'Voice Connected',
        description: 'You are now in the voice channel',
      });
    } catch (error) {
      console.error('Failed to connect to voice:', error);
      toast({
        title: 'Voice Error',
        description: 'Could not access microphone. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const disconnect = () => {
    // Stop audio level monitoring
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Close all peer connections
    peerConnectionsRef.current.forEach(({ connection, audioElement }) => {
      connection.close();
      audioElement.remove();
    });
    peerConnectionsRef.current.clear();
    
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Leave presence channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    setIsConnected(false);
    setParticipants([]);
    setAudioLevel(0);
  };

  const toggleMute = async () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
        
        // Update presence
        if (channelRef.current) {
          await channelRef.current.track({
            name: playerName,
            isMuted: !isMuted,
            isSpeaking: false,
          });
        }
      }
    }
  };

  const toggleDeafen = () => {
    const newDeafened = !isDeafened;
    setIsDeafened(newDeafened);
    
    // Mute/unmute all remote audio
    peerConnectionsRef.current.forEach(({ audioElement }) => {
      audioElement.muted = newDeafened;
    });
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-muted/50 px-3 py-2 border-b border-border flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500" : "bg-muted-foreground"
          )} />
          <span className="text-xs font-medium text-foreground">
            Voice Chat {participants.length > 0 && `(${participants.length})`}
          </span>
        </div>

        {/* Participants */}
        {isConnected && participants.length > 0 && (
          <div className="px-3 py-2 space-y-1 max-h-32 overflow-y-auto">
            {participants.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "flex items-center gap-2 text-xs rounded px-2 py-1",
                  p.id === playerId ? "bg-primary/10" : "bg-muted/30"
                )}
              >
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  p.isMuted ? "bg-muted-foreground" : "bg-green-500"
                )} />
                <span className="truncate flex-1">{p.name}</span>
                {p.isMuted && <MicOff className="w-3 h-3 text-muted-foreground" />}
              </div>
            ))}
          </div>
        )}

        {/* Audio level indicator */}
        {isConnected && !isMuted && (
          <div className="px-3 py-1">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-75"
                style={{ width: `${audioLevel * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="px-3 py-2 flex gap-2">
          {!isConnected ? (
            <Button
              onClick={connect}
              size="sm"
              variant="default"
              className="flex-1"
            >
              <Phone className="w-4 h-4 mr-1" />
              Join Voice
            </Button>
          ) : (
            <>
              <Button
                onClick={toggleMute}
                size="icon"
                variant={isMuted ? "destructive" : "secondary"}
                className="h-8 w-8"
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              
              <Button
                onClick={toggleDeafen}
                size="icon"
                variant={isDeafened ? "destructive" : "secondary"}
                className="h-8 w-8"
              >
                {isDeafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              
              <Button
                onClick={disconnect}
                size="icon"
                variant="destructive"
                className="h-8 w-8"
              >
                <PhoneOff className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
