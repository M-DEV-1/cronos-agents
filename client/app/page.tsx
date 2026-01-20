'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Send } from 'lucide-react';

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

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-8 py-5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '15px' }}>
            Agents of Truth
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        {/* Hero */}
        <div className="text-center max-w-2xl">
          <h1
            className="text-5xl md:text-6xl font-semibold tracking-tight mb-4"
            style={{
              color: 'var(--text-primary)',
              fontFamily: '-apple-system, BlinkMacSystemFont, Helvetica Neue, Helvetica, Arial, sans-serif',
              fontWeight: 600,
              letterSpacing: '-0.02em'
            }}
          >
            x402-enabled
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              AI Agents
            </span>
          </h1>
          <p
            className="text-lg mb-10"
            style={{ color: 'var(--text-secondary)' }}
          >
            Orchestrated multi-agent workflows on Cronos blockchain
          </p>

          {/* Prompt Input */}
          <form onSubmit={handleSubmit} className="relative max-w-xl mx-auto">
            <input
              type="text"
              placeholder="What would you like to do?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
              className="w-full h-14 pl-5 pr-14 rounded-2xl outline-none transition-all"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '16px',
                fontFamily: 'inherit',
              }}
              autoFocus
            />
            <button
              type="submit"
              disabled={!prompt.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
              style={{
                background: prompt.trim() ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: 'white',
                opacity: prompt.trim() ? 1 : 0.5,
              }}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Examples */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {[
              'Find upcoming literature festivals in India',
              'What is the price of CRO?',
              'Remind me about JLF 2026',
            ].map((example, i) => (
              <button
                key={i}
                onClick={() => setPrompt(example)}
                className="px-4 py-2 rounded-full text-sm transition-all"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-tertiary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-strong)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-tertiary)';
                }}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer - Powered By */}
      <footer
        className="py-8"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="flex flex-col items-center gap-4">
          <span
            className="text-xs uppercase tracking-widest"
            style={{ color: 'var(--text-quaternary)' }}
          >
            Powered by
          </span>
          <div className="flex items-center gap-8">
            <Image
              src="/cronos-logo.svg"
              alt="Cronos"
              width={100}
              height={28}
              style={{ opacity: 0.6 }}
            />
            <div style={{ width: '1px', height: '24px', background: 'var(--border)' }} />
            <Image
              src="/x402-logo.png"
              alt="x402"
              width={60}
              height={24}
              style={{ opacity: 0.6 }}
            />
          </div>
        </div>
      </footer>
    </main>
  );
}
