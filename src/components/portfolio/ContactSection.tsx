"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

export function ContactSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="contact"
      ref={ref}
      className="py-24 md:py-32 px-6 md:px-0 max-w-[600px] mx-auto text-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <p className="font-mono text-base text-green mb-3">
          05. What&apos;s Next?
        </p>
        <h2 className="text-[clamp(40px,5vw,60px)] font-bold text-slate-lightest mb-4">
          Get In Touch
        </h2>
        <p className="text-base leading-relaxed text-slate mb-12 max-w-[500px] mx-auto">
          I&apos;m currently looking for new opportunities. Whether you have a
          question or just want to say hi, my inbox is always open and I&apos;ll
          try my best to get back to you!
        </p>
        <a
          href="mailto:your.email@example.com"
          className="big-button"
        >
          Say Hello
        </a>
      </motion.div>
    </section>
  );
}
