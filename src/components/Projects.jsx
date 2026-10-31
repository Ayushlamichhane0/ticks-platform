import React, { useState } from 'react';
import { Github, ArrowUpRight } from 'lucide-react';
import { PROJECTS } from '../data/projects';

export const Projects = ({ onOpenDetails }) => {
  const [filter, setFilter] = useState('all');

  const filtered =
    filter === 'all' ? PROJECTS : PROJECTS.filter((p) => p.category === filter);

  return (
    <section id="projects" className="w-full py-12 sm:py-16 border-b border-white/10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center font-mono-geist text-[10px] text-white/40 tracking-[0.2em] mb-8 pb-3 border-b border-white/10 uppercase gap-2">
        <span className="font-silkscreen text-xs text-white">03. QUANTITATIVE SYSTEMS</span>
        <span>PRODUCTION ENGINES // OPEN SOURCE</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h2 className="font-silkscreen text-2xl sm:text-3xl text-white uppercase tracking-tight">
            ENGINEERING WORKBENCH
          </h2>
          <p className="font-inter text-sm text-white/60 mt-2 font-light max-w-xl">
            Real-time execution engines, Doppler radar visualizers, and latency benchmarking suites.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 font-silkscreen text-[11px] uppercase tracking-wider">
          {['all', 'trading', 'devtools', 'apps'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`py-2 px-3.5 border transition-all cursor-pointer ${
                filter === cat
                  ? 'bg-white text-black border-white font-bold'
                  : 'bg-[#0a0a0a] text-white/60 border-white/10 hover:border-white hover:text-white'
              }`}
            >
              {cat === 'all' ? 'ALL' : cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((project) => (
          <div
            key={project.id}
            className="group flex flex-col justify-between bg-[#0a0a0a] border border-white/15 hover:border-white p-6 sm:p-7 transition-all duration-300"
          >
            <div>
              <div className="flex justify-between items-center font-mono-geist text-[10px] text-white/50 tracking-wider uppercase mb-4 pb-2 border-b border-white/10">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-white rounded-full" />
                  {project.categoryLabel}
                </span>
                <span>TICKS // {project.id.toUpperCase()}</span>
              </div>

              <h3 className="font-silkscreen text-base sm:text-lg text-white group-hover:underline tracking-tight mb-2">
                {project.title}
              </h3>
              <p className="font-inter text-xs sm:text-sm text-white/65 leading-relaxed font-light mb-5">
                {project.tagline}
              </p>

              <div
                onClick={() => onOpenDetails(project)}
                className="relative aspect-video w-full overflow-hidden border border-white/10 bg-black mb-5 cursor-pointer"
              >
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover object-center grayscale contrast-125 group-hover:grayscale-0 group-hover:scale-102 transition-all duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 pointer-events-none" />
                <div className="absolute bottom-2.5 right-2.5 font-silkscreen text-[9px] bg-black/90 text-white px-2 py-1 border border-white/20">
                  CLICK TO INSPECT
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/10 mb-4 font-mono-geist">
                {project.metrics.map((m) => (
                  <div key={m.label} className="text-center sm:text-left">
                    <div className="text-[9px] text-white/40 uppercase">{m.label}</div>
                    <div className="font-silkscreen text-xs text-white font-bold mt-0.5">{m.value}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5 font-mono-geist text-[10px] text-white/50 mb-6">
                {project.tags.map((t) => (
                  <span key={t} className="bg-white/5 border border-white/10 px-2 py-0.5">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10 font-mono-geist text-xs">
              <button
                onClick={() => onOpenDetails(project)}
                className="font-silkscreen text-xs text-white hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <span>SPECIFICATIONS</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>

              <div className="flex items-center gap-4">
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white transition-colors"
                  title="Source Code"
                  aria-label="View source code on GitHub"
                >
                  <Github className="h-4 w-4" />
                </a>

                <button
                  onClick={() => onOpenDetails(project)}
                  className="py-1 px-2.5 bg-white/10 hover:bg-white hover:text-black font-silkscreen text-[10px] text-white transition-colors cursor-pointer"
                >
                  LIVE DEMO
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Projects;
