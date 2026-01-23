'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, Zap, Bot, Coins, Eye, Globe, Shield, Sparkles, ChevronRight } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    setIsLoading(true);
    router.push(`/canvas?prompt=${encodeURIComponent(prompt)}`);
  };

  const examples = [
    { query: "What's the current price of BTC?", icon: Coins },
    { query: "Find upcoming tech conferences in 2026", icon: Globe },
    { query: "Search GitHub for AI agent frameworks", icon: Bot },
  ];

  const features = [
    {
      icon: Bot,
      title: 'Intelligent Orchestration',
      description: 'ADK-powered agents collaborate seamlessly, with full observability into every decision.',
    },
    {
      icon: Coins,
      title: 'Micropayment Economics',
      description: 'x402 protocol enables pay-per-call pricing. Every tool invocation is metered on Cronos.',
    },
    {
      icon: Eye,
      title: 'Visual Workflow Canvas',
      description: 'Watch your agents work in real-time with an interactive node-based execution view.',
    },
    {
      icon: Sparkles,
      title: 'A2UI: Generative Interface',
      description: 'Agents dynamically build interactive UIs tailored to your request and results.',
    },
  ];

  const stats = [
    { value: '50+', label: 'MCP Tools' },
    { value: '<2s', label: 'Avg Response' },
    { value: '0.01', label: 'TCRO/Call' },
  ];

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 px-4 sm:px-6">
        {/* Background gradient */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-[var(--accent)]/10 via-transparent to-transparent blur-3xl opacity-60" />
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* Status Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Live on Cronos Testnet
              </span>
            </div>
          </div>

          {/* Headline */}
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-4">
              <span className="text-[var(--text-primary)]">The Future of</span>
              <br />
              <span className="bg-gradient-to-r from-[var(--accent)] via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                AI Agent Commerce
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
              Visual multi-agent workflows with real-time observability and
              micropayments. Pay for what you use, see what you're paying for.
            </p>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-8 md:gap-16 mb-10">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">{stat.value}</div>
                <div className="text-xs md:text-sm text-[var(--text-tertiary)] uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Prompt Input */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-6">
            <div className="relative group">
              <input
                type="text"
                placeholder="Ask the agents anything..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isLoading}
                className="w-full h-14 md:h-16 pl-5 pr-14 rounded-2xl text-base md:text-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                autoFocus
              />
              <Button
                type="submit"
                disabled={!prompt.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 md:h-12 px-4 md:px-6 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <span className="hidden md:inline mr-2">Run</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>

          {/* Example Queries */}
          <div className="flex flex-wrap justify-center gap-2">
            {examples.map((example) => (
              <button
                key={example.query}
                onClick={() => setPrompt(example.query)}
                className="group flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-tertiary)] hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)] transition-all"
              >
                <example.icon size={14} className="text-[var(--accent)] opacity-60 group-hover:opacity-100" />
                <span className="hidden sm:inline">{example.query}</span>
                <span className="sm:hidden">{example.query.slice(0, 25)}...</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 px-4 sm:px-6 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 text-[var(--text-primary)]">
              Built for Serious Work
            </h2>
            <p className="text-[var(--text-secondary)] max-w-xl mx-auto text-sm md:text-base">
              Not another chatbot. A complete platform for building, running,
              and monetizing AI agent workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="group bg-[var(--bg-secondary)] border-[var(--border)] hover:border-[var(--border-strong)] transition-all"
              >
                <CardHeader className="flex flex-row items-start gap-4 pb-2">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0 group-hover:bg-[var(--accent)]/10 transition-colors">
                    <feature.icon className="w-5 h-5 md:w-6 md:h-6 text-[var(--accent)]" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base md:text-lg text-[var(--text-primary)]">
                      {feature.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 px-4 sm:px-6 border-t border-[var(--border)]">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] border-[var(--border)] overflow-hidden">
            <CardContent className="p-8 md:p-12 text-center relative">
              {/* Subtle glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 to-transparent pointer-events-none" />

              <div className="relative">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center mx-auto mb-6">
                  <Zap className="w-7 h-7 md:w-8 md:h-8 text-[var(--accent)]" />
                </div>

                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 text-[var(--text-primary)]">
                  Ready to Build?
                </h2>
                <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto text-sm md:text-base">
                  Connect your wallet and start running pay-per-request AI workflows
                  on Cronos Testnet. No subscription, no commitment.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    onClick={() => router.push('/canvas')}
                    className="w-full sm:w-auto bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-8 py-3 text-base font-medium"
                  >
                    Launch Canvas
                    <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/ledger')}
                    className="w-full sm:w-auto border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] px-6 py-3"
                  >
                    View Ledger
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 md:py-10 px-4 sm:px-6 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-teal-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" fill="currentColor" />
            </div>
            <span className="text-sm text-[var(--text-secondary)]">
              © 2026 Agents of Truth
            </span>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <span className="text-xs uppercase tracking-wider text-[var(--text-quaternary)]">
              Powered by
            </span>
            <div className="flex items-center gap-4 opacity-50 hover:opacity-70 transition-opacity">
              <Image src="/cronos-logo.svg" alt="Cronos" width={72} height={20} />
              <Image src="/x402-logo.png" alt="x402" width={40} height={16} />
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
