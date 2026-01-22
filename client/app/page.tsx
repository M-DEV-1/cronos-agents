'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Send, Zap, Shield, Eye, ArrowRight, Bot, Coins, Globe } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Button } from './components/ui/button';

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
      icon: Bot,
      title: 'Multi-Agent Orchestration',
      description: 'ADK-powered agents collaborate to complete complex tasks with full event tracing.',
    },
    {
      icon: Coins,
      title: 'x402 Micro-Payments',
      description: 'Pay-per-call economics on Cronos blockchain. Every tool invocation is metered.',
    },
    {
      icon: Eye,
      title: 'Real-Time Event Canvas',
      description: 'Visualize every agent action, tool call, and payment as interactive nodes.',
    },
    {
      icon: Globe,
      title: 'MCP Tool Connectors',
      description: 'Connect to GitHub, Filesystem, Search, and more via Model Context Protocol.',
    },
  ];

  const examples = [
    'Find upcoming literature festivals in India',
    'What is the price of CRO?',
    'Search GitHub for Rust web frameworks',
  ];

  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
            <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
            <span className="text-sm text-[var(--text-secondary)]">
              Powered by Cronos & ERC-8004
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
            <span className="text-[var(--text-primary)]">x402-enabled</span>
            <br />
            <span className="bg-gradient-to-r from-[var(--accent)] via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              AI Agents
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10">
            Orchestrated multi-agent workflows with real-time event tracing and
            pay-per-request micro-payments on Cronos blockchain.
          </p>

          {/* Prompt Input */}
          <form onSubmit={handleSubmit} className="max-w-xl mx-auto mb-8">
            <div className="relative">
              <input
                type="text"
                placeholder="What would you like to do?"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isLoading}
                className="input w-full h-14 pl-5 pr-14 rounded-2xl text-base"
                autoFocus
              />
              <button
                type="submit"
                disabled={!prompt.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                style={{
                  background: prompt.trim() ? 'var(--accent)' : 'var(--bg-tertiary)',
                  opacity: prompt.trim() ? 1 : 0.5,
                }}
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </form>

          {/* Example Prompts */}
          <div className="flex flex-wrap justify-center gap-2">
            {examples.map((example, i) => (
              <button
                key={i}
                onClick={() => setPrompt(example)}
                className="px-4 py-2 rounded-full text-sm transition-all bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-tertiary)] hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)]"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[var(--text-primary)]">
              Full Agent Lifecycle
            </h2>
            <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
              Observability + Pay-per-request economics + Rich UI — all in one platform.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="card-glass p-6 group hover:border-[var(--border-strong)] transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0 group-hover:bg-[var(--accent)] transition-colors">
                    <feature.icon className="w-6 h-6 text-[var(--accent)] group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 border-t border-[var(--border)]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="card-glass p-10 md:p-14">
            <Zap className="w-12 h-12 text-[var(--accent)] mx-auto mb-6" />
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-[var(--text-primary)]">
              Ready to get started?
            </h2>
            <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
              Connect your wallet and start running pay-per-request AI agents on Cronos Testnet.
            </p>
            <Button
              onClick={() => router.push('/canvas')}
              className="btn-primary inline-flex items-center gap-2 text-base px-8 py-3"
            >
              Open Canvas
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-teal-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" fill="currentColor" />
            </div>
            <span className="text-[var(--text-secondary)] text-sm">
              © 2026 Agents of Truth
            </span>
          </div>

          <div className="flex items-center gap-6">
            <span className="text-xs uppercase tracking-wider text-[var(--text-quaternary)]">
              Powered by
            </span>
            <Image
              src="/cronos-logo.svg"
              alt="Cronos"
              width={80}
              height={24}
              style={{ opacity: 0.6 }}
            />
            <Image
              src="/x402-logo.png"
              alt="x402"
              width={48}
              height={20}
              style={{ opacity: 0.6 }}
            />
          </div>
        </div>
      </footer>
    </main>
  );
}
