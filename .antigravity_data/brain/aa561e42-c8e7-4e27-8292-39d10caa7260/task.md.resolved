# n8n WhatsApp Integration Tasks

## Phase 1: Infrastructure & Authentication
- [x] Add `apiKey` and `externalSettings` to `Clinic` Prisma model (completed in previous session)
- [ ] Implement `IntegrationModule`
- [ ] Create `AuthGuard` or strategy to validate `X-API-KEY` header for inbound requests (n8n -> KlinikApp)
- [ ] Create API Endpoint to generate/revoke clinic API keys
- [ ] Update frontend Clinic Settings UI for API Key management

## Phase 2: Inbound Events (n8n -> KlinikApp)
- [ ] Create endpoint `POST /integration/n8n/webhook/:clinicId`
- [ ] Parse incoming WhatsApp messages from n8n (store in `Message` and update `Conversation`)
- [ ] Handle appointment status updates (e.g., Confirmations via WA replies) from n8n

## Phase 3: Outbound Events (KlinikApp -> n8n)
- [ ] Implement `WebhookService` to send HTTP POST requests to n8n webhook URLs
- [ ] Add queue mechanism (BullMQ) for reliable webhook delivery and retries
- [ ] Trigger: `PatientService` (created) -> Send to n8n
- [ ] Trigger: `AppointmentService` (created, status updated) -> Send to n8n
- [ ] Trigger: `MessagingService` (outbound chat messages from UI) -> Send to n8n
- [ ] Update frontend UI to allow saving the n8n webhook URL per clinic
