
import { GitHubIcon, LinkedInIcon, MailIcon } from "./SocialIcons";
import { ThemeToggle } from "./ThemeToggle";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-secondary/30 dark:bg-secondary/10 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center">
          <div className="flex items-center space-x-6 mb-8">
            <a
              href="https://linkedin.com/in/vignesh-maradiya"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary transition-colors duration-300"
              aria-label="LinkedIn"
            >
              <LinkedInIcon className="h-5 w-5" />
            </a>
            <a
              href="https://github.com/Vigneshmaradiya"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary transition-colors duration-300"
              aria-label="GitHub"
            >
              <GitHubIcon className="h-5 w-5" />
            </a>
            <a
              href="mailto:maradiyavignesh@gmail.com"
              className="text-foreground hover:text-primary transition-colors duration-300"
              aria-label="Email"
            >
              <MailIcon className="h-5 w-5" />
            </a>
            <ThemeToggle />
          </div>
          
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              &copy; {currentYear} Vignesh Maradiya. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
