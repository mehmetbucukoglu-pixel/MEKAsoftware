'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { financeApi, expenseApi, userApi, dashboardApi, Payment, Expense } from '@/lib/api';
import { Search, Plus, Filter, Loader2, ArrowUpRight, ArrowDownLeft, DollarSign, Receipt, TrendingUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import PatientSearchInput from '@/components/patient/patient-search-input';
import { PageHeader } from '@/lib/page-header';

type Period = 'week' | 'month' | 'quarter';

export default function FinancePage() {
    const { clinic } = useAuthStore();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [summary, setSummary] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'payments' | 'expenses'>('payments');
    const [period, setPeriod] = useState<Period>('month');

    // Form states
    const [newPayment, setNewPayment] = useState({
        patientId: '',
        amount: '',
        paymentMethod: 'CASH',
        paymentType: 'PAYMENT',
        description: ''
    });

    const [newExpense, setNewExpense] = useState({
        category: 'VARIABLE',
        amount: '',
        description: '',
        useCalculator: false,
        calculatorData: {
            type: 'PATIENT', // PATIENT, DOCTOR, OTHER
            units: '',
            unitPrice: ''
        }
    });

    const [calculatorStats, setCalculatorStats] = useState({ patients: 0, doctors: 0 });

    useEffect(() => {
        if (newExpense.useCalculator && newExpense.calculatorData.units && newExpense.calculatorData.unitPrice) {
            const calculatedAmount = Number(newExpense.calculatorData.units) * Number(newExpense.calculatorData.unitPrice);
            setNewExpense(prev => ({ ...prev, amount: calculatedAmount.toString() }));
        }
    }, [newExpense.useCalculator, newExpense.calculatorData.units, newExpense.calculatorData.unitPrice]);

    const fetchCalculatorStats = async () => {
        try {
            const [dRes, uRes] = await Promise.all([
                dashboardApi.get(),
                userApi.getDoctors()
            ]);
            setCalculatorStats({
                patients: dRes.data.stats.totalPatients || 0,
                doctors: uRes.data.length || 0
            });
        } catch (e) {
            console.error("Hesaplayıcı verileri çekilemedi");
        }
    };

    useEffect(() => {
        if (newExpense.useCalculator) {
            fetchCalculatorStats();
        }
    }, [newExpense.useCalculator]);

    useEffect(() => {
        if (newExpense.useCalculator) {
            if (newExpense.calculatorData.type === 'PATIENT') {
                setNewExpense(prev => ({ ...prev, calculatorData: { ...prev.calculatorData, units: calculatorStats.patients.toString() } }));
            } else if (newExpense.calculatorData.type === 'DOCTOR') {
                setNewExpense(prev => ({ ...prev, calculatorData: { ...prev.calculatorData, units: calculatorStats.doctors.toString() } }));
            } else if (newExpense.calculatorData.type === 'OTHER' && (newExpense.calculatorData.units === calculatorStats.patients.toString() || newExpense.calculatorData.units === calculatorStats.doctors.toString())) {
                setNewExpense(prev => ({ ...prev, calculatorData: { ...prev.calculatorData, units: '' } }));
            }
        }
    }, [newExpense.useCalculator, newExpense.calculatorData.type, calculatorStats]);

    useEffect(() => {
        fetchData();
    }, [clinic, period]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [pRes, eRes, sRes] = await Promise.all([
                financeApi.list(),
                expenseApi.list(),
                financeApi.getSummary({ period })
            ]);
            setPayments(pRes.data.data || []);
            setExpenses(eRes.data || []);
            setSummary(sRes.data);
        } catch (err) {
            console.error("Veriler çekilemedi", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreatePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPayment.patientId) return alert("Lütfen bir hasta seçin.");
        try {
            await financeApi.create({ ...newPayment, amount: Number(newPayment.amount) });
            setShowPaymentModal(false);
            fetchData();
            setNewPayment({ patientId: '', amount: '', paymentMethod: 'CASH', paymentType: 'PAYMENT', description: '' });
        } catch (err) {
            alert("Ödeme kaydedilemedi.");
        }
    };

    const handleCreateExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const metadata = newExpense.useCalculator ? {
                calculation: {
                    type: newExpense.calculatorData.type,
                    units: Number(newExpense.calculatorData.units),
                    unitPrice: Number(newExpense.calculatorData.unitPrice)
                }
            } : {};

            await expenseApi.create({
                category: newExpense.category,
                amount: Number(newExpense.amount),
                description: newExpense.description,
                metadata
            });
            setShowExpenseModal(false);
            fetchData();
            setNewExpense({
                category: 'VARIABLE', amount: '', description: '',
                useCalculator: false,
                calculatorData: { type: 'PATIENT', units: '', unitPrice: '' }
            });
        } catch (err) {
            alert("Gider kaydedilemedi.");
        }
    };

    const periodLabels: Record<Period, string> = {
        week: 'Son 7 Gün',
        month: 'Son 30 Gün',
        quarter: 'Son 3 Ay'
    };

    const filteredData = activeTab === 'payments'
        ? payments.filter(p => p.patient?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || p.patient?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) || p.description?.toLowerCase().includes(searchTerm.toLowerCase()))
        : expenses.filter(e => e.description?.toLowerCase().includes(searchTerm.toLowerCase()) || e.category.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div>
            {/* Local Page Title */}
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Finans Yönetimi</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px', margin: 0 }}>Gelir, gider ve klinik kar/zarar takibi</p>
            </div>

            {/* Local Page Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                        {(['week', 'month', 'quarter'] as Period[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                style={{
                                    padding: '6px 14px', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 600, border: 'none',
                                    background: period === p ? 'var(--primary-muted)' : 'transparent',
                                    color: period === p ? 'var(--primary)' : 'var(--text-secondary)',
                                    cursor: 'pointer', transition: 'all 0.15s'
                                }}
                            >
                                {periodLabels[p]}
                            </button>
                        ))}
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowPaymentModal(true)} style={{ height: '42px', padding: '0 20px', fontWeight: 600 }}>
                        <Plus size={18} /> Tahsilat
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowExpenseModal(true)} style={{ height: '42px', padding: '0 20px', fontWeight: 600 }}>
                        <Plus size={18} /> Gider
                    </button>
                </div>
            </div>

            {/* Summary Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
                <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '4px' }}>
                        <span>Toplam Gelir</span>
                        <TrendingUp size={14} color="var(--success)" />
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>
                        ₺{summary?.totalIncome?.toLocaleString('tr-TR') || '0'}
                    </div>
                </div>
                <div className="card" style={{ borderLeft: '4px solid var(--error)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '4px' }}>
                        <span>Toplam Gider</span>
                        <Receipt size={14} color="var(--error)" />
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--error)' }}>
                        ₺{summary?.totalExpenses?.toLocaleString('tr-TR') || '0'}
                    </div>
                </div>
                <div className="card" style={{ borderLeft: '4px solid var(--primary)', background: 'var(--primary-muted)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '4px' }}>
                        <span>Net Kar</span>
                        <DollarSign size={14} color="var(--primary)" />
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                        ₺{summary?.netIncome?.toLocaleString('tr-TR') || '0'}
                    </div>
                </div>
                <div className="card" style={{ borderLeft: '4px solid var(--text-muted)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '4px' }}>
                        <span>Vergi Matrahı Info</span>
                        <Calendar size={14} color="var(--text-muted)" />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        Sabit: ₺{summary?.fixedExpenses?.toLocaleString('tr-TR') || '0'}<br />
                        Değişken: ₺{summary?.variableExpenses?.toLocaleString('tr-TR') || '0'}
                    </div>
                </div>
            </div>

            {/* Tabs & Controls */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px' }}>
                    <button
                        onClick={() => setActiveTab('payments')}
                        style={{ padding: '12px 4px', background: 'none', border: 'none', fontSize: '0.9375rem', fontWeight: 600, color: activeTab === 'payments' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'payments' ? '2px solid var(--primary)' : 'none', cursor: 'pointer' }}
                    >
                        Tahsilatlar
                    </button>
                    <button
                        onClick={() => setActiveTab('expenses')}
                        style={{ padding: '12px 4px', background: 'none', border: 'none', fontSize: '0.9375rem', fontWeight: 600, color: activeTab === 'expenses' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'expenses' ? '2px solid var(--primary)' : 'none', cursor: 'pointer' }}
                    >
                        Giderler (Fixed/Variable)
                    </button>
                </div>

                <div className="card" style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                            <input
                                type="text"
                                placeholder={activeTab === 'payments' ? "Hasta adı veya açıklama ile ara..." : "Gider açıklaması ile ara..."}
                                className="input"
                                style={{ paddingLeft: '40px', width: '100%' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="btn btn-secondary"><Filter size={18} /> Filtrele</button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'var(--bg-hover)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        <tr>
                            <th style={{ padding: '12px 20px' }}>Tarih</th>
                            <th style={{ padding: '12px 20px' }}>{activeTab === 'payments' ? 'Hasta' : 'Kategori'}</th>
                            <th style={{ padding: '12px 20px' }}>{activeTab === 'payments' ? 'Tür' : 'Açıklama'}</th>
                            <th style={{ padding: '12px 20px' }}>{activeTab === 'payments' ? 'Yöntem' : 'Kaydeden'}</th>
                            <th style={{ padding: '12px 20px', textAlign: 'right' }}>Tutar</th>
                        </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.875rem' }}>
                        {isLoading ? (
                            <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="spin" size={24} style={{ color: 'var(--primary)', margin: '0 auto' }} /></td></tr>
                        ) : filteredData.length === 0 ? (
                            <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Kayıt seçili periyot için bulunamadı.</td></tr>
                        ) : (
                            filteredData.map((item: any) => (
                                <tr key={item.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '12px 20px', color: 'var(--text-secondary)' }}>
                                        {format(new Date(item.paidAt), 'dd MMM yyyy', { locale: tr })}
                                    </td>
                                    <td style={{ padding: '12px 20px', fontWeight: 500 }}>
                                        {activeTab === 'payments' ? `${item.patient?.firstName} ${item.patient?.lastName}` : (item.category === 'FIXED' ? 'Sabit Gider' : 'Değişken Gider')}
                                    </td>
                                    <td style={{ padding: '12px 20px' }}>
                                        {activeTab === 'payments' ? (
                                            <span className={`badge ${item.paymentType === 'PAYMENT' ? 'badge-success' : 'badge-error'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                {item.paymentType === 'PAYMENT' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                                                {item.paymentType === 'PAYMENT' ? 'Tahsilat' : 'İade'}
                                            </span>
                                        ) : (item.description || '-')}
                                    </td>
                                    <td style={{ padding: '12px 20px' }}>
                                        {activeTab === 'payments' ? (
                                            <span>{item.paymentMethod === 'CASH' ? 'Nakit' : item.paymentMethod === 'CREDIT_CARD' ? 'Kredi Kartı' : 'Banka'}</span>
                                        ) : `${item.creator?.firstName} ${item.creator?.lastName}`}
                                    </td>
                                    <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 600, color: activeTab === 'payments' ? (item.paymentType === 'PAYMENT' ? 'inherit' : 'var(--error)') : 'var(--error)' }}>
                                        {activeTab === 'payments' && item.paymentType === 'REFUND' ? '-' : activeTab === 'expenses' ? '-' : ''}₺{item.amount.toLocaleString('tr-TR')}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }}>
                    <div className="card" style={{ width: '100%', maxWidth: '450px' }}>
                        <h2 style={{ marginBottom: '20px' }}>Yeni Tahsilat Kaydı</h2>
                        <form onSubmit={handleCreatePayment}>
                            <PatientSearchInput label="Hasta" required onSelect={(p) => setNewPayment({ ...newPayment, patientId: p?.id || '' })} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="form-group">
                                    <label>İşlem Türü</label>
                                    <select className="input" value={newPayment.paymentType} onChange={(e) => setNewPayment({ ...newPayment, paymentType: e.target.value })}>
                                        <option value="PAYMENT">Tahsilat</option>
                                        <option value="REFUND">İade</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Ödeme Yöntemi</label>
                                    <select className="input" value={newPayment.paymentMethod} onChange={(e) => setNewPayment({ ...newPayment, paymentMethod: e.target.value })}>
                                        <option value="CASH">Nakit</option>
                                        <option value="CREDIT_CARD">Kredi Kartı</option>
                                        <option value="BANK_TRANSFER">Havale/EFT</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group"><label>Tutar (₺)</label><input type="number" className="input" required value={newPayment.amount} onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })} /></div>
                            <div className="form-group"><label>Açıklama</label><textarea className="input" rows={2} value={newPayment.description} onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}></textarea></div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowPaymentModal(false)}>İptal</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Expense Modal */}
            {showExpenseModal && (
                <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }}>
                    <div className="card" style={{ width: '100%', maxWidth: '450px' }}>
                        <h2 style={{ marginBottom: '20px' }}>Yeni Gider Kaydı</h2>
                        <form onSubmit={handleCreateExpense}>
                            <div className="form-group">
                                <label>Gider Kategorisi</label>
                                <select className="input" value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}>
                                    <option value="VARIABLE">Değişken Gider (Malzeme, Fatura vb.)</option>
                                    <option value="FIXED">Sabit Gider (Kira, Maaş vb.)</option>
                                </select>
                            </div>

                            {newExpense.category === 'VARIABLE' && (
                                <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-hover)', borderRadius: '8px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={newExpense.useCalculator}
                                            onChange={(e) => setNewExpense({ ...newExpense, useCalculator: e.target.checked })}
                                        />
                                        Hesaplayıcı Kullan (Hasta/Doktor Bazlı)
                                    </label>

                                    {newExpense.useCalculator && (
                                        <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontSize: '0.75rem' }}>Tür</label>
                                                <select
                                                    className="input"
                                                    style={{ height: '36px', fontSize: '0.875rem' }}
                                                    value={newExpense.calculatorData.type}
                                                    onChange={(e) => setNewExpense({ ...newExpense, calculatorData: { ...newExpense.calculatorData, type: e.target.value } })}
                                                >
                                                    <option value="PATIENT">Hasta Başı</option>
                                                    <option value="DOCTOR">Doktor Başı</option>
                                                    <option value="OTHER">Diğer</option>
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontSize: '0.75rem' }}>Adet (Hasta/Doktor)</label>
                                                <input
                                                    type="number"
                                                    className="input"
                                                    style={{
                                                        height: '36px',
                                                        fontSize: '0.875rem',
                                                        background: newExpense.calculatorData.type !== 'OTHER' ? 'var(--bg-muted)' : 'inherit',
                                                        cursor: newExpense.calculatorData.type !== 'OTHER' ? 'not-allowed' : 'text'
                                                    }}
                                                    placeholder="Örn: 50"
                                                    readOnly={newExpense.calculatorData.type !== 'OTHER'}
                                                    value={newExpense.calculatorData.units}
                                                    onChange={(e) => setNewExpense({ ...newExpense, calculatorData: { ...newExpense.calculatorData, units: e.target.value } })}
                                                />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontSize: '0.75rem' }}>Birim Maliyet (₺)</label>
                                                <input
                                                    type="number"
                                                    className="input"
                                                    style={{ height: '36px', fontSize: '0.875rem' }}
                                                    placeholder="Örn: 100"
                                                    value={newExpense.calculatorData.unitPrice}
                                                    onChange={(e) => setNewExpense({ ...newExpense, calculatorData: { ...newExpense.calculatorData, unitPrice: e.target.value } })}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', paddingBottom: '4px' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                                                    Otomatik Hesap: ₺{Number(newExpense.amount).toLocaleString('tr-TR')}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="form-group">
                                <label>Tutar (₺)</label>
                                <input
                                    type="number"
                                    className="input"
                                    required
                                    readOnly={newExpense.useCalculator}
                                    style={{ background: newExpense.useCalculator ? 'var(--bg-hover)' : 'inherit' }}
                                    value={newExpense.amount}
                                    onChange={(e) => !newExpense.useCalculator && setNewExpense({ ...newExpense, amount: e.target.value })}
                                />
                            </div>
                            <div className="form-group"><label>Açıklama</label><textarea className="input" rows={2} required value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} placeholder="Kira, Elektrik, implant alımı vb."></textarea></div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowExpenseModal(false)}>İptal</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
