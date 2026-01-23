'use client';

import Link from 'next/link';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Wallet, LogOut, Zap, Menu, X, ChevronDown } from 'lucide-react';
import { useState } from 'react';
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

    const handleConnect = () => {
        const connector = connectors[0];
        if (connector) connect({ connector });
    };

    const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-[var(--border)] bg-[var(--bg-primary)]/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">

                {/* Logo Area */}
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white transition-transform group-hover:rotate-3">
                            <Zap size={18} fill="currentColor" />
                        </div>
                        <span className="font-semibold text-[var(--text-primary)] tracking-tight">
                            Agents of Truth
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-1">
                        <Link href="/canvas" className="px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-all">
                            Canvas
                        </Link>
                        <Link href="/ledger" className="px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-all">
                            Ledger
                        </Link>
                    </div>
                </div>

                {/* Right Side */}
                <div className="flex items-center gap-3">
                    {isConnected ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-9 gap-2 bg-[var(--bg-secondary)] border-[var(--border)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] shadow-[0_0_8px_var(--success)]" />
                                    <span className="hidden sm:inline font-mono text-xs">{shortenAddress(address!)}</span>
                                    <ChevronDown size={14} className="opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[200px] bg-[var(--bg-secondary)] border-[var(--border)]">
                                <DropdownMenuItem onClick={() => disconnect()} className="text-[var(--error)] focus:text-[var(--error)] focus:bg-[var(--error)]/10 cursor-pointer">
                                    <LogOut size={14} className="mr-2" /> Disconnect
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Button
                            onClick={handleConnect}
                            size="sm"
                            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white gap-2"
                        >
                            <Wallet size={16} /> Connect
                        </Button>
                    )}

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden p-2 text-[var(--text-secondary)]"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden absolute top-16 left-0 right-0 border-b border-[var(--border)] bg-[var(--bg-secondary)] shadow-xl p-4 space-y-2 animate-in slide-in-from-top-2">
                    <Link
                        href="/canvas"
                        className="flex items-center gap-2 px-4 py-3 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        <Zap size={16} /> Canvas
                    </Link>
                    <Link
                        href="/ledger"
                        className="flex items-center gap-2 px-4 py-3 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        <Wallet size={16} /> Ledger
                    </Link>
                </div>
            )}
        </nav>
    );
}
