import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Phone,
  Mail,
  Github,
  Globe,
  Code2,
  Cpu,
  Layers,
  Zap,
  Check,
  ExternalLink,
  ArrowDown
} from 'lucide-react';

interface FramerPortfolioCardProps {
  onExploreProjects: () => void;
  onContactClick: () => void;
}

export const FramerPortfolioCard: React.FC<FramerPortfolioCardProps> = ({
  onExploreProjects,
  onContactClick,
}) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeSkill, setActiveSkill] = useState<string | null>('React & Next.js');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const skills = [
    {
      id: 'react',
      name: 'React 19 / Next.js',
      category: 'Frontend & UI',
      icon: '⚛️',
      desc: 'High-performance reactive interfaces and state orchestration',
    },
    {
      id: 'typescript',
      name: 'TypeScript',
      category: 'Language',
      icon: 'TS',
      desc: 'Strict type safety across full-stack applications',
    },
    {
      id: 'python',
      name: 'Python / Quant',
      category: 'Algorithms',
      icon: '🐍',
      desc: 'Trading strategies, statistical modeling & backtesting',
    },
    {
      id: 'websockets',
      name: 'WebSockets & APIs',
      category: 'Networking',
      icon: '⚡',
      desc: 'Low-latency tick streams, multiplexing & market feeds',
    },
    {
      id: 'tailwind',
      name: 'Tailwind CSS',
      category: 'Styling',
      icon: '🎨',
      desc: 'Modern utility-first responsive layouts & design systems',
    },
    {
      id: 'nodejs',
      name: 'Node.js / Express',
      category: 'Backend',
      icon: '🟢',
      desc: 'High-concurrency servers, proxies & microservices',
    },
  ];

  return (
    <div className="w-full">
      {/* Outer Framer Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[28px] sm:rounded-[36px] bg-[#EAEAEA] p-5 sm:p-8 lg:p-10 text-slate-900 shadow-2xl shadow-black/40 border border-slate-300/80"
      >
        {/* Subtle grid texture overlay for tactile feel */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #000000 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Peeking 3D character on far-right edge (matching template reference) */}
        <div className="pointer-events-none absolute right-0 top-16 hidden lg:block select-none opacity-90 transition-transform duration-300 hover:scale-105">
          <img
            src="/assets/aistudio/character_standing_clean.png"
            alt="3D Character"
            className="h-56 w-auto object-contain object-right drop-shadow-md"
          />
        </div>

        {/* Main 3-Column Framer Layout */}
        <div className="relative z-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-8 items-start">
          
          {/* COLUMN 1: Pixel Avatar Card (Left, span 4) */}
          <div className="lg:col-span-4 flex flex-col items-center sm:items-start">
            <div className="group relative w-full max-w-[280px] sm:max-w-[320px] lg:max-w-none overflow-hidden rounded-[24px] border-[3px] border-slate-900/10 bg-slate-900 shadow-md">
              <img
                src="/assets/aistudio/pixel_avatar.png"
                alt="Ayush - Pixel Art Avatar"
                className="w-full h-auto aspect-[215/422] object-cover transition-transform duration-300 group-hover:scale-105"
              />
              
              {/* Subtle overlay badge */}
              <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-slate-950/85 backdrop-blur-md px-3 py-2 text-white border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold leading-none">Ayush</div>
                  <div className="text-[10px] text-emerald-400 font-mono mt-0.5">ticks.com.np</div>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                  <span>Kathmandu</span>
                </div>
              </div>
            </div>

            {/* Quick quick CTA on mobile/tablet */}
            <div className="mt-4 flex w-full max-w-[320px] items-center justify-between gap-2 text-xs font-semibold">
              <button
                onClick={onExploreProjects}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-950 py-2.5 px-3 text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span>View Projects</span>
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onContactClick}
                className="inline-flex items-center justify-center rounded-xl border border-slate-400 bg-white/80 py-2.5 px-3 text-slate-900 hover:bg-white transition-colors cursor-pointer"
              >
                Get in Touch
              </button>
            </div>
          </div>

          {/* COLUMN 2: Hello! & Education (Center, span 4) */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-8">
            {/* Top: Hello! Heading & Bio */}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-950">
                  Hello!
                </h1>
                <div className="relative">
                  <motion.img
                    animate={{ rotate: [0, 10, -10, 8, -4, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 3 }}
                    src="/assets/aistudio/avatar_waving.png"
                    alt="Waving Avatar"
                    className="h-11 w-11 rounded-full object-cover shadow-sm border border-slate-300 bg-white"
                  />
                </div>
              </div>

              {/* Personalized Real Front Text (Replaces Lorem Ipsum) */}
              <div className="mt-4 space-y-3 text-xs sm:text-[13px] leading-relaxed text-slate-700 font-medium">
                <p>
                  I am <strong className="text-slate-950 font-bold">Ayush</strong>, a full-stack engineer and quantitative developer based in Nepal. Creator of <strong className="text-slate-950 font-bold">ticks.com.np</strong> — a dedicated hub for smart trading tools, low-latency market algorithms, and developer utilities.
                </p>
                <p>
                  Specializing in real-time WebSocket pipelines, high-precision financial chart telemetries, and modern reactive web applications that perform under intense workloads.
                </p>
                <p className="font-semibold text-slate-900 pt-1">
                  Hope you enjoy my portfolio and smart tools!
                </p>
              </div>
            </div>

            {/* Bottom: Education Section */}
            <div className="pt-2">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">
                Education
              </h2>
              
              <div className="mt-3 space-y-1 text-xs sm:text-[13px]">
                <div className="font-bold text-slate-900 leading-snug">
                  Tribhuvan University (IOE)
                </div>
                <div className="text-slate-700 font-medium">
                  Bachelor of Computer Engineering <span className="text-slate-400">|</span> 2020 – 2024
                </div>
                <p className="text-slate-600 text-xs mt-1 leading-normal">
                  Graduate with focus on Distributed Systems, Quantitative Architectures, and Network Telemetry.
                </p>
              </div>
            </div>
          </div>

          {/* COLUMN 3: Skills & Experience (Right, span 4) */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-8 lg:pr-10">
            {/* Top: Skills Section with Interactive Dark Square Tiles */}
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  Skills
                </h2>
                {activeSkill && (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                    {activeSkill}
                  </span>
                )}
              </div>

              {/* 6 Dark Square Tiles matching the reference template */}
              <div className="mt-3.5 grid grid-cols-3 gap-2.5 max-w-[210px]">
                {skills.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => setActiveSkill(skill.name)}
                    onMouseEnter={() => setActiveSkill(skill.name)}
                    title={`${skill.name} (${skill.category})`}
                    className={`group relative flex h-14 w-14 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm transition-all duration-200 cursor-pointer ${
                      activeSkill === skill.name
                        ? 'ring-2 ring-emerald-500 scale-105 bg-slate-950'
                        : 'hover:scale-105 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-sm font-bold font-mono tracking-tighter">
                      {skill.icon}
                    </span>
                  </button>
                ))}
              </div>

              {/* Selected skill quick info */}
              <div className="mt-2 text-[11px] text-slate-600 font-medium">
                {skills.find((s) => s.name === activeSkill)?.desc || 'Click any skill tile to inspect details.'}
              </div>
            </div>

            {/* Bottom: Experience Section */}
            <div className="pt-2">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">
                Experience
              </h2>

              <div className="mt-3 space-y-3.5 text-xs sm:text-[13px]">
                {/* Timeline Item 1 */}
                <div>
                  <div className="font-mono text-[11px] font-bold text-slate-900 tracking-wider">
                    2024 – 2025
                  </div>
                  <div className="text-slate-800 font-semibold text-xs mt-0.5">
                    Quantitative Developer &amp; Systems Engineer
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600 leading-normal">
                    Engineered automated order execution pipelines, quantitative backtesting algorithms, and tick stream monitors with sub-15ms latency.
                  </p>
                </div>

                {/* Timeline Item 2 */}
                <div>
                  <div className="font-mono text-[11px] font-bold text-emerald-800 tracking-wider">
                    2025 – Present
                  </div>
                  <div className="text-slate-900 font-semibold text-xs mt-0.5">
                    Lead Developer &amp; Founder @ ticks.com.np
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600 leading-normal">
                    Architecting real-time market visualization tools, atmospheric Doppler weather radars, and developer API benchmarking suites.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: Black Pill Contact Badges matching the reference template */}
        <div className="relative z-10 mt-10 pt-6 border-t border-slate-300/80">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-3">
            {/* Phone Pill */}
            <button
              onClick={() => copyToClipboard('+977 9801234567', 'Phone')}
              title="Click to copy phone number"
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
            >
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20">
                <Phone className="h-2.5 w-2.5 text-white" />
              </div>
              <span className="font-mono tabular-nums text-[11px]">
                {copiedText === 'Phone' ? 'Copied to Clipboard!' : '+977 9801234567'}
              </span>
            </button>

            {/* Email Pill */}
            <a
              href="mailto:ayushlamichhane105@gmail.com"
              title="Send email to Ayush"
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800 active:scale-95 transition-all"
            >
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20">
                <Mail className="h-2.5 w-2.5 text-white" />
              </div>
              <span className="text-[11px]">ayushlamichhane105@gmail.com</span>
            </a>

            {/* GitHub Pill */}
            <a
              href="https://github.com/ayush"
              target="_blank"
              rel="noopener noreferrer"
              title="View Ayush on GitHub"
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800 active:scale-95 transition-all"
            >
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20">
                <Github className="h-2.5 w-2.5 text-white" />
              </div>
              <span className="text-[11px]">github.com/ayush</span>
            </a>

            {/* Domain Pill */}
            <a
              href="https://ticks.com.np"
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800 active:scale-95 transition-all"
            >
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20">
                <Globe className="h-2.5 w-2.5 text-white" />
              </div>
              <span className="text-[11px] font-mono">ticks.com.np</span>
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
