import { useState, useEffect, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';

interface ChallengeTimerProps {
  duration: number; // in seconds
  onTimeout: () => void;
  isActive: boolean;
  resetKey?: string; // Change this to reset the timer
}

export const ChallengeTimer = ({ 
  duration, 
  onTimeout, 
  isActive,
  resetKey 
}: ChallengeTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [hasTriggered, setHasTriggered] = useState(false);

  // Reset timer when resetKey changes or when becoming active
  useEffect(() => {
    setTimeLeft(duration);
    setHasTriggered(false);
  }, [resetKey, duration, isActive]);

  useEffect(() => {
    if (!isActive || hasTriggered) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 0.1;
        if (newTime <= 0) {
          setHasTriggered(true);
          clearInterval(interval);
          return 0;
        }
        return newTime;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, hasTriggered]);

  // Trigger callback when time runs out
  useEffect(() => {
    if (hasTriggered && timeLeft <= 0) {
      onTimeout();
    }
  }, [hasTriggered, timeLeft, onTimeout]);

  if (!isActive) return null;

  const progress = (timeLeft / duration) * 100;
  const isUrgent = timeLeft < 5;

  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Time to respond</span>
        <span className={isUrgent ? 'text-destructive font-semibold animate-pulse' : ''}>
          {Math.ceil(timeLeft)}s
        </span>
      </div>
      <Progress 
        value={progress} 
        className={`h-2 transition-all ${isUrgent ? '[&>div]:bg-destructive' : '[&>div]:bg-primary'}`}
      />
    </div>
  );
};
