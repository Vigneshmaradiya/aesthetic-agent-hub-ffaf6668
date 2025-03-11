
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// This section is hidden by default and can be uncommented and populated when needed
const experienceData = [
  // Example format for future use:
  // {
  //   company: "Company Name",
  //   title: "Position",
  //   duration: "Month YYYY - Present",
  //   description: [
  //     "Achievement or responsibility 1",
  //     "Achievement or responsibility 2",
  //     "Achievement or responsibility 3",
  //   ],
  // },
];

const ExperienceSection = () => {
  const [activeTab, setActiveTab] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  // Hidden by default - uncomment display class when ready to use
  return null;

  // Uncomment this return statement when ready to use:
  /*
  return (
    <section
      id="experience"
      ref={sectionRef}
      className="py-24 sm:py-32 px-6 lg:px-8"
    >
      <div className="max-w-5xl mx-auto">
        <h2 className="appear-animated opacity-0 flex items-center gap-2 text-2xl sm:text-3xl font-bold text-slate-100 mb-8">
          <span className="font-mono text-primary text-sm sm:text-base">03.</span>
          Experience
        </h2>

        <div className="appear-animated opacity-0 grid md:grid-cols-[200px_1fr] gap-4 mt-8">
          {experienceData.length > 0 ? (
            <>
              <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible scrollbar-none">
                {experienceData.map((exp, index) => (
                  <Button
                    key={exp.company}
                    variant="ghost"
                    className={`whitespace-nowrap font-mono text-sm px-4 py-2 border-l-2 md:border-l-0 md:border-l-2 rounded-none text-left justify-start ${
                      activeTab === index
                        ? "text-primary border-primary bg-primary/10"
                        : "text-slate-400 border-slate-700 hover:bg-primary/5 hover:text-primary hover:border-primary"
                    }`}
                    onClick={() => setActiveTab(index)}
                  >
                    {exp.company}
                  </Button>
                ))}
              </div>

              <div className="min-h-[200px] py-2">
                <div className="space-y-1">
                  <h3 className="text-xl text-slate-100">
                    {experienceData[activeTab].title}
                    <span className="text-primary"> @ {experienceData[activeTab].company}</span>
                  </h3>
                  <p className="font-mono text-sm text-slate-400">
                    {experienceData[activeTab].duration}
                  </p>
                </div>

                <ul className="mt-4 space-y-4">
                  {experienceData[activeTab].description.map((point, index) => (
                    <li
                      key={index}
                      className="flex gap-2 text-slate-400 before:content-['▹'] before:text-primary"
                    >
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p className="text-slate-400 col-span-2 text-center py-8">
              Experience section coming soon...
            </p>
          )}
        </div>
      </div>
    </section>
  );
  */
};

export default ExperienceSection;
