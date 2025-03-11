
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
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
      className="section-spacing section-container"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="appear-animated opacity-0 inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Projects
          </span>
          <h2 className="appear-animated opacity-0 text-3xl md:text-4xl font-bold mb-4">
            My Latest Work
          </h2>
          <p className="appear-animated opacity-0 text-lg text-muted-foreground max-w-2xl mx-auto">
            A showcase of my projects and experiments in AI & Data Science.
          </p>
        </div>

        <div className="grid gap-8 sm:gap-12 sm:grid-cols-1 lg:grid-cols-2">
          {projectsData.map((project, index) => (
            <div
              key={project.title}
              className="appear-animated opacity-0 group relative rounded-2xl border border-border overflow-hidden transition-all duration-300 hover:shadow-xl"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative p-6 md:p-8 h-full flex flex-col">
                <div className="mb-6 md:mb-8">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <h3 className="text-2xl font-bold group-hover:text-primary transition-colors duration-300">
                      {project.title}
                    </h3>
                  </div>
                  
                  <p className="text-muted-foreground mb-6">{project.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {project.techStack.map((tech) => (
                      <Badge 
                        key={tech} 
                        variant="outline"
                        className="px-2.5 py-0.5 text-xs font-medium border-primary/20 text-primary bg-primary/5"
                      >
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="mt-auto flex gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg group/link transition-all duration-300 hover:bg-background hover:text-foreground"
                    asChild
                  >
                    <a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Github className="h-4 w-4 mr-2 group-hover/link:text-primary transition-colors duration-300" />
                      GitHub
                    </a>
                  </Button>
                  
                  {project.demo && (
                    <Button
                      variant="default"
                      size="sm"
                      className="rounded-lg group/link transition-all duration-300"
                      asChild
                    >
                      <a
                        href={project.demo}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform duration-300" />
                        Demo
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectsSection;
