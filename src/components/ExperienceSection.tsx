
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

  // Hidden by default - CSS will hide this section
  return (
    <section
      id="experience"
      ref={sectionRef}
      className="section-spacing hidden"
    >
      <h2 className="appear-animated opacity-0 heading-with-line text-2xl font-bold text-slate-200">
        <span className="font-mono text-primary text-lg">04.</span> Where I&apos;ve Worked
      </h2>

      <div className="appear-animated opacity-0 grid md:grid-cols-[200px_1fr] gap-4 mt-10">
        {experienceData.length > 0 ? (
          <>
            <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible scrollbar-none">
              {experienceData.map((exp, index) => (
                <Button
                  key={exp.company}
                  variant="ghost"
                  className={`tab-button ${
                    activeTab === index
                      ? "tab-button-active"
                      : "tab-button-inactive"
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
                    className="list-item-with-marker"
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
    </section>
  );
};

export default ExperienceSection;
