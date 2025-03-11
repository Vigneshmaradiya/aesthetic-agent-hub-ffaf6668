
import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";

const skillsData = [
  {
    category: "Programming",
    skills: ["Python", "C", "C++", "SQL", "R"],
  },
  {
    category: "AI/ML",
    skills: ["Machine Learning", "Deep Learning", "NLP", "LLMs"],
  },
  {
    category: "Libraries",
    skills: ["Scikit-learn", "TensorFlow", "Keras", "PyTorch", "Pandas", "NumPy"],
  },
  {
    category: "Data Analysis",
    skills: ["Visualization", "Cleaning", "EDA", "Statistics"],
  },
  {
    category: "Tools",
    skills: ["Jupyter", "Git", "VSCode", "Flask", "Streamlit"],
  },
];

const SkillsSection = () => {
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
      id="skills"
      ref={sectionRef}
      className="section-spacing"
    >
      <h2 className="appear-animated opacity-0 heading-with-line text-2xl font-bold text-slate-200">
        <span className="font-mono text-primary text-lg">03.</span> Skills
      </h2>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-10">
        {skillsData.map((category, index) => (
          <div 
            key={category.category}
            className="appear-animated opacity-0 p-5 border border-slate-800 rounded-lg hover-glow"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <h3 className="text-lg font-semibold text-slate-200 mb-4 font-mono">{category.category}</h3>
            <div className="flex flex-wrap gap-2">
              {category.skills.map((skill) => (
                <Badge 
                  key={skill} 
                  variant="secondary"
                  className="px-3 py-1.5 text-xs font-mono bg-slate-800/50 text-slate-300 hover:bg-primary/20 hover:text-primary transition-colors duration-300"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SkillsSection;
