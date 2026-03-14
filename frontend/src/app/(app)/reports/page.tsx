'use client';

import { useState } from 'react';
import { CreditCard, BarChart3, PieChart } from 'lucide-react';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/lib/page-header';

const FinancePage = dynamic(() => import('../finance/page'), { ssr: false });
const StatisticsPage = dynamic(() => import('../statistics/page'), { ssr: false });

type TabId = 'finance' | 'statistics';

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState<TabId>('finance');

    const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
        { id: 'finance', label: 'Finans', icon: CreditCard },
        { id: 'statistics', label: 'İstatistikler', icon: BarChart3 },
    ];

    return (
        <div>
            {/* Header via Portal */}
            <PageHeader
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <PieChart size={18} style={{ color: 'var(--primary)' }} />
                        <h1 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Raporlar</h1>
                    </div>
                }
                actions={
                    <div style={{
                        display: 'flex', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)', overflow: 'hidden',
                    }}>
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '6px 16px', fontSize: '0.8125rem', fontWeight: 500,
                                        color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                                        background: isActive ? 'var(--primary-muted)' : 'transparent',
                                        border: 'none', cursor: 'pointer',
                                        borderLeft: tab.id !== 'finance' ? '1px solid var(--border)' : 'none',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <Icon size={14} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                }
            />

            {/* Tab content */}
            <div className="animate-fadeIn">
                {activeTab === 'finance' && <FinancePage />}
                {activeTab === 'statistics' && <StatisticsPage />}
            </div>
        </div>
    );
}
