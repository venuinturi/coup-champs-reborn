import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export const GameChat = ({ roomId, playerId, playerName }: GameChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch existing messages
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

  // Subscribe to new messages
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
          
          // Increment unread count if chat is closed and message is from someone else
          if (!isOpen && newMsg.player_id !== playerId) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, playerId, isOpen, fetchMessages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // Clear unread when opening chat
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const { error } = await supabase.from('room_messages').insert({
      room_id: roomId,
      player_id: playerId,
      player_name: playerName,
      message: newMessage.trim(),
    });

    if (!error) {
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant={isOpen ? "secondary" : "default"}
        size="icon"
        className="h-12 w-12 rounded-full shadow-lg relative"
      >
        <MessageSquare className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-muted/50 px-4 py-3 border-b border-border">
            <h3 className="font-display text-sm text-foreground">Game Chat</h3>
          </div>

          {/* Messages */}
          <ScrollArea className="h-64 p-3" ref={scrollRef}>
            <div className="space-y-2">
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No messages yet. Start the conversation!
                </p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "rounded-lg p-2 max-w-[85%]",
                      msg.player_id === playerId
                        ? "bg-primary text-primary-foreground ml-auto"
                        : "bg-muted"
                    )}
                  >
                    {msg.player_id !== playerId && (
                      <p className="text-xs font-medium text-primary mb-1">
                        {msg.player_name}
                      </p>
                    )}
                    <p className="text-sm break-words">{msg.message}</p>
                    <p className="text-[10px] opacity-70 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t border-border flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button onClick={sendMessage} size="icon" disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
