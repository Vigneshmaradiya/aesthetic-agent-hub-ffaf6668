"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const IMAGE_URL =
  "https://bsxuihpqbteiynloucnx.supabase.co/storage/v1/object/sign/Resume/Photo1.jpg?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJSZXN1bWUvUGhvdG8xLmpwZyIsImlhdCI6MTc0MTcyMDAwMSwiZXhwIjoyMDU3MDgwMDAxfQ.2AerwPvNqDvOjQMzmU8o0y4PuQMWxQ_k6GlTnYO0m_k";

const skills = [
  "JavaScript (ES6+)",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "Tailwind CSS",
  "Git & GitHub",
];

export function AboutSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="about"
      ref={ref}
      className="py-24 md:py-32 px-6 md:px-0 max-w-[900px] mx-auto"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <h2 className="numbered-heading">About Me</h2>

        <div className="grid md:grid-cols-[3fr_2fr] gap-12">
          <div className="text-base leading-relaxed text-slate space-y-4">
            <p>
              Hello! My name is <span className="text-green">Your Name</span> and I enjoy
              creating things that live on the internet. My interest in web
              development started when I began exploring how websites are built
              &mdash; and I&apos;ve been hooked ever since.
            </p>
            <p>
              I&apos;m a passionate developer who loves turning ideas into
              reality through clean, efficient code. I focus on building
              applications that are not only functional but also provide great
              user experiences.
            </p>
            <p>Here are a few technologies I&apos;ve been working with recently:</p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 font-mono text-[13px]">
              {skills.map((skill) => (
                <li key={skill} className="flex items-start gap-2">
                  <span className="text-green mt-[6px] text-xs">▹</span>
                  <span>{skill}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Profile image with Brittany's exact overlay style */}
          <div className="relative group mx-auto max-w-[300px] w-full">
            <div className="relative rounded overflow-hidden">
              {/* Green overlay */}
              <div className="absolute inset-0 bg-green/20 mix-blend-multiply z-10 transition-opacity duration-300 group-hover:opacity-0 rounded" />
              {/* Grayscale to color on hover */}
              <img
                src={IMAGE_URL}
                alt="Profile"
                width={300}
                height={300}
                className="block w-full rounded grayscale transition-all duration-300 group-hover:grayscale-0 group-hover:scale-[1.02]"
              />
            </div>
            {/* Border frame */}
            <div className="absolute -bottom-4 -right-4 w-full h-full border-2 border-green rounded z-[-1] transition-all duration-300 group-hover:-translate-x-1 group-hover:-translate-y-1" />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
