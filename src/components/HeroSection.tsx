
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
    // Replace with your Supabase resume URL
    window.open("https://bsxuihpqbteiynloucnx.supabase.co/storage/v1/object/sign/Resume/My_Resume.pdf?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJSZXN1bWUvTXlfUmVzdW1lLnBkZiIsImlhdCI6MTc0MTcxOTk3MCwiZXhwIjoyMDU3MDc5OTcwfQ.17Dkej4dDf96ii9hXqUL_KR8-03fIE-hGDRiyRNeEzw", "_blank");
  };

  return (
    <section 
      id="home" 
      ref={sectionRef}
      className="min-h-screen flex flex-col justify-center py-24 sm:py-32 space-y-8 px-6 lg:px-8"
    >
      <div className="space-y-4 appear-animated opacity-0">
        <span className="text-primary text-sm sm:text-base font-mono">Hi, my name is</span>
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-slate-100">
          Vignesh Maradiya.
        </h1>
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-400">
          I turn data into insights.
        </h2>
      </div>

      <p className="appear-animated opacity-0 max-w-xl text-slate-400 text-lg leading-relaxed">
        I&apos;m an AI & Data Science enthusiast passionate about developing innovative machine learning solutions. 
        My expertise lies in Python, Machine Learning, and Data Analysis. 
        Currently, I&apos;m focused on building data-driven solutions at IIITDM Kurnool.
      </p>

      <div className="appear-animated opacity-0 space-x-4 flex mt-8">
        <Button
          size="lg"
          variant="outline"
          className="font-mono border-primary text-primary hover:bg-primary/10"
          onClick={handleResumeDownload}
        >
          <DownloadIcon className="mr-2 h-4 w-4" />
          Resume
        </Button>

        <div className="flex space-x-4">
          <a
            href="https://linkedin.com/in/vignesh-maradiya"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-primary transition-colors"
            aria-label="LinkedIn Profile"
          >
            <LinkedInIcon className="h-6 w-6" />
          </a>
          <a
            href="https://github.com/Vigneshmaradiya"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-primary transition-colors"
            aria-label="GitHub Profile"
          >
            <GitHubIcon className="h-6 w-6" />
          </a>
          <a
            href="mailto:maradiyavignesh@gmail.com"
            className="text-slate-400 hover:text-primary transition-colors"
            aria-label="Email"
          >
            <MailIcon className="h-6 w-6" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
