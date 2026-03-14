'use client';
import { Calendar as CalendarIcon } from 'lucide-react';

export default function CalendarPage() {
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CalendarIcon size={24} style={{ color: 'var(--primary)' }} />
                    Takvim
                </h1>
                <button className="btn btn-primary">+ Yeni Randevu</button>
            </div>
            <div className="card" style={{ minHeight: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="empty-state">
                    <CalendarIcon size={48} />
                    <h3>Takvim Modülü</h3>
                    <p style={{ marginTop: '8px' }}>FullCalendar entegrasyonu Sprint 3&apos;te eklenecek</p>
                </div>
            </div>
        </div>
    );
}
