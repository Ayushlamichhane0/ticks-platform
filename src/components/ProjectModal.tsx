import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Github } from 'lucide-react';
import { Project } from '../types/project';

interface ProjectModalProps {
  project: Project | null;
  onClose: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ project, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (project) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [project, onClose]);

  if (!project) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/90 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-[#0a0a0a] border border-white/20 p-6 sm:p-8 text-white font-mono-geist shadow-2xl"
        >
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-5 right-5 p-2 text-white/50 hover:text-white transition-all cursor-pointer border border-white/10"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Image */}
          <div className="relative aspect-video w-full overflow-hidden border border-white/10 mb-6 bg-black">
            <img
              src={project.image}
              alt={project.title}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
            <div className="absolute top-3 left-3 bg-black/90 text-white font-silkscreen px-3 py-1 text-[10px] uppercase tracking-widest border border-white/20">
              {project.categoryLabel}
            </div>
          </div>

          <div className="font-silkscreen text-[11px] uppercase tracking-widest text-white/50 mb-1">
            PROJECT SPECIFICATION
          </div>

          <h2 className="font-silkscreen text-xl sm:text-2xl text-white">
            {project.title}
          </h2>

          <p className="mt-3 font-inter text-xs sm:text-sm text-white/70 font-light leading-relaxed">
            {project.description}
          </p>

          <div className="mt-6 border-t border-white/10 pt-5">
            <span className="font-silkscreen text-[11px] uppercase tracking-wider text-white block mb-3">
              KEY HIGHLIGHTS
            </span>
            <ul className="space-y-2 text-xs text-white/80 font-inter">
              {project.highlights.map((h, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-white font-silkscreen">»</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Metrics */}
          <div className="mt-6 grid grid-cols-3 gap-2 bg-black border border-white/10 p-3 text-center">
            {project.metrics.map((m, idx) => (
              <div key={idx}>
                <div className="text-[9px] uppercase text-white/50">{m.label}</div>
                <div className="font-silkscreen text-sm sm:text-base font-bold text-white mt-0.5">
                  {m.value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-5 text-xs font-silkscreen">
            <button
              onClick={onClose}
              className="py-2.5 px-4 text-white/50 hover:text-white uppercase tracking-wider transition-opacity cursor-pointer"
            >
              Close
            </button>
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-5 border border-white/20 text-white hover:border-white uppercase tracking-wider transition-all flex items-center gap-1.5"
            >
              <Github className="h-3.5 w-3.5" />
              <span>View Source on GitHub</span>
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProjectModal;
