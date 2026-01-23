'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, CheckCircle, XCircle, Clock, Zap, TrendingUp, Hash } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge variant="success" className="gap-1"><CheckCircle size={10} /> Completed</Badge>;
            case 'failed':
                return <Badge variant="destructive" className="gap-1"><XCircle size={10} /> Failed</Badge>;
            case 'pending':
                return <Badge variant="warning" className="gap-1"><Clock size={10} /> Pending</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pt-24">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Transaction Ledger</h1>
                        <p className="text-[var(--text-secondary)]">Real-time record of all x402 micropayments on Cronos Testnet</p>
                    </div>
                    <Button variant="outline" asChild>
                        <a href="https://explorer.cronos.org/testnet" target="_blank" rel="noopener noreferrer">
                            Explorer <ExternalLink size={14} className="ml-2" />
                        </a>
                    </Button>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <Card className="bg-[var(--bg-secondary)] border-[var(--border)]">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-[var(--text-tertiary)] flex items-center gap-2">
                                    <Zap size={14} /> Total Transactions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalTransactions}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-[var(--bg-secondary)] border-[var(--border)]">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-[var(--text-tertiary)] flex items-center gap-2">
                                    <CheckCircle size={14} /> Successful
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-[var(--success)]">{stats.successfulTransactions}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-[var(--bg-secondary)] border-[var(--border)]">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-[var(--text-tertiary)] flex items-center gap-2">
                                    <XCircle size={14} /> Failed
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-[var(--error)]">{stats.failedTransactions}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-[var(--bg-secondary)] border-[var(--border)]">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-[var(--text-tertiary)] flex items-center gap-2">
                                    <TrendingUp size={14} /> Total Volume
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-[var(--accent)]">
                                    {stats.totalVolume.toFixed(4)} {stats.currency}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Transactions Table */}
                <Card className="bg-[var(--bg-secondary)] border-[var(--border)] overflow-hidden">
                    <CardHeader className="border-b border-[var(--border)] bg-[var(--bg-tertiary)]/30">
                        <CardTitle>Recent Transactions</CardTitle>
                        <CardDescription>History of agent tool calls and payments</CardDescription>
                    </CardHeader>
                    <div className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Status</TableHead>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>Tool</TableHead>
                                    <TableHead>Recipient</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Tx Hash</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-[var(--text-tertiary)]">
                                            <div className="flex items-center justify-center gap-2">
                                                <Clock className="animate-spin" size={16} /> Loading ledger...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : error ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-[var(--error)]">
                                            Error: {error}
                                        </TableCell>
                                    </TableRow>
                                ) : entries.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-[var(--text-tertiary)]">
                                            No transactions found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    entries.map((entry, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>{getStatusBadge(entry.status)}</TableCell>
                                            <TableCell className="text-[var(--text-secondary)] font-mono text-xs">
                                                {formatDate(entry.timestamp)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono">{entry.toolName}</Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors">
                                                <a
                                                    href={`https://explorer.cronos.org/testnet/address/${entry.walletAddress}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1"
                                                >
                                                    {formatAddress(entry.walletAddress)} <ExternalLink size={10} />
                                                </a>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-medium text-[var(--text-primary)]">
                                                {entry.cost} <span className="text-[var(--text-tertiary)] text-xs">{entry.currency}</span>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {entry.txHash ? (
                                                    <a
                                                        href={`https://explorer.cronos.org/testnet/tx/${entry.txHash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors flex items-center gap-1"
                                                    >
                                                        {formatAddress(entry.txHash)} <ExternalLink size={10} />
                                                    </a>
                                                ) : (
                                                    <span className="text-[var(--text-quaternary)]">—</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </main>
        </div>
    );
}
