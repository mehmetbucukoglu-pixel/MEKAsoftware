'use client';

import { useState, useEffect } from 'react';
import { clinicalNoteApi, ClinicalNote } from '@/lib/api';
import { Search, FileText, User, Calendar, Filter, Loader2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';

export default function NotesPage() {
    const [notes, setNotes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('ALL');

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        try {
            const res = await clinicalNoteApi.list();
            setNotes(res.data || []);
        } catch (err) {
            console.error("Notlar çekilemedi", err);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredNotes = notes.filter(n => {
        const matchesSearch =
            n.patient?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            n.patient?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            n.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            n.title?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = filterType === 'ALL' || n.noteType === filterType;

        return matchesSearch && matchesType;
    });

    const getNoteTypeLabel = (type: string) => {
        switch (type) {
            case 'NOTE': return 'Klinik Not';
            case 'PRESCRIPTION': return 'Reçete';
            case 'DIAGNOSIS': return 'Tanı';
            default: return type;
        }
    };

    const getNoteTypeColor = (type: string) => {
        switch (type) {
            case 'NOTE': return 'var(--primary)';
            case 'PRESCRIPTION': return 'var(--success)';
            case 'DIAGNOSIS': return 'var(--error)';
            default: return 'var(--text-secondary)';
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <FileText size={28} style={{ color: 'var(--primary)' }} />
                        Global Klinik Notlar 📋
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Tüm hastaların klinik geçmişi ve notları</p>
                </div>
            </div>

            {/* Controls */}
            <div className="card" style={{ marginBottom: '24px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                        <input
                            type="text"
                            placeholder="Hasta adı veya not içeriği ile ara..."
                            className="input"
                            style={{ paddingLeft: '40px', width: '100%' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="input"
                        style={{ width: '200px' }}
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="ALL">Tüm Türler</option>
                        <option value="NOTE">Sadece Notlar</option>
                        <option value="PRESCRIPTION">Reçeteler</option>
                        <option value="DIAGNOSIS">Tanılar</option>
                    </select>
                </div>
            </div>

            {/* Notes List */}
            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
                    <Loader2 className="spin" size={48} style={{ color: 'var(--primary)' }} />
                </div>
            ) : filteredNotes.length === 0 ? (
                <div className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                    <p>Gösterilecek klinik not bulunamadı.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                    {filteredNotes.map((note) => (
                        <div key={note.id} className="card note-card" style={{ position: 'relative', transition: 'transform 0.2s', borderLeft: `4px solid ${getNoteTypeColor(note.noteType)}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: getNoteTypeColor(note.noteType), background: `${getNoteTypeColor(note.noteType)}15`, padding: '2px 8px', borderRadius: '4px' }}>
                                            {getNoteTypeLabel(note.noteType)}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                            <Calendar size={14} />
                                            {format(new Date(note.createdAt), 'dd MMMM yyyy HH:mm', { locale: tr })}
                                        </span>
                                    </div>
                                    <h3 style={{ marginBottom: '8px', fontSize: '1.125rem' }}>{note.title || 'Başlıksız Not'}</h3>
                                    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '16px', whiteSpace: 'pre-wrap' }}>
                                        {note.content}
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem' }}>
                                            <User size={14} style={{ color: 'var(--primary)' }} />
                                            <span style={{ fontWeight: 600 }}>Hasta:</span>
                                            <Link href={`/patients/${note.patient?.id}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                                                {note.patient?.firstName} {note.patient?.lastName}
                                            </Link>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                            <span style={{ fontWeight: 600 }}>Doktor:</span>
                                            {note.doctor?.firstName} {note.doctor?.lastName}
                                        </div>
                                    </div>
                                </div>
                                <Link
                                    href={`/patients/${note.patient?.id}`}
                                    className="btn btn-secondary btn-icon"
                                    title="Hastaya Git"
                                    style={{ borderRadius: '50%', width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <ArrowRight size={18} />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style jsx>{`
                .note-card:hover {
                    transform: translateX(4px);
                    box-shadow: var(--shadow-md);
                }
            `}</style>
        </div>
    );
}
