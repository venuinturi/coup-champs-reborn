import { GameLog as GameLogType } from "@/lib/gameTypes";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface GameLogProps {
  logs: GameLogType[];
}

export const GameLog = ({ logs }: GameLogProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (type: GameLogType["type"]) => {
    switch (type) {
      case "action":
        return "text-foreground";
      case "challenge":
        return "text-destructive";
      case "block":
        return "text-primary";
      case "reveal":
        return "text-accent";
      case "system":
        return "text-muted-foreground";
      default:
        return "text-foreground";
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 h-48">
      <h3 className="font-display text-sm text-muted-foreground mb-2">Game Log</h3>
      <ScrollArea className="h-36" ref={scrollRef}>
        <div className="space-y-1">
          {logs.map((log, index) => (
            <div
              key={index}
              className={cn("text-sm", getLogColor(log.type))}
            >
              <span className="text-muted-foreground text-xs mr-2">
                {new Date(log.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {log.message}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
