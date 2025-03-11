
import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Github } from "lucide-react";

const projectsData = [
  {
    title: "Hospital Management System",
    description: "GUI-based hospital management app with patient records and authentication.",
    techStack: ["Python", "Tkinter", "SQL"],
    github: "https://github.com/Vigneshmaradiya/HMS-Project",
    demo: null,
  },
  {
    title: "House Price Prediction",
    description: "ML model predicting house prices with 89% accuracy.",
    techStack: ["Python", "Scikit-learn"],
    github: "https://github.com/Vigneshmaradiya/House-Price-Prediction",
    demo: "https://huggingface.co/spaces/Vigneshmaradiya/House-Price-Prediction",
  },
];

const ProjectsSection = () => {
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
      id="projects"
      ref={sectionRef}
      className="section-spacing"
    >
      <h2 className="appear-animated opacity-0 heading-with-line text-2xl font-bold text-slate-200">
        <span className="font-mono text-primary text-lg">06.</span> Some Things I&apos;ve Built
      </h2>

      <div className="mt-10 space-y-16">
        {projectsData.map((project, index) => (
          <div
            key={project.title}
            className="appear-animated opacity-0 group"
          >
            <div className="relative grid md:grid-cols-12 gap-4 md:gap-8 items-center">
              <div className={`md:col-span-7 ${index % 2 === 0 ? 'md:order-2' : 'md:order-1'}`}>
                <div className="z-10 relative rounded-lg bg-slate-800/50 p-6 border border-slate-700 hover-glow">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-mono text-xs text-primary mb-2">Featured Project</div>
                    <div className="flex gap-4">
                      {project.github && (
                        <a 
                          href={project.github} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-primary transition-colors"
                          aria-label="GitHub Repository"
                        >
                          <Github className="h-5 w-5" />
                        </a>
                      )}
                      {project.demo && (
                        <a 
                          href={project.demo} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-primary transition-colors"
                          aria-label="Live Demo"
                        >
                          <ExternalLink className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-200 mb-4">
                    {project.title}
                  </h3>
                  <p className="text-slate-400 mb-6">
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {project.techStack.map(tech => (
                      <span key={tech} className="text-xs font-mono text-slate-300">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className={`md:col-span-5 ${index % 2 === 0 ? 'md:order-1' : 'md:order-2'}`}>
                <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-800/50 border border-slate-700">
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                    Project Preview
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProjectsSection;
