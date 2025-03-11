
import { useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import SkillsSection from "@/components/SkillsSection";
import ProjectsSection from "@/components/ProjectsSection";
import EducationSection from "@/components/EducationSection";
import ExperienceSection from "@/components/ExperienceSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { toast } = useToast();
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Welcome toast
    const hasSeenWelcome = sessionStorage.getItem("hasSeenWelcome");
    
    if (!hasSeenWelcome) {
      setTimeout(() => {
        toast({
          title: "Welcome to my portfolio!",
          description: "Feel free to explore and reach out if you have any questions.",
          duration: 5000,
        });
        sessionStorage.setItem("hasSeenWelcome", "true");
      }, 1500);
    }
    
    // Scroll animations
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
    
    const animatedElements = document.querySelectorAll(".appear-animated");
    animatedElements.forEach((el) => observer.observe(el));
    
    // Glowing cursor effect
    const cursor = cursorRef.current;
    if (cursor) {
      cursor.style.opacity = "0";
      
      const updateCursor = (e: MouseEvent) => {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
        cursor.style.opacity = "1";
      };
      
      window.addEventListener("mousemove", updateCursor);
      
      return () => {
        window.removeEventListener("mousemove", updateCursor);
        animatedElements.forEach((el) => observer.unobserve(el));
      };
    }
    
    return () => {
      animatedElements.forEach((el) => observer.unobserve(el));
    };
  }, [toast]);

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      {/* Glowing cursor effect */}
      <div ref={cursorRef} className="glow-cursor"></div>
      
      <Navbar />
      <main className="flex-grow">
        <HeroSection />
        <AboutSection />
        <SkillsSection />
        <ExperienceSection />
        <EducationSection />
        <ProjectsSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
