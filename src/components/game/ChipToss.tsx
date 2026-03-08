import { motion, AnimatePresence } from "framer-motion";
import PokerChip from "@/components/PokerChip";

interface ChipTossProps {
  chipStyle?: string;
  amount: number;
  size?: "sm" | "md" | "lg";
}

/**
 * Animated chip + amount that "tosses" in from below with a slight arc and spin.
 * Wrap with AnimatePresence at the call-site so exit animations play.
 */
const ChipToss = ({ chipStyle, amount, size = "sm" }: ChipTossProps) => (
  <motion.div
    className="flex items-center justify-center gap-1 text-xs text-primary font-semibold"
    initial={{ opacity: 0, y: 24, scale: 0.4, rotate: -90 }}
    animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
    exit={{ opacity: 0, y: -12, scale: 0.6 }}
    transition={{
      type: "spring",
      stiffness: 340,
      damping: 18,
      mass: 0.6,
    }}
  >
    <motion.div
      initial={{ rotateY: 0 }}
      animate={{ rotateY: 360 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <PokerChip chipStyle={chipStyle} size={size} />
    </motion.div>
    <span>${amount}</span>
  </motion.div>
);

export default ChipToss;
