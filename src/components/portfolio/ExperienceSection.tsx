"use client";

/* 
 * Experience Section — prepared but hidden.
 * Uncomment the section in the main page and add your data when ready.
 */

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

interface ExperienceItem {
  company: string;
  title: string;
  url: string;
  date: string;
  points: string[];
}

const experienceData: ExperienceItem[] = [
  {
    company: "Company Name",
    title: "Software Engineer",
    url: "#",
    date: "Jan 2025 — Present",
    points: [
      "Describe your role and responsibilities here",
      "Highlight key achievements and technologies used",
      "Mention impact and results of your work",
    ],
  },
];

export function ExperienceSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeTab, setActiveTab] = useState(0);

  const active = experienceData[activeTab];

  return (
    <section
      id="experience"
      ref={ref}
      className="py-24 md:py-32 px-6 md:px-0 max-w-[700px] mx-auto"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <h2 className="numbered-heading">Where I&apos;ve Worked</h2>

        <div className="flex flex-col md:flex-row gap-0">
          <div className="flex md:flex-col overflow-x-auto md:overflow-visible md:min-w-[200px] border-b md:border-b-0 border-navy-lightest">
            {experienceData.map((item, i) => (
              <button
                key={item.company}
                onClick={() => setActiveTab(i)}
                className={`tab-button whitespace-nowrap ${i === activeTab ? "active" : ""}`}
              >
                {item.company}
              </button>
            ))}
          </div>

          <div className="pt-3 md:pt-0 md:pl-8 min-h-[280px]">
            <h3 className="text-xl font-medium text-slate-lightest mb-[2px]">
              {active.title}{" "}
              <a
                href={active.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-link text-green"
              >
                @ {active.company}
              </a>
            </h3>
            <p className="font-mono text-[13px] text-slate mb-6">
              {active.date}
            </p>
            <ul className="space-y-3">
              {active.points.map((point, i) => (
                <li key={i} className="flex items-start gap-3 text-base text-slate leading-relaxed">
                  <span className="text-green mt-[6px] text-xs shrink-0">▹</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
