'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, CheckCircle, XCircle, Clock, Zap, TrendingUp, Hash } from 'lucide-react';

interface LedgerEntry {
    timestamp: string;
    toolName: string;
    walletAddress: string;
    cost: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed';
    txHash?: string;
    userAddress?: string;
}

interface LedgerStats {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
    totalVolume: number;
    currency: string;
}

export default function LedgerPage() {
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [stats, setStats] = useState<LedgerStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/ledger')
            .then(res => res.json())
            .then(data => {
                setEntries(data.entries || []);
                setStats(data.stats);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    const formatDate = (ts: string) => new Date(ts).toLocaleString();

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle size={16} className="text-green-400" />;
            case 'failed': return <XCircle size={16} className="text-red-400" />;
            case 'pending': return <Clock size={16} className="text-yellow-400 animate-pulse" />;
            default: return null;
        }
    };

    const getStatusBadge = (status: string) => {
        const base = "px-2 py-1 rounded-full text-xs font-medium";
        switch (status) {
            case 'completed': return `${base} bg-green-500/20 text-green-400`;
            case 'failed': return `${base} bg-red-500/20 text-red-400`;
            case 'pending': return `${base} bg-yellow-500/20 text-yellow-400`;
            default: return base;
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0f0d]">
            {/* Header */}
            <header className="border-b border-[#1a2f23] bg-[#0d1410]/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-[#00d4aa] hover:text-[#00ffcc] transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#00ff88] flex items-center justify-center">
                                <Hash size={16} className="text-black" />
                            </div>
                            <h1 className="text-xl font-bold text-white">x402 Ledger</h1>
                        </div>
                    </div>
                    <div className="text-sm text-[#6b8f71]">
                        Cronos Testnet • ERC-8004 Compliant
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-[#0d1410] border border-[#1a2f23] rounded-xl p-4">
                            <div className="flex items-center gap-2 text-[#6b8f71] text-sm mb-1">
                                <Zap size={14} />
                                Total Transactions
                            </div>
                            <div className="text-2xl font-bold text-white">{stats.totalTransactions}</div>
                        </div>
                        <div className="bg-[#0d1410] border border-[#1a2f23] rounded-xl p-4">
                            <div className="flex items-center gap-2 text-[#6b8f71] text-sm mb-1">
                                <CheckCircle size={14} />
                                Successful
                            </div>
                            <div className="text-2xl font-bold text-green-400">{stats.successfulTransactions}</div>
                        </div>
                        <div className="bg-[#0d1410] border border-[#1a2f23] rounded-xl p-4">
                            <div className="flex items-center gap-2 text-[#6b8f71] text-sm mb-1">
                                <XCircle size={14} />
                                Failed
                            </div>
                            <div className="text-2xl font-bold text-red-400">{stats.failedTransactions}</div>
                        </div>
                        <div className="bg-[#0d1410] border border-[#1a2f23] rounded-xl p-4">
                            <div className="flex items-center gap-2 text-[#6b8f71] text-sm mb-1">
                                <TrendingUp size={14} />
                                Total Volume
                            </div>
                            <div className="text-2xl font-bold text-[#00d4aa]">
                                {stats.totalVolume.toFixed(4)} {stats.currency}
                            </div>
                        </div>
                    </div>
                )}

                {/* Transactions Table */}
                <div className="bg-[#0d1410] border border-[#1a2f23] rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-[#1a2f23]">
                        <h2 className="text-lg font-semibold text-white">Recent Transactions</h2>
                        <p className="text-sm text-[#6b8f71]">x402 payment records for tool calls</p>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-[#6b8f71]">
                            <Clock className="animate-spin mx-auto mb-2" size={24} />
                            Loading ledger...
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center text-red-400">
                            Error: {error}
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="p-8 text-center text-[#6b8f71]">
                            No transactions yet. Make a tool call to record transactions.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-[#0a0f0d]">
                                    <tr className="text-left text-sm text-[#6b8f71]">
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Timestamp</th>
                                        <th className="px-4 py-3">Tool</th>
                                        <th className="px-4 py-3">To Address</th>
                                        <th className="px-4 py-3 text-right">Amount</th>
                                        <th className="px-4 py-3">Tx Hash</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.map((entry, idx) => (
                                        <tr
                                            key={idx}
                                            className="border-t border-[#1a2f23] hover:bg-[#1a2f23]/30 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <span className={getStatusBadge(entry.status)}>
                                                    <span className="flex items-center gap-1">
                                                        {getStatusIcon(entry.status)}
                                                        {entry.status}
                                                    </span>
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-[#a0b8a6]">
                                                {formatDate(entry.timestamp)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 bg-[#00d4aa]/10 text-[#00d4aa] rounded text-sm font-medium">
                                                    {entry.toolName}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-sm text-[#a0b8a6]">
                                                <a
                                                    href={`https://explorer.cronos.org/testnet/address/${entry.walletAddress}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="hover:text-[#00d4aa] transition-colors flex items-center gap-1"
                                                >
                                                    {formatAddress(entry.walletAddress)}
                                                    <ExternalLink size={12} />
                                                </a>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-white">
                                                {entry.cost} {entry.currency}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-sm text-[#6b8f71]">
                                                {entry.txHash ? (
                                                    <a
                                                        href={`https://explorer.cronos.org/testnet/tx/${entry.txHash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="hover:text-[#00d4aa] transition-colors flex items-center gap-1"
                                                    >
                                                        {formatAddress(entry.txHash)}
                                                        <ExternalLink size={12} />
                                                    </a>
                                                ) : (
                                                    <span className="text-[#3a5f43]">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer Note */}
                <div className="mt-8 text-center text-sm text-[#6b8f71]">
                    <p>This ledger uses x402 protocol for agent-to-agent micropayments</p>
                    <p className="mt-1">
                        Future: On-chain ledger with ERC-8004 smart contract verification
                    </p>
                </div>
            </main>
        </div>
    );
}
