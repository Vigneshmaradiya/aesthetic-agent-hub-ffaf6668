"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { name: "About", url: "#about" },
  { name: "Education", url: "#education" },
  { name: "Experience", url: "#experience" },
  { name: "Work", url: "#projects" },
  { name: "Contact", url: "#contact" },
];

const RESUME_URL =
  "https://bsxuihpqbteiynloucnx.supabase.co/storage/v1/object/sign/Resume/My_Resume.pdf?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJSZXN1bWUvTXlfUmVzdW1lLnBkZiIsImlhdCI6MTc0MTcxOTk3MCwiZXhwIjoyMDU3MDc5OTcwfQ.17Dkej4dDf96ii9hXqUL_KR8-03fIE-hGDRiyRNeEzw";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <header
      className={`fixed top-0 z-50 w-full px-6 md:px-12 transition-all duration-300 ease-bc ${
        scrolled
          ? "h-[70px] bg-navy/90 backdrop-blur-md shadow-[0_10px_30px_-10px_rgba(2,12,27,0.7)]"
          : "h-[100px] bg-transparent"
      }`}
    >
      <nav className="flex h-full items-center justify-between max-w-[1600px] mx-auto">
        {/* Logo */}
        <motion.a
          href="#"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="text-green font-mono text-xl font-bold z-10"
        >
          {"</>"}
        </motion.a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link, i) => (
            <motion.a
              key={link.name}
              href={link.url}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="px-3 py-2 font-mono text-[13px] text-slate-light hover:text-green transition-colors duration-200"
            >
              <span className="text-green mr-[2px]">0{i + 1}.</span>
              {link.name}
            </motion.a>
          ))}
          <motion.a
            href={RESUME_URL}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="ml-3 rounded border border-green px-4 py-2 font-mono text-[13px] text-green transition-all duration-200 hover:bg-green/10"
          >
            Resume
          </motion.a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="relative z-10 md:hidden flex flex-col gap-[6px] p-2"
          aria-label="Menu"
        >
          <span
            className={`block h-[2px] w-7 bg-green transition-all duration-300 ${
              mobileOpen ? "rotate-45 translate-y-[8px]" : ""
            }`}
          />
          <span
            className={`block h-[2px] w-7 bg-green transition-all duration-300 ${
              mobileOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block h-[2px] w-7 bg-green transition-all duration-300 ${
              mobileOpen ? "-rotate-45 -translate-y-[8px]" : ""
            }`}
          />
        </button>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-navy/80 backdrop-blur-sm md:hidden"
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "tween", duration: 0.3 }}
                className="fixed top-0 right-0 bottom-0 w-[min(75vw,400px)] bg-navy-light shadow-[-10px_0_30px_-15px_rgba(2,12,27,0.7)] flex flex-col items-center justify-center gap-6 md:hidden"
              >
                {navLinks.map((link, i) => (
                  <a
                    key={link.name}
                    href={link.url}
                    onClick={() => setMobileOpen(false)}
                    className="font-mono text-sm text-slate-lightest hover:text-green transition-colors flex flex-col items-center gap-1"
                  >
                    <span className="text-green text-xs">0{i + 1}.</span>
                    {link.name}
                  </a>
                ))}
                <a
                  href={RESUME_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="big-button mt-4"
                >
                  Resume
                </a>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
