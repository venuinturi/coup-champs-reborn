import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageSquare, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sounds';
import PlayerAvatar from '@/components/PlayerAvatar';
import { usePlayersProfiles } from '@/hooks/usePlayerProfile';

interface ChatMessage {
  id: string;
  player_id: string;
  player_name: string;
  message: string;
  created_at: string;
}

interface GameChatProps {
  roomId: string;
  playerId: string;
  playerName: string;
}

const QUICK_EMOJIS = ['👍', '👎', '😂', '🔥', '💀', '🎉', '😎', '🤔'];

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: '😊', emojis: ['😀', '😂', '🤣', '😎', '🤩', '😤', '🤯', '😱', '🥳', '😈', '🤔', '😏', '🫡', '😴', '🤑', '🥲'] },
  { label: '👍', emojis: ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '💪', '🫶', '👊', '🖐️', '🤙', '🫰', '☝️', '🤘', '🤟'] },
  { label: '🎮', emojis: ['🎮', '🃏', '🎯', '🎲', '♠️', '♥️', '♦️', '♣️', '🏆', '🥇', '🥈', '🥉', '🎰', '💰', '💎', '👑'] },
  { label: '❤️', emojis: ['❤️', '🔥', '⚡', '💀', '💣', '🎉', '✨', '🌟', '💯', '🚀', '⭐', '🎊', '💥', '🫠', '🪄', '🎪'] },
];

// Floating emoji reaction animation
const FloatingReaction = ({ emoji, onDone }: { emoji: string; onDone: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 2000);
    return () => clearTimeout(timer);
  }, [onDone]);

  const left = 10 + Math.random() * 60;

  return (
    <div
      className="absolute pointer-events-none animate-float-up text-3xl z-50"
      style={{ left: `${left}%`, bottom: '80px' }}
    >
      {emoji}
    </div>
  );
};

export const GameChat = ({ roomId, playerId, playerName }: GameChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(0);
  const [floatingReactions, setFloatingReactions] = useState<{ id: number; emoji: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reactionIdRef = useRef(0);

  // Collect unique player IDs for avatar lookup
  const playerIds = [...new Set(messages.map(m => m.player_id))];
  const profiles = usePlayersProfiles(playerIds);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('room_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data) {
      setMessages(data as ChatMessage[]);
    }
  }, [roomId]);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`chat_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => [...prev, newMsg]);

          // Show floating reaction for emoji-only messages
          if (isEmojiOnly(newMsg.message)) {
            addFloatingReaction(newMsg.message);
          }

          if (!isOpen && newMsg.player_id !== playerId) {
            setUnreadCount((prev) => prev + 1);
            sounds.notification();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, playerId, isOpen, fetchMessages]);

  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  const isEmojiOnly = (text: string) => {
    const emojiRegex = /^[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}\s]+$/u;
    return emojiRegex.test(text.trim()) && text.trim().length <= 8;
  };

  const addFloatingReaction = (emoji: string) => {
    const id = reactionIdRef.current++;
    setFloatingReactions((prev) => [...prev, { id, emoji }]);
  };

  const removeFloatingReaction = (id: number) => {
    setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
  };

  const sendMessage = async (text?: string) => {
    const msg = (text || newMessage).trim();
    if (!msg) return;

    const { error } = await supabase.from('room_messages').insert({
      room_id: roomId,
      player_id: playerId,
      player_name: playerName,
      message: msg,
    });

    if (!error) {
      if (!text) setNewMessage('');
      sounds.buttonClick();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendQuickReaction = (emoji: string) => {
    sendMessage(emoji);
    setShowEmojiPicker(false);
  };

  const insertEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Floating reactions */}
      {floatingReactions.map((r) => (
        <FloatingReaction key={r.id} emoji={r.emoji} onDone={() => removeFloatingReaction(r.id)} />
      ))}

      {/* Chat Toggle Button */}
      <Button
        onClick={() => { setIsOpen(!isOpen); setShowEmojiPicker(false); }}
        variant={isOpen ? "secondary" : "default"}
        size="icon"
        className="h-12 w-12 rounded-full shadow-lg relative"
      >
        <MessageSquare className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center animate-bounce-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Quick Reaction Bar (always visible when chat closed) */}
      {!isOpen && (
        <div className="absolute bottom-16 right-0 flex gap-1">
          {QUICK_EMOJIS.slice(0, 4).map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendQuickReaction(emoji)}
              className="w-9 h-9 rounded-full bg-card/90 backdrop-blur-sm border border-border/50 flex items-center justify-center text-lg hover:scale-125 transition-transform shadow-md"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-display text-sm text-foreground">Game Chat</h3>
            <span className="text-xs text-muted-foreground">{messages.length} messages</span>
          </div>

          {/* Messages */}
          <ScrollArea className="h-64 p-3" ref={scrollRef}>
            <div className="space-y-2">
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No messages yet. Say hello! 👋
                </p>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.player_id === playerId;
                  const profile = profiles.get(msg.player_id);
                  const emojiOnly = isEmojiOnly(msg.message);

                  if (emojiOnly) {
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex items-center gap-2",
                          isMine ? "justify-end" : "justify-start"
                        )}
                      >
                        {!isMine && (
                          <PlayerAvatar
                            preset={profile?.avatar_preset}
                            customUrl={profile?.avatar_url}
                            size="sm"
                          />
                        )}
                        <div className="text-4xl animate-bounce-in py-1">
                          {msg.message}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-2 animate-fade-in",
                        isMine ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      {!isMine && (
                        <PlayerAvatar
                          preset={profile?.avatar_preset}
                          customUrl={profile?.avatar_url}
                          size="sm"
                          className="mt-1 shrink-0"
                        />
                      )}
                      <div
                        className={cn(
                          "rounded-2xl px-3 py-2 max-w-[75%]",
                          isMine
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-muted rounded-tl-sm"
                        )}
                      >
                        {!isMine && (
                          <p className="text-xs font-medium text-primary mb-0.5">
                            {msg.player_name}
                          </p>
                        )}
                        <p className="text-sm break-words leading-relaxed">{msg.message}</p>
                        <p className="text-[10px] opacity-60 mt-0.5 text-right">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Quick Emoji Bar */}
          <div className="px-3 py-1.5 border-t border-border/50 flex gap-1 overflow-x-auto scrollbar-hide">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendQuickReaction(emoji)}
                className="shrink-0 w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-lg hover:scale-110 transition-all"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="border-t border-border bg-card animate-slide-up">
              {/* Category tabs */}
              <div className="flex border-b border-border/50 px-2">
                {EMOJI_CATEGORIES.map((cat, i) => (
                  <button
                    key={i}
                    onClick={() => setEmojiCategory(i)}
                    className={cn(
                      "flex-1 py-1.5 text-center text-lg transition-colors",
                      emojiCategory === i
                        ? "border-b-2 border-primary"
                        : "opacity-50 hover:opacity-80"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              {/* Emoji grid */}
              <div className="grid grid-cols-8 gap-0.5 p-2 max-h-32 overflow-y-auto">
                {EMOJI_CATEGORIES[emojiCategory].emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    className="w-8 h-8 flex items-center justify-center text-lg rounded hover:bg-muted transition-colors hover:scale-110"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-border flex gap-2">
            <Button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              size="icon"
              variant="ghost"
              className={cn("shrink-0", showEmojiPicker && "text-primary")}
            >
              <Smile className="h-4 w-4" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button onClick={() => sendMessage()} size="icon" disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
