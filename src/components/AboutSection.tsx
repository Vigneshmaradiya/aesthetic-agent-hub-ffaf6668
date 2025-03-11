
import { useEffect, useRef } from "react";

const AboutSection = () => {
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
      id="about"
      ref={sectionRef}
      className="section-spacing section-container"
    >
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <span className="appear-animated opacity-0 inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            About Me
          </span>
          <h2 className="appear-animated opacity-0 text-3xl md:text-4xl font-bold">
            Get to know me
          </h2>
        </div>

        <div className="appear-animated opacity-0 text-center md:text-left">
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed text-balance">
              I am an AI & Data Science enthusiast passionate about developing innovative machine learning solutions. 
              My expertise lies in Python, Machine Learning, and Data Analysis. I enjoy solving complex problems and exploring cutting-edge AI technologies.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="appear-animated opacity-0 p-6 rounded-xl border border-border bg-card/50 hover:bg-card/80 transition-all duration-300 hover:shadow-md">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-6 h-6"
                  >
                    <path d="M12 2 2 7l10 5 10-5-10-5Z" />
                    <path d="m2 17 10 5 10-5" />
                    <path d="m2 12 10 5 10-5" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium mb-2">Problem Solver</h3>
                <p className="text-muted-foreground">
                  I enjoy tackling complex problems with innovative solutions.
                </p>
              </div>
            </div>

            <div className="appear-animated opacity-0 p-6 rounded-xl border border-border bg-card/50 hover:bg-card/80 transition-all duration-300 hover:shadow-md">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-6 h-6"
                  >
                    <circle cx="18" cy="18" r="3" />
                    <circle cx="6" cy="6" r="3" />
                    <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                    <line x1="6" x2="6" y1="9" y2="21" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium mb-2">Data Enthusiast</h3>
                <p className="text-muted-foreground">
                  I turn data into meaningful insights and solutions.
                </p>
              </div>
            </div>

            <div className="appear-animated opacity-0 p-6 rounded-xl border border-border bg-card/50 hover:bg-card/80 transition-all duration-300 hover:shadow-md">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-6 h-6"
                  >
                    <path d="M18 6H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h13l4-3.5L18 6Z" />
                    <path d="M12 13v8" />
                    <path d="M5 13v6a2 2 0 0 0 2 2h8" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium mb-2">Continuous Learner</h3>
                <p className="text-muted-foreground">
                  Always exploring the latest in AI and machine learning.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
