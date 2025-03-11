
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { GitHubIcon, LinkedInIcon, MailIcon } from "./SocialIcons";
import { DownloadIcon } from "lucide-react";

const HeroSection = () => {
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

  const handleResumeDownload = () => {
    // In a real app, this would point to an actual resume file
    alert("Resume download functionality would be implemented here with a real file!");
  };

  return (
    <section 
      id="home" 
      ref={sectionRef}
      className="min-h-screen flex items-center pt-20 pb-20 section-container"
    >
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
        <div className="order-2 lg:order-1 text-center lg:text-left">
          <span className="inline-block appear-animated opacity-0 font-medium text-primary mb-3">
            Hello, I&apos;m
          </span>
          <h1 className="appear-animated opacity-0 text-4xl sm:text-5xl md:text-6xl font-bold mb-4 tracking-tight">
            Vignesh Maradiya
          </h1>
          <p className="appear-animated opacity-0 text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
            AI & Data Science Enthusiast | ML & Deep Learning Practitioner
          </p>
          
          <div className="appear-animated opacity-0 flex flex-wrap gap-4 justify-center lg:justify-start mb-8">
            <a
              href="https://linkedin.com/in/vignesh-maradiya"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center p-2 rounded-full bg-background/80 border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
              aria-label="LinkedIn Profile"
            >
              <LinkedInIcon className="h-6 w-6" />
            </a>
            <a
              href="https://github.com/Vigneshmaradiya"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center p-2 rounded-full bg-background/80 border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
              aria-label="GitHub Profile"
            >
              <GitHubIcon className="h-6 w-6" />
            </a>
            <a
              href="mailto:maradiyavignesh@gmail.com"
              className="inline-flex items-center justify-center p-2 rounded-full bg-background/80 border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
              aria-label="Email"
            >
              <MailIcon className="h-6 w-6" />
            </a>
          </div>
          
          <div className="appear-animated opacity-0">
            <Button
              size="lg"
              className="rounded-full font-medium text-base px-6 py-6 h-auto group transition-all duration-300 bg-primary hover:bg-primary/90"
              onClick={handleResumeDownload}
            >
              <DownloadIcon className="mr-2 h-5 w-5 group-hover:translate-y-0.5 transition-transform duration-300" />
              Download Resume
            </Button>
          </div>
        </div>
        
        <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
          <div className="appear-animated opacity-0 relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-full overflow-hidden border-4 border-primary/20">
            <div className="absolute inset-0 flex items-center justify-center bg-primary/5 text-primary font-semibold">
              Profile Image
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
