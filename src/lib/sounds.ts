// Web Audio API sound effects engine - no external dependencies needed

let audioContext: AudioContext | null = null;
let soundEnabled = true;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
};

export const toggleSound = () => {
  soundEnabled = !soundEnabled;
  return soundEnabled;
};

export const isSoundEnabled = () => soundEnabled;

// Play a tone with specific frequency, duration, and type
const playTone = (
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.15,
  delay: number = 0
) => {
  if (!soundEnabled) return;
  
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
    
    gainNode.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    
    oscillator.start(ctx.currentTime + delay);
    oscillator.stop(ctx.currentTime + delay + duration);
  } catch (e) {
    // Audio context not available
  }
};

// Play noise burst (for card/chip sounds)
const playNoise = (duration: number, volume: number = 0.08, delay: number = 0) => {
  if (!soundEnabled) return;
  
  try {
    const ctx = getAudioContext();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }
    
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, ctx.currentTime);
    
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    gainNode.gain.setValueAtTime(volume, ctx.currentTime + delay);
    
    source.start(ctx.currentTime + delay);
  } catch (e) {
    // Audio context not available
  }
};

// === GAME SOUND EFFECTS ===

export const sounds = {
  // Card sounds
  cardDeal: () => {
    playNoise(0.08, 0.12);
    playTone(800, 0.05, 'sine', 0.04);
  },
  
  cardFlip: () => {
    playNoise(0.06, 0.1);
    playTone(1200, 0.04, 'sine', 0.03);
  },
  
  cardSlide: () => {
    playNoise(0.12, 0.06);
  },
  
  // Chip sounds
  chipPlace: () => {
    playTone(600, 0.08, 'triangle', 0.1);
    playTone(900, 0.06, 'triangle', 0.06, 0.04);
  },
  
  chipStack: () => {
    for (let i = 0; i < 3; i++) {
      playTone(500 + i * 200, 0.06, 'triangle', 0.06, i * 0.03);
    }
  },
  
  // Action sounds
  check: () => {
    playTone(440, 0.1, 'sine', 0.08);
  },
  
  call: () => {
    playTone(523, 0.1, 'sine', 0.08);
    playTone(659, 0.08, 'sine', 0.06, 0.08);
  },
  
  raise: () => {
    playTone(523, 0.08, 'square', 0.06);
    playTone(659, 0.08, 'square', 0.06, 0.08);
    playTone(784, 0.12, 'square', 0.08, 0.16);
  },
  
  fold: () => {
    playTone(400, 0.15, 'sine', 0.06);
    playTone(300, 0.2, 'sine', 0.04, 0.1);
  },
  
  allIn: () => {
    playTone(440, 0.1, 'sawtooth', 0.06);
    playTone(554, 0.1, 'sawtooth', 0.06, 0.1);
    playTone(659, 0.1, 'sawtooth', 0.06, 0.2);
    playTone(880, 0.2, 'sawtooth', 0.08, 0.3);
  },
  
  // Game events
  yourTurn: () => {
    playTone(523, 0.12, 'sine', 0.1);
    playTone(659, 0.15, 'sine', 0.1, 0.12);
  },
  
  win: () => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      playTone(freq, 0.3, 'sine', 0.1, i * 0.15);
      playTone(freq * 1.5, 0.2, 'sine', 0.05, i * 0.15 + 0.05);
    });
  },
  
  lose: () => {
    playTone(400, 0.3, 'sine', 0.08);
    playTone(350, 0.3, 'sine', 0.06, 0.2);
    playTone(300, 0.4, 'sine', 0.04, 0.4);
  },
  
  bust: () => {
    playTone(300, 0.15, 'sawtooth', 0.08);
    playTone(200, 0.25, 'sawtooth', 0.06, 0.1);
  },
  
  blackjack: () => {
    const notes = [659, 784, 988, 1318];
    notes.forEach((freq, i) => {
      playTone(freq, 0.25, 'sine', 0.1, i * 0.12);
    });
  },
  
  // UI sounds
  buttonClick: () => {
    playTone(800, 0.05, 'sine', 0.06);
  },
  
  buttonHover: () => {
    playTone(1000, 0.03, 'sine', 0.03);
  },
  
  notification: () => {
    playTone(880, 0.1, 'sine', 0.08);
    playTone(1100, 0.15, 'sine', 0.08, 0.1);
  },
  
  timerTick: () => {
    playTone(1000, 0.03, 'sine', 0.05);
  },
  
  draw: () => {
    playNoise(0.1, 0.08);
    playTone(600, 0.08, 'sine', 0.05, 0.02);
  },
  
  discard: () => {
    playNoise(0.08, 0.06);
    playTone(400, 0.06, 'sine', 0.04);
  },
  
  meldCreate: () => {
    playTone(523, 0.08, 'sine', 0.08);
    playTone(659, 0.08, 'sine', 0.08, 0.08);
    playTone(784, 0.12, 'sine', 0.1, 0.16);
  },
  
  declare: () => {
    const notes = [523, 659, 784, 1047, 1318];
    notes.forEach((freq, i) => {
      playTone(freq, 0.2, 'sine', 0.08, i * 0.1);
    });
  },
};

export default sounds;
