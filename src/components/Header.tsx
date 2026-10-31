import React, { useState } from 'react';
import { Sparkles, Menu, X } from 'lucide-react';

interface HeaderProps {
  onContactClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onContactClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#2A3B2C]/95 backdrop-blur-md border-b border-[#F7F3EB]/10 transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-12">
        {/* Brand with star logo matching the editorial reference */}
        <a
          href="/"
          className="group flex items-center gap-2.5 text-xl font-bold font-serif-display text-[#F7F3EB] tracking-wide"
        >
          <span className="text-[#FFB636] text-xl transition-transform duration-300 group-hover:rotate-45">✦</span>
          <span className="italic font-bold">Ayush Lamichhane</span>
          <span className="text-xs uppercase tracking-widest text-[#F7F3EB]/60 font-sans ml-1">· ticks.com.np</span>
        </a>

        {/* Desktop Editorial Navigation Links */}
        <nav
          aria-label="Editorial navigation"
          className="hidden md:flex items-center gap-8 text-sm font-medium text-[#F7F3EB]/90 font-sans"
        >
          <button
            onClick={() => scrollTo('about')}
            className="hover:text-[#FFB636] transition-colors cursor-pointer"
          >
            About me
          </button>
          <button
            onClick={() => scrollTo('skills')}
            className="hover:text-[#FFB636] transition-colors cursor-pointer"
          >
            Skills
          </button>
          <button
            onClick={() => scrollTo('projects')}
            className="hover:text-[#FFB636] transition-colors cursor-pointer"
          >
            Projects
          </button>
        </nav>

        {/* Vibrant Yellow/Orange Pill CTA matching reference */}
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={onContactClick}
            className="rounded-full bg-[#FFB636] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-black shadow-md hover:bg-[#ffc359] hover:scale-105 active:scale-95 transition-all cursor-pointer font-sans"
          >
            Get in touch!
          </button>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-[#F7F3EB] p-1.5 focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-[#F7F3EB]/15 bg-[#2A3B2C] px-6 py-5 md:hidden space-y-4 font-sans text-sm">
          <button
            onClick={() => scrollTo('about')}
            className="block w-full text-left py-2 text-[#F7F3EB] hover:text-[#FFB636]"
          >
            About me
          </button>
          <button
            onClick={() => scrollTo('skills')}
            className="block w-full text-left py-2 text-[#F7F3EB] hover:text-[#FFB636]"
          >
            Skills
          </button>
          <button
            onClick={() => scrollTo('projects')}
            className="block w-full text-left py-2 text-[#F7F3EB] hover:text-[#FFB636]"
          >
            Projects
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onContactClick?.();
            }}
            className="w-full text-center rounded-full bg-[#FFB636] py-3 text-xs font-bold uppercase tracking-wider text-black"
          >
            Get in touch!
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
