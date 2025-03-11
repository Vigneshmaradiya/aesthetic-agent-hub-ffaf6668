
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "#home", label: "Home", number: "01" },
  { href: "#about", label: "About", number: "02" },
  { href: "#skills", label: "Skills", number: "03" },
  { href: "#experience", label: "Experience", number: "04" },
  { href: "#education", label: "Education", number: "05" },
  { href: "#projects", label: "Projects", number: "06" },
  { href: "#contact", label: "Contact", number: "07" },
];

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      
      // Calculate which section is currently in view
      const sections = navLinks.map((link) => link.href.substring(1));
      const sectionElements = sections.map((id) => document.getElementById(id));
      
      const currentSection = sectionElements.findIndex((element) => {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return rect.top <= 100 && rect.bottom >= 100;
      });
      
      if (currentSection !== -1) {
        setActiveSection(sections[currentSection]);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = useCallback((sectionId: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(sectionId.substring(1));
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 80,
        behavior: "smooth",
      });
    }
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-300 ease-in-out ${
          isScrolled
            ? "py-3 backdrop-blur-xl bg-background/80 shadow-sm"
            : "py-5 bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <a 
              href="#home" 
              className="text-xl font-semibold tracking-tight transition-all hover:text-primary"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("#home");
              }}
            >
              <span className="text-gradient font-bold">VM</span>
            </a>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <ul className="flex items-center space-x-6">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection(link.href);
                      }}
                      className={`nav-link ${
                        activeSection === link.href.substring(1)
                          ? "nav-link-active"
                          : ""
                      }`}
                    >
                      <span className="nav-link-number">{link.number}.</span>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-10 h-10 rounded-full transition-all duration-300"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5 text-foreground" />
                ) : (
                  <Menu className="h-5 w-5 text-foreground" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 md:hidden pt-20 glass-effect"
          >
            <nav className="px-4 py-6">
              <ul className="flex flex-col space-y-4">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection(link.href);
                      }}
                      className={`block px-4 py-3 text-lg font-mono rounded-lg transition-all duration-200 ${
                        activeSection === link.href.substring(1)
                          ? "text-primary"
                          : "text-slate-400 hover:text-primary"
                      }`}
                    >
                      <span className="text-primary mr-2">{link.number}.</span>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
