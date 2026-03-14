# Sprint 5 Implementation Plan: Finance, Notes, and Dashboard

Building the core management features: Finance (Payments), Clinical Documentation (Notes), and an informative Dashboard.

## Proposed Changes

---

### Backend Components

#### [MODIFY] [finance module]
- `PaymentService`: CRUD operations for payments.
- `PaymentController`: API endpoints for recording and listing payments. Access allowed for ADMIN, ASSISTANT, and ACCOUNTANT.
- Logic to calculate total balance for a patient.
- Exporting financial data functionality.

#### [NEW] [clinical-note module]
- `ClinicalNoteService`: CRUD operations for medical notes, prescriptions, and diagnoses.
- `ClinicalNoteController`: API endpoints for managing notes.
- Visibility logic (DOCTOR_ONLY, STAFF, ALL).

#### [NEW] [dashboard module]
- `DashboardService`: Aggregates stats from `Patient`, `Appointment`, and `Payment` models.
- `DashboardController`: Returns summary data for the clinic staff.

---

### Frontend Components

#### [NEW] [finance page](file:///c:/Users/Lenovo/.gemini/antigravity/scratch/klinikapp/frontend/src/app/(app)/finance/page.tsx)
- Unified view for payment history across the clinic.
- Ability to filter by date and patient.

#### [MODIFY] [patient detail](file:///c:/Users/Lenovo/.gemini/antigravity/scratch/klinikapp/frontend/src/app/(app)/patients/[id]/page.tsx)
- Integrate Clinical Notes list and "Add Note" form.
- Display patient's current financial balance.

#### [MODIFY] [dashboard page](file:///c:/Users/Lenovo/.gemini/antigravity/scratch/klinikapp/frontend/src/app/(app)/dashboard/page.tsx)
- Stats widgets: Appointments Today, New Patients this week, Daily Revenue.
- Role-based views: Accountants land on a "Financial Summary" dashboard.
- "Günün Özeti" schedule view (hidden for Accountants).

[!IMPORTANT]
> - **Accountant (Mali Müşavir) Role**: A new role with restricted access exclusively to financial records and reporting.
> - **Financial Isolation**: Accountants will not see medical notes or patient's private communication, only payment history and balances.
> - **Dashboard**: Dashboard will show different stats based on role (Finance stats for Accountants, clinical overview for Doctors).
> - **Automated Variable Cost Calculator**: Implemented a metadata-backed calculator for variable expenses to automate `Units * Unit Price` logic (e.g., Patient/Doctor count).

### Finance Module Enhancements
Summary of changes to improve patient selection within financial workflows.

#### [NEW] [patient-search-input.tsx](file:///c:/Users/Lenovo/.gemini/antigravity/scratch/klinikapp/frontend/src/components/patient/patient-search-input.tsx)
Create a reusable searchable input component that:
- Fetches patients matching name, TC, or phone number.
- Debounces search requests.
- Renders results in a dropdown for selection.

#### [MODIFY] [page.tsx](file:///c:/Users/Lenovo/.gemini/antigravity/scratch/klinikapp/frontend/src/app/(app)/finance/page.tsx)
- Replace the static patient selection dropdown with the new `PatientSearchInput`.

## Verification Plan

### Automated Tests
- Integration tests for `Payment` creation.
- Unit tests for financial calculation logic.
- n/a (Manual testing via browser)

### Manual Verification
1.  Record a payment for a patient and verify it appears in the finance list.
2.  Add a clinical note and verify it's visible to the doctor.
3.  Check the dashboard to see if the new metrics (revenue/counts) update accordingly.
- Open "Yeni Tahsilat" modal.
- Type a patient name, partial TC, or phone number.
- Verify results appear correctly.
- Select a patient and ensure the form state is updated.
### Sprint 7 — Ortak Çalışma Alanı (Collaborative Workspace)
Klinik içindeki ekibin (Doktor, Asistan, Admin) birlikte döküman oluşturabileceği, ortak notlar tutabileceği ve bu dökümanlar üzerinden iş takibi yapabileceği Google Docs tarzı modern bir çalışma alanı.

#### [NEW] [Aesthetic Fix]
- Restore the premium dark theme across the entire application.
- Ensure Shadcn UI components integrate seamlessly without breaking the dark palette.
- Force `dark` class on the root level for consistency.

#### Backend Geliştirmeleri
- **Database Schema (`schema.prisma`)**:
  - `WorkspaceDocument` modeli: Başlık, içerik (Rich Text/Markdown), oluşturucu, klinik bazlı paylaşım.
  - `Task` modeli revizyonu: Opsiyonel bir dökümana bağlanabilme özelliği.
- **Document Module (`src/modules/document`)**: Doküman oluşturma, güncelleme ve klinik bazlı listeleme.

#### Frontend Geliştirmeleri (Kullanıcı Deneyimi - UX)
- **Yeni Sayfa (`/tasks`)**: "Ortak Alan / İşler" adıyla, döküman odaklı bir yapıya bürünecek.
- **Döküman Editörü**: Temiz, kağıt odaklı (Docs tarzı) merkezi yazı alanı.
- **Paylaşımlı Pano**: Dökümanların içine gömülü veya döküman bazlı açılabilen Kanban panoları.
- **Görsel Tasarım**: Koyu modun (Dark Mode) tüm ihtişamıyla geri getirilmesi ve premium tipografi.
- **Bildirim Entegrasyonu**: Dokümanda bir değişiklik yapıldığında veya görev atandığında anlık bildirim.

## Verification Plan

### Automated Tests
- n/a (Manual testing via browser)

### Manual Verification
1.  Verify the application is back in its premium dark theme.
2.  Create a "Workspace Document" and verify content persistence.
3.  Add tasks within the collaborative view and verify multi-user visibility.
4.  Test the notification system for workspace activities.
