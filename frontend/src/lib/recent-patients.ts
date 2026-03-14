export interface RecentPatient {
    id: string;
    name: string;
    timestamp: number;
}

const STORAGE_KEY = 'klinikapp_recent_patients';
const MAX_RECENT = 5;

export function addRecentPatient(patient: { id: string; firstName: string; lastName: string }) {
    if (typeof window === 'undefined') return;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        let recent: RecentPatient[] = stored ? JSON.parse(stored) : [];

        // Varsa çıkar
        recent = recent.filter(p => p.id !== patient.id);

        // Başa ekle
        recent.unshift({
            id: patient.id,
            name: `${patient.firstName} ${patient.lastName}`,
            timestamp: Date.now()
        });

        // Sınırla
        if (recent.length > MAX_RECENT) {
            recent = recent.slice(0, MAX_RECENT);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
    } catch (e) {
        console.error('Failed to save recent patient', e);
    }
}

export function getRecentPatients(): RecentPatient[] {
    if (typeof window === 'undefined') return [];

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to get recent patients', e);
    }
    return [];
}
