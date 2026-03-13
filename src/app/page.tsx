"use client";

import { Navbar } from "@/components/portfolio/Navbar";
import { HeroSection } from "@/components/portfolio/HeroSection";
import { AboutSection } from "@/components/portfolio/AboutSection";
import { EducationSection } from "@/components/portfolio/EducationSection";
// import { ExperienceSection } from "@/components/portfolio/ExperienceSection";
import { ProjectsSection } from "@/components/portfolio/ProjectsSection";
import { ContactSection } from "@/components/portfolio/ContactSection";
import { Footer } from "@/components/portfolio/Footer";
import { SocialSidebar } from "@/components/portfolio/SocialSidebar";
import { CursorGlow } from "@/components/portfolio/CursorGlow";

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ counterReset: "section" }}>
      <CursorGlow />
      <Navbar />
      <SocialSidebar />

      <main className="px-6 md:px-[150px] lg:px-[200px]">
        <HeroSection />
        <AboutSection />
        <EducationSection />
        {/* Experience section — uncomment when ready:
        <ExperienceSection />
        */}
        <ProjectsSection />
        <ContactSection />
      </main>

      <Footer />
    </div>
  );
}
