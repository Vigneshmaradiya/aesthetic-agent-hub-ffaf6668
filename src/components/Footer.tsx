
import { GitHubIcon, LinkedInIcon, MailIcon } from "./SocialIcons";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-8 text-center">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center space-y-6">
          <div className="flex items-center space-x-6">
            <a
              href="https://linkedin.com/in/vignesh-maradiya"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-primary transition-all duration-300"
              aria-label="LinkedIn"
            >
              <LinkedInIcon className="h-5 w-5" />
            </a>
            <a
              href="https://github.com/Vigneshmaradiya"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-primary transition-all duration-300"
              aria-label="GitHub"
            >
              <GitHubIcon className="h-5 w-5" />
            </a>
            <a
              href="mailto:maradiyavignesh@gmail.com"
              className="text-slate-400 hover:text-primary transition-all duration-300"
              aria-label="Email"
            >
              <MailIcon className="h-5 w-5" />
            </a>
          </div>
          
          <a 
            href="https://github.com/Vigneshmaradiya" 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-mono text-xs text-slate-500 hover:text-primary transition-colors"
          >
            Designed & Built by Vignesh Maradiya
          </a>
          
          <p className="text-slate-600 text-xs font-mono">
            &copy; {currentYear} All Rights Reserved
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
