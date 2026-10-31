import { Project } from '../types/project';

export const PROJECTS: Project[] = [
  {
    id: 'trading-bot',
    title: 'AlgoNavigator: High-Frequency Trading Bot',
    tagline: 'Automated order execution engine & quantitative risk analytics',
    description:
      'A low-latency algorithmic trading platform built for cryptocurrency and equity tick streams. Features real-time Bollinger and VWAP signals, automated stop-loss guards, and simulated backtesting telemetry.',
    category: 'trading',
    categoryLabel: 'Algorithmic Trading',
    image: '/images/project_trading_bot_1793375322519.jpg',
    tags: ['TypeScript', 'WebSocket', 'Node.js', 'React', 'QuantLib'],
    metrics: [
      { label: 'Latency', value: '< 14ms' },
      { label: 'Win Rate', value: '68.4%' },
      { label: 'Sharpe Ratio', value: '1.85' },
    ],
    demoUrl: '#demo-trading-bot',
    githubUrl: 'https://github.com/ayush/algonavigator-bot',
    featured: true,
    highlights: [
      'Sub-20ms tick-to-trade signal pipeline',
      'Configurable risk parameters & dynamic position sizing',
      'Live candlestick streaming with WebSocket reconnection fallback',
    ],
  },
  {
    id: 'weather-app',
    title: 'MeteoSat: Atmospheric Weather Radar',
    tagline: 'Precision hyper-local forecasting with Doppler satellite overlay',
    description:
      'A responsive meteorology dashboard delivering real-time atmospheric telemetry, precipitation tracking, temperature curves, and satellite cloud layer compositing for cities across Nepal and worldwide.',
    category: 'apps',
    categoryLabel: 'Web Application',
    image: '/images/weather_radar_screen_1793380131175.jpg',
    tags: ['React', 'Tailwind CSS', 'OpenWeather API', 'Canvas GIS'],
    metrics: [
      { label: 'Accuracy', value: '98.2%' },
      { label: 'Refresh', value: '60s' },
      { label: 'Stations', value: '1,400+' },
    ],
    demoUrl: '#demo-weather-app',
    githubUrl: 'https://github.com/ayush/meteosat-weather',
    featured: true,
    highlights: [
      'Interactive 24-hour temperature curve with spline interpolation',
      'Severe weather alert push notifications and UV index monitoring',
      'Offline caching for instant radar access on low-bandwidth mobile',
    ],
  },
  {
    id: 'dev-toolkit',
    title: 'HyperAPI: Developer Benchmarking Suite',
    tagline: 'Microsecond latency analyzer & interactive JSON payload debugger',
    description:
      'An engineering workbench for testing REST endpoints, WebSocket feeds, and gRPC bridges. Provides p95/p99 latency distribution histograms, automated code smell inspection, and schema validation.',
    category: 'devtools',
    categoryLabel: 'Developer Tool',
    image: '/images/dev_terminal_desk_1793380677482.jpg',
    tags: ['React', 'TypeScript', 'Web Workers', 'Tailwind CSS'],
    metrics: [
      { label: 'p95 Latency', value: '45.2ms' },
      { label: 'Throughput', value: '1,250 req/s' },
      { label: 'Error Rate', value: '0.1%' },
    ],
    demoUrl: '#demo-dev-toolkit',
    githubUrl: 'https://github.com/ayush/hyperapi-workbench',
    featured: true,
    highlights: [
      'Concurrent load generator with virtual user throttling',
      'Pretty printer and zero-overhead JSON schema validator',
      'Automatic cURL and Fetch snippet code generation',
    ],
  },
  {
    id: 'ticker-stream',
    title: 'TickerPulse: Real-Time Market Feed',
    tagline: 'Live L2 orderbook visualizer and arbitrage spread scanner',
    description:
      'High-throughput financial visualization tool streaming raw level-2 tick orders from top global exchanges. Displays depth charts, bid-ask spreads, and cross-market price discrepancies.',
    category: 'trading',
    categoryLabel: 'Financial Tool',
    image: '/images/trading_desk_setup_1793380678038.jpg',
    tags: ['WebSockets', 'Chart.js', 'React', 'Tailwind CSS'],
    metrics: [
      { label: 'Tick Rate', value: '25,000/s' },
      { label: 'Order Depth', value: '200 levels' },
      { label: 'Uptime', value: '99.99%' },
    ],
    demoUrl: '#demo-ticker-pulse',
    githubUrl: 'https://github.com/ayush/ticker-pulse',
    featured: false,
    highlights: [
      'Real-time orderbook heatmaps with depth accumulation curves',
      'Cross-exchange arbitrage opportunity alerts',
      'Custom tick aggregation intervals (100ms, 250ms, 1s)',
    ],
  },
];
