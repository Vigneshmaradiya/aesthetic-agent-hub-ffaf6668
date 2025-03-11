
import { useEffect, useRef } from "react";

const educationData = [
  {
    institution: "IIITDM Kurnool",
    degree: "B.Tech, AI & Data Science",
    duration: "2022 - Present",
    description: "Currently pursuing a Bachelor of Technology degree in Artificial Intelligence and Data Science.",
  },
  {
    institution: "Kendriya Vidyalaya",
    degree: "12th Standard",
    duration: "Completed",
    description: "Completed higher secondary education with focus on science and mathematics.",
  },
  {
    institution: "Kendriya Vidyalaya",
    degree: "10th Standard",
    duration: "Completed",
    description: "Completed secondary education with excellence in academics.",
  },
];

const EducationSection = () => {
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
      className="section-spacing section-container"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="appear-animated opacity-0 inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Education
          </span>
          <h2 className="appear-animated opacity-0 text-3xl md:text-4xl font-bold mb-4">
            Academic Background
          </h2>
          <p className="appear-animated opacity-0 text-lg text-muted-foreground max-w-2xl mx-auto">
            My educational journey and qualifications.
          </p>
        </div>

        <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {educationData.map((education, index) => (
            <div 
              key={education.institution + education.degree} 
              className="appear-animated opacity-0 relative flex items-start md:justify-between group md:even:flex-row-reverse"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-card z-10 shadow-md md:group-even:order-1 md:group-even:ml-8 md:group-odd:mr-8">
                <span className="h-3 w-3 rounded-full bg-primary"></span>
              </div>
              
              <div className="min-w-0 md:w-[calc(50%-4rem)] bg-card p-6 rounded-xl border border-border shadow-sm my-4 md:my-8 ml-8 md:ml-0 transition-all duration-300 hover:shadow-md">
                <div className="font-semibold text-primary mb-1">{education.duration}</div>
                <h3 className="text-xl font-bold mb-2">{education.institution}</h3>
                <div className="text-muted-foreground font-medium mb-3">{education.degree}</div>
                <p className="text-muted-foreground">{education.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EducationSection;
