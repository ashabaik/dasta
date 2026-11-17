"use client";

import { motion, useReducedMotion } from "motion/react";

/** A small lift on hover and a press on tap. Starts from its resting state, so nothing is hidden without JS. */
export function Lift({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial={false} whileHover={reduce ? undefined : { y: -4 }} whileTap={reduce ? undefined : { scale: 0.985 }} transition={{ type: "spring", stiffness: 420, damping: 30 }}>
      {children}
    </motion.div>
  );
}
