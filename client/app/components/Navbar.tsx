'use client';

import Link from 'next/link';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Wallet, LogOut, Zap, Menu, X, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "./ui/dropdown-menu";

export function Navbar() {
    const { address, isConnected } = useAccount();
    const { connect, connectors } = useConnect();
    const { disconnect } = useDisconnect();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Handle scroll effect for glass intensity
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleConnect = () => {
        const connector = connectors[0];
        if (connector) connect({ connector });
    };

    const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 h-14 transition-all duration-300 border-b ${scrolled
                    ? 'bg-[var(--bg-primary)]/80 backdrop-blur-xl border-[var(--border-strong)]'
                    : 'bg-transparent border-transparent'
                }`}
        >
            <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">

                {/* Logo Area */}
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-7 h-7 rounded-md bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] transition-all group-hover:bg-[var(--accent)]/20 group-hover:scale-105">
                            <Zap size={14} fill="currentColor" />
                        </div>
                        <span className="font-semibold text-sm text-[var(--text-primary)] tracking-wide">
                            AGENTS OF TRUTH
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-1">
                        <Link href="/canvas" className="px-3 py-1.5 text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                            Canvas
                        </Link>
                        <Link href="/ledger" className="px-3 py-1.5 text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                            Ledger
                        </Link>
                    </div>
                </div>

                {/* Right Side */}
                <div className="flex items-center gap-3">
                    {isConnected ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 gap-2 bg-[var(--bg-secondary)]/50 hover:bg-[var(--bg-secondary)] border border-[var(--border)] rounded-full px-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] shadow-[0_0_8px_var(--success)]" />
                                    <span className="hidden sm:inline font-mono text-[10px]">{shortenAddress(address!)}</span>
                                    <ChevronDown size={12} className="opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[200px] bg-[var(--bg-elevated)] border-[var(--border)] backdrop-blur-lg">
                                <DropdownMenuItem onClick={() => disconnect()} className="text-[var(--error)] focus:text-[var(--error)] focus:bg-[var(--error)]/10 cursor-pointer text-xs">
                                    <LogOut size={12} className="mr-2" /> Disconnect
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Button
                            onClick={handleConnect}
                            size="sm"
                            className="h-8 bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--bg-primary)] gap-2 rounded-full px-4 text-xs font-medium transition-all shadow-lg shadow-white/5"
                        >
                            <Wallet size={14} /> Connect Wallet
                        </Button>
                    )}

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden absolute top-14 left-0 right-0 border-b border-[var(--border)] bg-[var(--bg-primary)]/95 backdrop-blur-xl p-4 space-y-1 animate-in slide-in-from-top-2">
                    <Link
                        href="/canvas"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        <Zap size={14} /> Canvas
                    </Link>
                    <Link
                        href="/ledger"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        <Wallet size={14} /> Ledger
                    </Link>
                </div>
            )}
        </nav>
    );
}
