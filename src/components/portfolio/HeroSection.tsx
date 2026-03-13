"use client";

import { motion } from "framer-motion";

export function HeroSection() {
  return (
    <section className="flex min-h-screen flex-col justify-center px-6 md:px-0 max-w-[1000px] mx-auto">
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="mb-5 font-mono text-base text-green"
      >
        Hi, my name is
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-[clamp(40px,8vw,80px)] font-bold leading-[1.1] text-slate-lightest"
      >
        Your Name.
      </motion.h1>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="mt-1 text-[clamp(40px,8vw,80px)] font-bold leading-[1.1] text-slate"
      >
        I build things for the web.
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="mt-5 max-w-[540px] text-base leading-relaxed text-slate"
      >
        I&apos;m a software developer specializing in building exceptional
        digital experiences. Currently, I&apos;m focused on building accessible,
        human-centered products.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="mt-12"
      >
        <a href="#projects" className="big-button">
          Check out my work!
        </a>
      </motion.div>
    </section>
  );
}
