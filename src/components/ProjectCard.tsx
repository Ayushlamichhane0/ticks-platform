import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Github, Layers, ArrowRight } from 'lucide-react';
import { Project } from '../types/project';

interface ProjectCardProps {
  project: Project;
  onOpenDetails: (project: Project) => void;
  index: number;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onOpenDetails,
  index,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{
        duration: 0.35,
        delay: Math.min(index * 0.08, 0.3),
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{
        y: -4,
        scale: 1.012,
        transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
      }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 shadow-sm hover:border-slate-700 hover:shadow-xl hover:shadow-emerald-950/20 transition-all duration-200"
    >
      {/* Visual Media Header */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-950 border-b border-slate-800/80">
        {!imgError ? (
          <img
            src={project.image}
            alt={`${project.title} screenshot preview`}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 p-6 text-center">
            <Layers className="h-8 w-8 text-emerald-400 mb-2 opacity-80" />
            <span className="text-sm font-semibold text-slate-200">{project.title}</span>
            <span className="text-xs text-slate-500 mt-1">{project.categoryLabel}</span>
          </div>
        )}

        {/* Quiet category marker - unboxed subtle text */}
        <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-sm px-2.5 py-1 rounded text-xs font-medium text-slate-300 border border-slate-800">
          {project.categoryLabel}
        </div>
      </div>

      {/* Card Content Area */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {/* Unboxed Metadata Line */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2.5 font-medium">
          <span>{project.category.toUpperCase()}</span>
          <span aria-hidden="true">·</span>
          <span>Ayush</span>
          <span aria-hidden="true">·</span>
          <span>Production</span>
        </div>

        {/* Project Title */}
        <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
          {project.title}
        </h3>

        {/* Project Tagline */}
        <p className="mt-1 text-xs font-medium text-emerald-400/90 line-clamp-1">
          {project.tagline}
        </p>

        {/* Project Description */}
        <p className="mt-3 text-sm text-slate-300 leading-relaxed line-clamp-3">
          {project.description}
        </p>

        {/* Key Metrics Strip (Tabular Figures) */}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/60 text-center">
          {project.metrics.map((m, i) => (
            <div key={i} className="flex flex-col">
              <span className="text-[11px] text-slate-400">{m.label}</span>
              <span className="text-xs font-bold text-slate-100 font-mono tabular-nums">
                {m.value}
              </span>
            </div>
          ))}
        </div>

        {/* Tech Stack List - Clean unboxed text list */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap gap-1.5 items-center text-xs text-slate-400">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 mr-1">Stack:</span>
          {project.tags.map((tag, i) => (
            <span key={tag} className="inline-flex items-center text-slate-300 text-[11px] font-mono">
              {tag}
              {i < project.tags.length - 1 && <span className="text-slate-600 ml-1.5 mr-0.5">·</span>}
            </span>
          ))}
        </div>

        {/* Card Footer Actions */}
        <div className="mt-6 pt-3 flex items-center justify-between gap-3 border-t border-slate-800/80">
          <button
            onClick={() => onOpenDetails(project)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
          >
            <span>View Architecture</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-center gap-2">
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View ${project.title} source on GitHub`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
            >
              <Github className="h-3.5 w-3.5" />
            </a>
            <button
              onClick={() => onOpenDetails(project)}
              aria-label={`Open preview for ${project.title}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
};
