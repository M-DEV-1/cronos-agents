'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowRight,
  Zap,
  Bot,
  Coins,
  Eye,
  Globe,
  Shield,
  Sparkles,
  ChevronRight,
  Activity,
  Workflow,
  CreditCard,
  Cpu
} from 'lucide-react';
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

  const features = [
    {
      icon: Workflow,
      title: 'Intelligent Orchestration',
      description: 'ADK-powered agents collaborate seamlessly, with full observability into every decision node.',
    },
    {
      icon: Coins,
      title: 'Micropayment Economics',
      description: 'x402 protocol enables pay-per-call pricing. No subscriptions, just pure utility metering.',
    },
    {
      icon: Eye,
      title: 'Deep Observability',
      description: 'Watch your agents think in real-time with an interactive node-based execution canvas.',
    },
    {
      icon: Sparkles,
      title: 'Generative Interface',
      description: 'Agents dynamically construct bespoke UI components tailored to your specific workflow needs.',
    },
  ];

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] overflow-x-hidden selection:bg-[var(--accent)]/30">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-48 md:pb-32 px-4 sm:px-6 overflow-hidden">

        {/* Background Ambient */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] md:w-[1000px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(59,138,140,0.15)_0%,transparent_70%)] blur-3xl opacity-80" />
        </div>

        {/* Decorative Floating Cards (Visual Only) */}
        <div className="absolute inset-0 max-w-7xl mx-auto pointer-events-none hidden lg:block">
          {/* Top Left: Execution Node */}
          <div className="absolute top-32 left-10 w-64 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/40 backdrop-blur-sm -rotate-6 shadow-2xl opacity-60 animate-float-slow">
            <div className="flex items-center gap-3 mb-3 border-b border-[var(--border)] pb-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/20 flex items-center justify-center">
                <Activity size={16} className="text-[var(--accent)]" />
              </div>
              <div>
                <div className="h-2 w-24 bg-[var(--border-strong)] rounded-full mb-1.5" />
                <div className="h-1.5 w-16 bg-[var(--border)] rounded-full" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-1.5 w-full bg-[var(--border)] rounded-full opacity-50" />
              <div className="h-1.5 w-4/5 bg-[var(--border)] rounded-full opacity-50" />
            </div>
          </div>

          {/* Bottom Right: Payment/Receipt */}
          <div className="absolute top-1/2 right-10 w-56 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/40 backdrop-blur-sm rotate-3 shadow-2xl opacity-60 translate-y-12 animate-float-delayed">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 rounded-full bg-[var(--success)]/10 flex items-center justify-center">
                <CreditCard size={14} className="text-[var(--success)]" />
              </div>
              <div className="h-4 w-12 bg-[var(--border)] rounded-md opacity-50" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <div className="h-2 w-16 bg-[var(--border-strong)] rounded-full" />
                <div className="h-2 w-8 bg-[var(--border-strong)] rounded-full" />
              </div>
              <div className="flex justify-between">
                <div className="h-2 w-20 bg-[var(--border-strong)] rounded-full" />
                <div className="h-2 w-10 bg-[var(--border-strong)] rounded-full" />
              </div>
              <div className="h-px w-full bg-[var(--border)] my-2" />
              <div className="flex justify-between">
                <div className="h-2 w-12 bg-[var(--border-strong)] rounded-full opacity-50" />
                <div className="h-2 w-12 bg-[var(--accent)] rounded-full opacity-80" />
              </div>
            </div>
          </div>

          {/* Top Right: Agent Avatar */}
          <div className="absolute top-24 right-24 w-16 h-16 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-xl rotate-12 flex items-center justify-center opacity-40 animate-pulse-slow">
            <Bot size={24} className="text-[var(--text-secondary)]" />
          </div>
        </div>

        <div className="relative max-w-3xl mx-auto text-center z-10">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] shadow-sm mb-8 backdrop-blur-md hover:border-[var(--accent)]/50 transition-colors cursor-default">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--success)]"></span>
            </span>
            <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Live on Cronos Testnet
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] md:leading-[1.05] mb-6 text-[var(--text-primary)]">
            <span className="block text-[var(--text-primary)]">The Future of</span>
            <span className="block bg-gradient-to-r from-[var(--text-primary)] via-[var(--accent)] to-[var(--text-primary)] bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient pb-2">
              Agentic Commerce
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg md:text-xl text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed mb-10 px-4">
            Visual multi-agent workflows with real-time observability and verifiable micropayments.
          </p>

          {/* Prompt Input Interaction */}
          <div className="max-w-xl mx-auto mb-12 relative group px-2 sm:px-0">
            <div className="absolute -inset-1 bg-gradient-to-r from-[var(--accent)]/30 via-[var(--text-primary)]/10 to-[var(--accent)]/30 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative flex items-center bg-[var(--bg-secondary)]/90 backdrop-blur-xl border border-[var(--border-strong)] rounded-2xl shadow-2xl overflow-hidden transition-all group-focus-within:border-[var(--accent)]/50 group-focus-within:ring-1 group-focus-within:ring-[var(--accent)]/20">
                <input
                  type="text"
                  placeholder="Ask the agents to build something..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isLoading}
                  className="w-full h-14 md:h-16 pl-6 pr-16 bg-transparent text-base md:text-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
                />
                <div className="absolute right-2">
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!prompt.trim() || isLoading}
                    className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--bg-primary)] transition-all shadow-lg"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-[var(--bg-primary)] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ArrowRight size={20} />
                    )}
                  </Button>
                </div>
              </div>
            </form>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {[
                { label: "Price of BTC", prompt: "What is the current price of BTC?", icon: Coins },
                { label: "AI Frameworks", prompt: "Find Github repos on AI Agent Frameworks", icon: Bot },
                { label: "Crypto Conferences", prompt: "Find upcoming crypto conferences in 2026", icon: Globe }
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setPrompt(item.prompt);
                    setIsLoading(true);
                    router.push(`/canvas?prompt=${encodeURIComponent(item.prompt)}`);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)]/50 border border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--bg-secondary)] transition-all text-xs sm:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] backdrop-blur-md"
                >
                  <item.icon size={12} className="text-[var(--accent)]" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Powered By */}
          <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <span className="text-[11px] uppercase tracking-widest text-[var(--text-quaternary)] font-medium">Powered By</span>
            <div className="flex items-center gap-8 md:gap-12 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
              {/* Increased logo sizes */}
              <div className="relative h-8 w-32 md:h-10 md:w-40">
                <Image
                  src="/cronos-logo.svg"
                  alt="Cronos"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="h-6 w-px bg-[var(--border)]" />
              <div className="relative h-6 w-20 md:h-8 md:w-24">
                <Image
                  src="/x402-logo.png"
                  alt="x402"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-24 px-4 sm:px-6 relative border-t border-[var(--border)]/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <Card key={feature.title} className="bg-[var(--bg-secondary)]/40 border-[var(--border)] hover:border-[var(--accent)]/30 hover:bg-[var(--bg-secondary)] transition-all duration-300 group overflow-hidden h-full">
                <CardHeader className="relative z-10 p-6 md:p-8">
                  <div className="w-12 h-12 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-[var(--accent)]/50 transition-all duration-300 shadow-sm">
                    <feature.icon className="w-6 h-6 text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors" />
                  </div>
                  <CardTitle className="text-xl md:text-2xl font-medium text-[var(--text-primary)] mb-3 group-hover:text-white transition-colors">{feature.title}</CardTitle>
                  <CardDescription className="text-[var(--text-secondary)] text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                {/* Hover Gradient */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent)]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <Card className="glass relative overflow-hidden border-[var(--border-strong)] shadow-2xl">
            {/* Ambient Background for CTA */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--accent)]/20 blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-500/10 blur-[80px] pointer-events-none" />

            <CardContent className="p-10 md:p-14 text-center relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">
                Ready to orchestrate?
              </h2>
              <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto text-lg leading-relaxed">
                Connect your wallet to the testnet and start executing verifiable agent workflows in seconds.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  onClick={() => router.push('/canvas')}
                  className="h-12 w-full sm:w-auto px-8 bg-gradient-to-r from-[var(--accent)] to-teal-500 hover:brightness-110 text-white transition-all font-medium text-base rounded-full shadow-lg shadow-[var(--accent)]/20 border-0"
                >
                  <span className="mr-2">Launch Canvas</span>
                  <ChevronRight size={16} />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/ledger')}
                  className="h-12 w-full sm:w-auto px-8 border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-full transition-all text-base bg-transparent"
                >
                  View Ledger
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-[var(--border)] bg-[var(--bg-primary)]">
        <div className="max-w-6xl mx-auto px-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
            <div className="w-6 h-6 rounded bg-[var(--text-tertiary)] flex items-center justify-center text-[var(--bg-primary)]">
              <Zap size={14} fill="currentColor" />
            </div>
            <span className="text-sm font-semibold tracking-wide text-[var(--text-tertiary)]">AGENTS OF TRUTH</span>
          </div>
          <p className="text-[var(--text-quaternary)] text-xs text-center">
            © 2026 Agents of Truth. Built on Cronos.
          </p>
        </div>
      </footer>
    </main>
  );
}
