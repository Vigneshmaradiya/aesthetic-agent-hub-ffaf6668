
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const educationData = [
  {
    institution: "IIITDM Kurnool",
    degree: "B.Tech, AI & Data Science",
    duration: "2022 - Present",
    description: [
      "Currently pursuing a Bachelor of Technology degree specializing in Artificial Intelligence and Data Science",
      "Relevant coursework: Machine Learning, Deep Learning, Data Structures, Algorithms",
      "Maintaining a strong academic performance while actively participating in research projects",
    ],
  },
  {
    institution: "Kendriya Vidyalaya",
    degree: "12th Standard (Senior Secondary)",
    duration: "Completed",
    description: [
      "Completed higher secondary education with focus on science and mathematics",
      "Achieved excellent academic results in core subjects including Physics, Chemistry, and Mathematics",
      "Participated in various science exhibitions and competitions",
    ],
  },
  {
    institution: "Kendriya Vidyalaya",
    degree: "10th Standard",
    duration: "Completed",
    description: [
      "Completed secondary education with distinction",
      "Active participation in extracurricular activities and academic competitions",
      "Developed strong foundation in science and mathematics",
    ],
  },
];

const EducationSection = () => {
  const [activeTab, setActiveTab] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("fade-in");
          }
        });
      },
      { threshold: 0.1 }
    );

    const elementsToAnimate = sectionRef.current?.querySelectorAll(".appear-animated");
    elementsToAnimate?.forEach((el) => observer.observe(el));

    return () => {
      elementsToAnimate?.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return (
    <section
      id="education"
      ref={sectionRef}
      className="py-24 sm:py-32 px-6 lg:px-8"
    >
      <div className="max-w-5xl mx-auto">
        <h2 className="appear-animated opacity-0 flex items-center gap-2 text-2xl sm:text-3xl font-bold text-slate-100 mb-8">
          <span className="font-mono text-primary text-sm sm:text-base">02.</span>
          Education
        </h2>

        <div className="appear-animated opacity-0 grid md:grid-cols-[200px_1fr] gap-4 mt-8">
          <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible scrollbar-none">
            {educationData.map((edu, index) => (
              <Button
                key={edu.institution}
                variant="ghost"
                className={`whitespace-nowrap font-mono text-sm px-4 py-2 border-l-2 md:border-l-0 md:border-l-2 rounded-none text-left justify-start ${
                  activeTab === index
                    ? "text-primary border-primary bg-primary/10"
                    : "text-slate-400 border-slate-700 hover:bg-primary/5 hover:text-primary hover:border-primary"
                }`}
                onClick={() => setActiveTab(index)}
              >
                {edu.institution}
              </Button>
            ))}
          </div>

          <div className="min-h-[200px] py-2">
            <div className="space-y-1">
              <h3 className="text-xl text-slate-100">
                {educationData[activeTab].degree}
                <span className="text-primary"> @ {educationData[activeTab].institution}</span>
              </h3>
              <p className="font-mono text-sm text-slate-400">
                {educationData[activeTab].duration}
              </p>
            </div>

            <ul className="mt-4 space-y-4">
              {educationData[activeTab].description.map((point, index) => (
                <li
                  key={index}
                  className="flex gap-2 text-slate-400 before:content-['▹'] before:text-primary"
                >
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EducationSection;
