
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
      className="section-spacing"
    >
      <h2 className="appear-animated opacity-0 heading-with-line text-2xl font-bold text-slate-200">
        <span className="font-mono text-primary text-lg">02.</span> About Me
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-10">
        <div className="md:col-span-2 appear-animated opacity-0">
          <div className="space-y-4 text-slate-400">
            <p>
              I am an AI & Data Science enthusiast passionate about developing innovative machine learning solutions. 
              My expertise lies in Python, Machine Learning, and Data Analysis. I enjoy solving complex problems and exploring cutting-edge AI technologies.
            </p>
            <p>
              Currently, I'm focused on building data-driven solutions at IIITDM Kurnool, where I apply 
              my knowledge to create practical applications that extract meaningful insights from data.
            </p>
            <p>
              Here are a few technologies I've been working with recently:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-6">
              <div className="list-item-with-marker">Python</div>
              <div className="list-item-with-marker">TensorFlow</div>
              <div className="list-item-with-marker">PyTorch</div>
              <div className="list-item-with-marker">Machine Learning</div>
              <div className="list-item-with-marker">NLP</div>
              <div className="list-item-with-marker">Data Analysis</div>
            </div>
          </div>
        </div>
        
        <div className="appear-animated opacity-0">
          <div className="relative group">
            <div className="w-full aspect-square rounded-md overflow-hidden border-2 border-primary/30 hover-glow">
              <img 
                src="/lovable-uploads/b48f984e-9a8e-4f38-8053-8b9a04e3099e.png" 
                alt="Vignesh Maradiya" 
                className="w-full h-full object-cover rounded-md grayscale hover:grayscale-0 transition-all duration-300"
              />
              <div className="absolute inset-0 bg-primary/10 mix-blend-multiply"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
