"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

interface EducationItem {
  institution: string;
  degree: string;
  date: string;
  points: string[];
}

const educationData: EducationItem[] = [
  {
    institution: "Your University",
    degree: "Bachelor of Technology in Computer Science",
    date: "2021 — 2025",
    points: [
      "Relevant coursework: Data Structures, Algorithms, DBMS, Operating Systems, Computer Networks, Software Engineering",
      "Participated in various coding competitions and hackathons",
      "Member of the university coding club and tech community",
    ],
  },
  {
    institution: "Your School",
    degree: "Higher Secondary (12th Grade) — Science",
    date: "2019 — 2021",
    points: [
      "Focused on Physics, Chemistry, and Mathematics",
      "Developed strong analytical and problem-solving skills",
    ],
  },
];

export function EducationSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeTab, setActiveTab] = useState(0);

  const active = educationData[activeTab];

  return (
    <section
      id="education"
      ref={ref}
      className="py-24 md:py-32 px-6 md:px-0 max-w-[700px] mx-auto"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <h2 className="numbered-heading">Education</h2>

        <div className="flex flex-col md:flex-row gap-0">
          {/* Tab list */}
          <div className="flex md:flex-col overflow-x-auto md:overflow-visible md:min-w-[200px] border-b md:border-b-0 border-navy-lightest">
            {educationData.map((item, i) => (
              <button
                key={item.institution}
                onClick={() => setActiveTab(i)}
                className={`tab-button whitespace-nowrap ${i === activeTab ? "active" : ""}`}
              >
                {item.institution}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="pt-3 md:pt-0 md:pl-8 min-h-[280px]">
            <h3 className="text-xl font-medium text-slate-lightest mb-[2px]">
              {active.degree}
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
