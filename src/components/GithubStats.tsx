import React, { useState, useEffect } from 'react';
import { Github, Star, GitFork, GitCommit, ExternalLink, Code } from 'lucide-react';

interface RepoStat {
  name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  url: string;
}

export const GithubStats: React.FC = () => {
  const [repos] = useState<RepoStat[]>([
    {
      name: 'algonavigator-bot',
      description: 'High-frequency crypto & equity tick execution pipeline in TypeScript & WebSockets.',
      language: 'TypeScript',
      stars: 48,
      forks: 14,
      url: 'https://github.com/ayush/algonavigator-bot',
    },
    {
      name: 'meteosat-radar',
      description: 'Atmospheric satellite weather radar with Doppler overlay and canvas rendering.',
      language: 'TypeScript',
      stars: 32,
      forks: 9,
      url: 'https://github.com/ayush/meteosat-weather',
    },
    {
      name: 'hyperapi-benchmarker',
      description: 'Microsecond latency analyzer, WebSocket packet inspector, and REST benchmarking CLI.',
      language: 'Python',
      stars: 64,
      forks: 19,
      url: 'https://github.com/ayush/hyperapi-workbench',
    },
    {
      name: 'quant-chart-sim',
      description: 'High-frequency orderbook simulator with Level 2 market replay and depth visualization.',
      language: 'React',
      stars: 29,
      forks: 6,
      url: 'https://github.com/ayush/quant-chart-sim',
    },
  ]);

  const totalStars = repos.reduce((acc, r) => acc + r.stars, 0);
  const totalForks = repos.reduce((acc, r) => acc + r.forks, 0);

  return (
    <section id="github" className="w-full py-12 sm:py-16 border-b border-white/10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center font-mono-geist text-[11px] text-white/50 tracking-widest mb-6 pb-3 border-b border-white/10 uppercase gap-2">
        <span className="flex items-center gap-2 text-white">
          <Github className="w-4 h-4" />
          <span className="font-silkscreen text-white text-xs">04. GITHUB REPOSITORIES</span>
        </span>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"
        >
          <span>VIEW REPOSITORIES</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="bg-[#0a0a0a] border border-white/10 p-4">
          <div className="text-[10px] font-mono-geist text-white/50 uppercase">Total Stars</div>
          <div className="font-silkscreen text-2xl text-white mt-1 flex items-center gap-2">
            <Star className="w-4 h-4 text-white fill-white" />
            {totalStars}+
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/10 p-4">
          <div className="text-[10px] font-mono-geist text-white/50 uppercase">Forks</div>
          <div className="font-silkscreen text-2xl text-white mt-1 flex items-center gap-2">
            <GitFork className="w-4 h-4 text-white" />
            {totalForks}
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/10 p-4">
          <div className="text-[10px] font-mono-geist text-white/50 uppercase">Public Repos</div>
          <div className="font-silkscreen text-2xl text-white mt-1 flex items-center gap-2">
            <Code className="w-4 h-4 text-white" />
            18+
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/10 p-4">
          <div className="text-[10px] font-mono-geist text-white/50 uppercase">Annual Commits</div>
          <div className="font-silkscreen text-2xl text-white mt-1 flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-white" />
            720+
          </div>
        </div>
      </div>

      {/* Repos Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {repos.map((repo) => (
          <a
            key={repo.name}
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block bg-[#0a0a0a] hover:bg-[#111111] border border-white/10 hover:border-white p-5 transition-all"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-silkscreen text-sm text-white group-hover:underline">
                {repo.name}
              </span>
              <ArrowUpRight className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
            </div>

            <p className="font-inter text-xs text-white/60 leading-relaxed mb-4 line-clamp-2">
              {repo.description}
            </p>

            <div className="flex items-center justify-between font-mono-geist text-[10px] text-white/50 pt-3 border-t border-white/5">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white/70" />
                {repo.language}
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3" /> {repo.stars}
                </span>
                <span className="flex items-center gap-1">
                  <GitFork className="w-3 h-3" /> {repo.forks}
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};

function ArrowUpRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" />
    </svg>
  );
}

export default GithubStats;
