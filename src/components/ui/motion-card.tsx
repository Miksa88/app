import { motion } from "framer-motion";
import { Card } from "./card";

// DESIGN_AUDIT v2 C1 — framer-motion wrapped Card za fadeUp/scaleIn patterns.
// Zamenjuje ~378 instanci `<motion.div className="bg-card rounded-2xl p-4 card-shadow">`.
// Usage: <MotionCard {...fadeUp(0.1)} className="p-4">...</MotionCard>
//
// motion.create() (umesto motion(Card)) je framer 11+ preporučen pristup kada
// source komponenta koristi React.forwardRef — izbegava "Function components
// cannot be given refs" runtime warning.
export const MotionCard = motion.create(Card);
