"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface Project {
  title: string;
  description: string;
  tech: string[];
  github?: string;
  external?: string;
}

const projects: Project[] = [
  {
    title: "Portfolio Website",
    description:
      "A personal portfolio website built with Next.js and Tailwind CSS, featuring smooth animations and a dark theme inspired by modern developer portfolios.",
    tech: ["Next.js", "TypeScript", "Tailwind CSS", "Framer Motion"],
    github: "#",
    external: "#",
  },
  {
    title: "Project Two",
    description:
      "A brief description of your second project. Explain what problem it solves and what makes it interesting.",
    tech: ["React", "Node.js", "MongoDB"],
    github: "#",
  },
  {
    title: "Project Three",
    description:
      "A brief description of your third project. Highlight the key features and technologies used.",
    tech: ["Python", "Flask", "PostgreSQL"],
    github: "#",
    external: "#",
  },
  {
    title: "Project Four",
    description:
      "Another project showcasing your skills. Describe the purpose and your role in building it.",
    tech: ["TypeScript", "Express", "Redis"],
    github: "#",
  },
  {
    title: "Project Five",
    description:
      "A project that demonstrates your problem-solving abilities and technical expertise.",
    tech: ["React Native", "Firebase"],
    github: "#",
    external: "#",
  },
  {
    title: "Project Six",
    description:
      "Yet another project in your portfolio. Showcase variety in your technical skills.",
    tech: ["Vue.js", "Supabase", "Tailwind"],
    github: "#",
  },
];

function FolderIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-green">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

export function ProjectsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section
      id="projects"
      ref={ref}
      className="py-24 md:py-32 px-6 md:px-0 max-w-[1000px] mx-auto"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <h2 className="numbered-heading">Some Things I&apos;ve Built</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project, i) => (
            <motion.div
              key={project.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="project-card flex flex-col"
            >
              {/* Card header */}
              <div className="flex items-center justify-between mb-8">
                <FolderIcon />
                <div className="flex items-center gap-3">
                  {project.github && (
                    <a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-light hover:text-green transition-colors"
                      aria-label="GitHub"
                    >
                      <GitHubIcon />
                    </a>
                  )}
                  {project.external && (
                    <a
                      href={project.external}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-light hover:text-green transition-colors"
                      aria-label="External Link"
                    >
                      <ExternalLinkIcon />
                    </a>
                  )}
                </div>
              </div>

              {/* Title */}
              <h3 className="text-[22px] font-semibold text-slate-lightest mb-3 hover:text-green transition-colors">
                {project.title}
              </h3>

              {/* Description */}
              <p className="text-sm leading-relaxed text-slate-light flex-1 mb-6">
                {project.description}
              </p>

              {/* Tech stack */}
              <ul className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[12px] text-slate">
                {project.tech.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
