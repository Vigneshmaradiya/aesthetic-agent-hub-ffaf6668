
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
      className="section-spacing section-container bg-secondary/30 dark:bg-secondary/10 py-24 rounded-3xl my-10"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="appear-animated opacity-0 inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Skills
          </span>
          <h2 className="appear-animated opacity-0 text-3xl md:text-4xl font-bold mb-4">
            My Technical Expertise
          </h2>
          <p className="appear-animated opacity-0 text-lg text-muted-foreground max-w-2xl mx-auto">
            Here are some of the technologies and tools I work with.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {skillsData.map((category, index) => (
            <div 
              key={category.category}
              className={`appear-animated opacity-0 p-6 rounded-xl border border-border bg-card backdrop-blur-sm hover:shadow-lg transition-all duration-300`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <h3 className="text-xl font-semibold mb-4">{category.category}</h3>
              <div className="flex flex-wrap gap-2">
                {category.skills.map((skill) => (
                  <Badge 
                    key={skill} 
                    variant="secondary"
                    className="px-3 py-1 text-sm bg-secondary/50 hover:bg-primary/20 hover:text-primary transition-colors duration-300"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SkillsSection;
