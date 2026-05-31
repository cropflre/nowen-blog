import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BookOpen, Languages, LogIn, Menu, Moon, Settings, Sun, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

function GithubMark({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.79-.26.79-.58v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49.99.11-.77.42-1.3.76-1.6-2.66-.31-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23.96-.27 1.98-.4 3-.4s2.05.13 3 .4c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.19.69.8.58A12.01 12.01 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

const slides = [
  {
    id: 1,
    title: 'Building Systems',
    subtitle: 'that scale',
    description: 'Go backend, React frontend, practical tooling.',
    gradient: 'from-blue-500 to-cyan-400',
  },
  {
    id: 2,
    title: 'Open Source',
    subtitle: 'contributions',
    description: 'Sharing code that matters to the community.',
    gradient: 'from-emerald-500 to-teal-400',
  },
  {
    id: 3,
    title: 'Clean Code',
    subtitle: 'quiet interfaces',
    description: 'Documentation that stays readable.',
    gradient: 'from-violet-500 to-purple-400',
  },
];

export default function HeroRefactor() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const navLinks = [
    { path: '/', label: t('nav.home') },
    { path: '/blog', label: t('nav.blog') },
    { path: '/projects', label: t('nav.projects') },
  ];

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <section className="border-b border-[var(--color-border-surface)]">
      <header className="minimal-nav fixed inset-x-0 top-0 z-50">
        <nav className="page-shell flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="grid h-7 w-7 place-items-center rounded-full border border-[var(--color-border)] text-xs">N</span>
            nowen-blog
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => {
              const active = link.path === '/' ? location.pathname === '/' : location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm transition-colors ${
                    active ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated && (
              <Link to="/admin" className="minimal-button h-9 min-h-9 w-9 p-0" aria-label="Admin">
                <Settings size={16} />
              </Link>
            )}
            <Link to="/login" className="minimal-button h-9 min-h-9 w-9 p-0" aria-label="Login">
              <LogIn size={16} />
            </Link>
            <a href="https://github.com/cropflre" target="_blank" rel="noopener noreferrer" className="minimal-button h-9 min-h-9 w-9 p-0" aria-label="GitHub">
              <GithubMark />
            </a>
            <button type="button" onClick={toggleTheme} className="minimal-button h-9 min-h-9 w-9 p-0" aria-label={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button type="button" onClick={() => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')} className="minimal-button h-9 min-h-9 w-9 p-0" aria-label="Switch language">
              <Languages size={16} />
            </button>
          </div>

          <button type="button" className="minimal-button h-9 min-h-9 w-9 p-0 md:hidden" onClick={() => setMobileOpen((open) => !open)} aria-label="Toggle menu">
            {mobileOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </nav>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-[var(--color-border-surface)] bg-[var(--color-bg-primary)] md:hidden"
            >
              <div className="page-shell flex flex-col py-4">
                {navLinks.map((link) => (
                  <Link key={link.path} to={link.path} className="py-3 text-sm font-medium">
                    {link.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <div className="page-shell flex min-h-[78vh] items-center justify-center pt-28 pb-20">
        <div className="relative w-full max-w-4xl">
          {/* Slides */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                <span className={`bg-gradient-to-r ${slides[currentSlide].gradient} bg-clip-text text-transparent`}>
                  {slides[currentSlide].title}
                </span>
                <br />
                <span className="text-[var(--color-text-muted)]">{slides[currentSlide].subtitle}</span>
              </h1>
              <p className="mt-6 text-lg text-[var(--color-text-secondary)] max-w-xl mx-auto">
                {slides[currentSlide].description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight size={20} />
          </button>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-10">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentSlide
                    ? 'bg-[var(--color-accent)] w-6'
                    : 'bg-[var(--color-border-surface)] hover:bg-[var(--color-text-muted)]'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex justify-center gap-4 mt-10">
            <Link to="/projects" className="minimal-button-primary">
              {t('hero.cta.viewProjects')}
              <ArrowRight size={16} />
            </Link>
            <Link to="/blog" className="minimal-button">
              <BookOpen size={16} />
              {t('hero.cta.readBlog')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}


