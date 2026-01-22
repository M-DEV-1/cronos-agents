'use client';

import Link from 'next/link';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Wallet, LogOut, Zap, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
    const { address, isConnected } = useAccount();
    const { connect, connectors } = useConnect();
    const { disconnect } = useDisconnect();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleConnect = () => {
        // Use the first available connector (injected = MetaMask/browser wallet)
        const connector = connectors[0];
        if (connector) {
            connect({ connector });
        }
    };

    const shortenAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    return (
        <nav className="fixed top-4 left-4 right-4 z-50">
            <div className="max-w-7xl mx-auto">
                <div className="glass-strong rounded-2xl px-4 md:px-6 py-3 flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent)] to-teal-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                            <Zap className="w-5 h-5 text-white" fill="currentColor" />
                        </div>
                        <span className="text-[var(--text-primary)] font-semibold text-lg hidden sm:block">
                            Agents of Truth
                        </span>
                    </Link>

                    {/* Desktop Nav Links */}
                    <div className="hidden lg:flex items-center gap-1">
                        <Link
                            href="/"
                            className="px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all text-sm font-medium"
                        >
                            Home
                        </Link>
                        <Link
                            href="/canvas"
                            className="px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all text-sm font-medium"
                        >
                            Canvas
                        </Link>
                    </div>

                    {/* Right Side: Wallet + Mobile Menu */}
                    <div className="flex items-center gap-3">
                        {/* Wallet Button */}
                        {isConnected ? (
                            <button
                                onClick={() => disconnect()}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all group"
                            >
                                <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
                                <span className="text-sm text-[var(--text-primary)] font-medium">
                                    {shortenAddress(address!)}
                                </span>
                                <LogOut className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--error)] transition-colors" />
                            </button>
                        ) : (
                            <button
                                onClick={handleConnect}
                                className="btn-primary flex items-center gap-2"
                            >
                                <Wallet className="w-4 h-4" />
                                <span className="hidden sm:inline">Connect</span>
                            </button>
                        )}

                        {/* Mobile Menu Toggle */}
                        <button
                            className="lg:hidden p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="lg:hidden mt-2 glass-strong rounded-xl p-4 space-y-1">
                        <Link
                            href="/"
                            className="block px-4 py-3 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Home
                        </Link>
                        <Link
                            href="/canvas"
                            className="block px-4 py-3 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Canvas
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
}
