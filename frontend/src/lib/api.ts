import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000, // 15sn — backend cevap vermezse loading takılmasın
});

// Request interceptor — JWT token ekleme
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Response interceptor — Token yenileme
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) throw new Error('No refresh token');

                const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);

                originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                return api(originalRequest);
            } catch {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    },
);

export default api;

// ========== Types ==========

export interface Patient {
    id: string;
    clinicId: string;
    firstName: string;
    lastName: string;
    phone: string;
    phone2?: string;
    email?: string;
    address: string;
    dateOfBirth?: string;
    gender?: string;
    notes?: string;
    createdAt: string;
    updatedAt?: string;
    appointments?: Appointment[];
    clinicalNotes?: any[];
    attachments?: any[];
    payments?: Payment[];
    conversations?: { status: string; escalationReason?: string; unreadCount?: number }[];
    _count?: { appointments: number; clinicalNotes: number; payments: number };
}

export interface ClinicalNote {
    id: string;
    patientId: string;
    doctorId: string;
    content: string;
    createdAt: string;
    doctor?: {
        firstName: string;
        lastName: string;
    };
}

export interface DoctorSchedule {
    id: string;
    doctorId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    breakStart?: string;
    breakEnd?: string;
    slotDuration: number;
    isActive: boolean;
}

export interface Appointment {
    id: string;
    doctorId: string;
    patientId: string;
    startTime: string;
    endTime: string;
    durationMin: number;
    status: 'CONFIRMED' | 'ARRIVED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
    reminderStatus?: 'PENDING' | 'SENT' | 'CONFIRMED' | 'CANCELLED';
    source: 'MANUAL' | 'WHATSAPP';
    notes?: string;
    cancelReason?: string;
    arrivedAt?: string;
    completedAt?: string;
    patient?: Patient;
    doctor?: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

export interface Payment {
    id: string;
    patientId: string;
    appointmentId?: string;
    amount: number;
    currency: string;
    paymentMethod: 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'OTHER';
    paymentType: 'PAYMENT' | 'REFUND';
    description?: string;
    paidAt: string;
    patient?: { firstName: string; lastName: string };
}

export interface Expense {
    id: string;
    clinicId: string;
    category: 'FIXED' | 'VARIABLE';
    amount: number;
    description?: string;
    paidAt: string;
    creator?: { firstName: string, lastName: string };
}

export interface DashboardData {
    stats: {
        totalPatients: number;
        appointmentsToday: number;
        monthlyRevenue: number;
    };
    dailySchedule: Appointment[];
}

export interface ExtendedKpis {
    weeklyAppointments: number;
    monthlyAppointments: number;
    createdToday: number;
    appointmentChangesToday: number;
    occupancyRate: number;
    unreadMessages: number;
}


export interface PatientListResponse {
    data: Patient[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface CreatePatientInput {
    firstName: string;
    lastName: string;
    phone: string;
    phone2?: string;
    email?: string;
    address: string;
    dateOfBirth?: string;
    gender?: string;
    notes?: string;
}

// ========== Auth API ==========
export const authApi = {
    login: (data: { email: string; password: string }) => api.post('/auth/login', data),
    register: (data: any) => api.post('/auth/register', data),
    me: () => api.get('/auth/me'),
    logout: () => api.post('/auth/logout'),
};

// ========== User API ==========
export const userApi = {
    getDoctors: () => api.get('/users/doctors'),
};

// ========== Patient API ==========
export const patientApi = {
    list: (params?: { search?: string; page?: number; limit?: number }) =>
        api.get<PatientListResponse>('/patients', { params }),
    get: (id: string) => api.get<Patient>(`/patients/${id}`),
    create: (data: CreatePatientInput) => api.post<Patient>('/patients', data),
    update: (id: string, data: Partial<CreatePatientInput>) => api.patch<Patient>(`/patients/${id}`, data),
    delete: (id: string) => api.delete(`/patients/${id}`),
    listDeleted: () => api.get('/patients/deleted'),
    restore: (id: string) => api.patch<Patient>(`/patients/${id}/restore`),
    checkPhone: (phone: string) => api.get<{ exists: boolean, patientName?: string }>(`/patients/check-phone?phone=${phone}`),
};

// ========== Appointment API ==========
export const appointmentApi = {
    list: (params?: any, config?: any) => api.get('/appointments', { params, ...config }),
    get: (id: string) => api.get(`/appointments/${id}`),
    create: (data: any) => api.post('/appointments', data),
    update: (id: string, data: any) => api.patch(`/appointments/${id}`, data),
    remove: (id: string) => api.delete(`/appointments/${id}`),
    cancel: (id: string, reason?: string) => api.patch(`/appointments/${id}/cancel`, { cancelReason: reason }),
    complete: (id: string) => api.patch(`/appointments/${id}/complete`),
    arrived: (id: string) => api.patch(`/appointments/${id}/arrived`),
    noShow: (id: string) => api.patch(`/appointments/${id}/no-show`),
    updateStatus: (id: string, status: string, cancelReason?: string) => {
        if (status === 'COMPLETED') return api.patch(`/appointments/${id}/complete`);
        if (status === 'ARRIVED') return api.patch(`/appointments/${id}/arrived`);
        if (status === 'NO_SHOW') return api.patch(`/appointments/${id}/no-show`);
        if (status === 'CANCELLED') return api.patch(`/appointments/${id}/cancel`, { cancelReason });
        return api.patch(`/appointments/${id}/status`, { status }); // Eğer backend'te direkt status değişimi varsa
    },
    availableSlots: (doctorId: string, date: string) => api.get('/appointments/available-slots', { params: { doctorId, date } }),
};

// ========== Notification API ==========
export const notificationApi = {
    list: () => api.get('/notifications'),
    markRead: (id: string) => api.patch(`/notifications/${id}/read`),
    markAllRead: () => api.patch('/notifications/read-all'),
};

// ========== Doctor Schedule API ==========
export const doctorScheduleApi = {
    get: (doctorId: string) => api.get<DoctorSchedule[]>(`/doctors/${doctorId}/schedule`),
    update: (doctorId: string, schedules: Partial<DoctorSchedule>[]) => api.patch<DoctorSchedule[]>(`/doctors/${doctorId}/schedule`, schedules),
};

// ========== Finance API ==========
export const financeApi = {
    list: (params?: { patientId?: string; page?: number; limit?: number }) => api.get('/payments', { params }),
    create: (data: any) => api.post('/payments', data),
    getSummary: (params?: { period?: 'week' | 'month' | 'quarter' | 'custom'; startDate?: string; endDate?: string }) => api.get('/payments/summary', { params }),
    getPatientBalance: (patientId: string) => api.get(`/patients/${patientId}/balance`),
};

// ========== Expense API ==========
export const expenseApi = {
    list: () => api.get<Expense[]>('/expenses'),
    create: (data: any) => api.post<Expense>('/expenses', data),
    update: (id: string, data: any) => api.patch<Expense>(`/expenses/${id}`, data),
    remove: (id: string) => api.delete(`/expenses/${id}`),
};

// ========== Clinical Note API ==========
export const clinicalNoteApi = {
    list: (patientId?: string) => api.get<ClinicalNote[]>('/clinical-notes', { params: { patientId } }),
    create: (data: any) => api.post('/clinical-notes', data),
    update: (id: string, data: any) => api.patch(`/clinical-notes/${id}`, data),
};

// ========== Dashboard API ==========
export const dashboardApi = {
    get: () => api.get<DashboardData>('/dashboard'),
    getExtendedKpis: () => api.get<ExtendedKpis>('/dashboard/extended-kpis'),
    getReminders: () => api.get('/dashboard/reminders'),
    getActivity: () => api.get('/dashboard/activity'),
    getEscalations: () => api.get('/dashboard/escalations'),
};

// ========== Statistics API ==========
export interface StatisticsOverview {
    totalAppointments: number;
    checkedIn: number;
    completed: number;
    cancelled: number;
    noShow: number;
    noShowRate: number;
    uniquePatients: number;
    avgSessionMinutes: number;
    doctorBreakdown: { doctorId: string; doctorName: string; count: number }[];
}

export interface VisitStats {
    daily: { date: string; visits: number; completed: number; noShow: number }[];
    hourly: { hour: number; count: number }[];
}

export interface ChatInsights {
    modeDistribution: { status: string; count: number }[];
    topEscalationReasons: { reason: string; count: number }[];
    unlinkedPatients: number;
    dailyVolume: { date: string; count: number }[];
}

export const statisticsApi = {
    getOverview: (params?: { startDate?: string; endDate?: string; doctorId?: string }) =>
        api.get<StatisticsOverview>('/statistics/overview', { params }),
    getVisits: (params?: { startDate?: string; endDate?: string; doctorId?: string }) =>
        api.get<VisitStats>('/statistics/visits', { params }),
    getRecentVisits: (limit?: number) =>
        api.get<Appointment[]>('/statistics/recent-visits', { params: { limit } }),
    getChatInsights: () =>
        api.get<ChatInsights>('/statistics/chat-insights'),
    getEscalationStats: (period?: '14d' | '30d' | '3m') =>
        api.get('/statistics/escalations', { params: { period } }),
    getAutoAppointmentStats: (period?: '14d' | '30d' | '3m') =>
        api.get('/statistics/auto-appointments', { params: { period } }),
    getNewPatientStats: (period?: '14d' | '30d' | '3m') =>
        api.get('/statistics/new-patients', { params: { period } }),
};

