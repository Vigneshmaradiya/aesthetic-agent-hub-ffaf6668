
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const ContactSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [formStatus, setFormStatus] = useState("");

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, you would send the form data to a server
    console.log("Form submitted:", formData);
    setFormStatus("Message sent! Thank you for reaching out.");
    setFormData({ name: "", email: "", message: "" });
    
    // Clear the success message after 5 seconds
    setTimeout(() => {
      setFormStatus("");
    }, 5000);
  };

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="section-spacing text-center"
    >
      <div className="max-w-md mx-auto">
        <span className="appear-animated opacity-0 font-mono text-primary text-base">07. What&apos;s Next?</span>
        <h2 className="appear-animated opacity-0 text-4xl font-bold text-slate-200 mt-2 mb-4">Get In Touch</h2>
        
        <p className="appear-animated opacity-0 text-slate-400 mb-10">
          My inbox is always open. Whether you have a question or just want to say hi, I&apos;ll try my best to get back to you!
        </p>
        
        <div className="appear-animated opacity-0">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col">
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                placeholder="Name"
              />
            </div>
            
            <div className="flex flex-col">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                placeholder="Email"
              />
            </div>
            
            <div className="flex flex-col">
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={5}
                className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none"
                placeholder="Message"
              />
            </div>
            
            <Button
              type="submit"
              className="px-6 py-3 h-auto font-mono bg-transparent border border-primary text-primary hover:bg-primary/10 rounded-lg"
            >
              Send Message
            </Button>
            
            {formStatus && (
              <p className="text-primary text-center animate-fade-in mt-4">
                {formStatus}
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
