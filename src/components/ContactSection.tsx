
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { GitHubIcon, LinkedInIcon, MailIcon } from "./SocialIcons";
import { Phone } from "lucide-react";

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
      className="section-spacing section-container"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="appear-animated opacity-0 inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Contact
          </span>
          <h2 className="appear-animated opacity-0 text-3xl md:text-4xl font-bold mb-4">
            Get In Touch
          </h2>
          <p className="appear-animated opacity-0 text-lg text-muted-foreground max-w-2xl mx-auto">
            Have a question or want to work together? Reach out to me directly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div className="appear-animated opacity-0 order-2 md:order-1">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors duration-200"
                  placeholder="Your name"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors duration-200"
                  placeholder="your.email@example.com"
                />
              </div>
              
              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors duration-200 resize-none"
                  placeholder="Your message..."
                />
              </div>
              
              <Button
                type="submit"
                className="w-full py-6 h-auto rounded-lg text-base font-medium"
              >
                Send Message
              </Button>
              
              {formStatus && (
                <p className="text-green-500 text-center animate-fade-in mt-4">
                  {formStatus}
                </p>
              )}
            </form>
          </div>
          
          <div className="appear-animated opacity-0 order-1 md:order-2">
            <div className="bg-card/50 border border-border p-6 md:p-8 rounded-xl">
              <h3 className="text-2xl font-bold mb-6">Contact Information</h3>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Phone</h4>
                    <p className="mt-1">+91-9104020130</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <MailIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Email</h4>
                    <a
                      href="mailto:maradiyavignesh@gmail.com"
                      className="mt-1 block hover:text-primary transition-colors duration-200"
                    >
                      maradiyavignesh@gmail.com
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <LinkedInIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-muted-foreground">LinkedIn</h4>
                    <a
                      href="https://linkedin.com/in/vignesh-maradiya"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block hover:text-primary transition-colors duration-200"
                    >
                      linkedin.com/in/vignesh-maradiya
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <GitHubIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-muted-foreground">GitHub</h4>
                    <a
                      href="https://github.com/Vigneshmaradiya"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block hover:text-primary transition-colors duration-200"
                    >
                      github.com/Vigneshmaradiya
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
