# KlinikApp n8n WhatsApp Integration Plan

This plan details the technical steps to integrate n8n with KlinikApp for WhatsApp automation, as requested.

## Proposed Changes

### Database Layer
- [x] **`schema.prisma`**: Added `apiKey` (for n8n to authenticate with KlinikApp) and `externalSettings` (to store n8n webhook URLs) to the `Clinic` model. This was completed previously and migrated.

---

### Integration Module (Backend)
We will create a new dedicated module to handle all third-party integrations, starting with n8n.

#### [NEW] `src/modules/integration/integration.module.ts`
- Registers the service and controller.
- Imports `HttpModule` (for outgoing webhooks) and `PrismaModule`.

#### [NEW] `src/modules/integration/integration.service.ts`
- **`generateApiKey(clinicId)`**: Generates a secure random string, hashes it (or stores raw if we only show it once), and saves it to `Clinic.apiKey`.
- **`getN8nSettings(clinicId)`**: Retrieves the stored n8n webhook URLs from `Clinic.externalSettings`.
- **`updateN8nSettings(clinicId, settings)`**: Updates the webhook URLs.
- **`sendWebhook(clinicId, eventType, payload)`**: Reads the configured webhook URL for `eventType` and sends an HTTP POST request to n8n.

#### [NEW] `src/modules/integration/integration.controller.ts`
- `GET /integration/settings`: Fetch current n8n settings and API key status (masked).
- `POST /integration/settings`: Update webhook URLs.
- `POST /integration/api-key/generate`: Generate a new API key (returns the raw key once).
- `DELETE /integration/api-key`: Revoke the API key.

---

### Inbound Webhook (n8n -> KlinikApp)

#### [NEW] `src/common/guards/api-key.guard.ts`
- An `AuthGuard` that extracts the `X-API-KEY` header.
- Looks up the `Clinic` by this API key in the database.
- Injects the `clinicId` into the request object for the controller to use.
- Rejects requests with invalid or missing keys (401 Unauthorized).

#### [NEW] `src/modules/integration/n8n-webhook.controller.ts`
- Protected by `ApiKeyGuard`.
- `POST /integration/n8n/webhook`
- **Action**: Receives payloads from n8n (e.g., incoming WhatsApp messages, appointment confirmations).
- Routes the payload to the appropriate internal service based on the `action` field in the payload (e.g., calls `MessagingService.handleIncomingWhatsApp` or `AppointmentService.updateStatus`).

---

### Outbound Event Triggers (KlinikApp -> n8n)

#### [MODIFY] `src/modules/patient/patient.service.ts`
- Inject `IntegrationService`.
- In `createPatient`: After successful creation, asynchronously call `IntegrationService.sendWebhook(clinicId, 'patient.created', patientData)`.

#### [MODIFY] `src/modules/appointment/appointment.service.ts`
- Inject `IntegrationService`.
- In `createAppointment`: Call `sendWebhook(clinicId, 'appointment.created', appointmentData)`.
- In `updateAppointmentStatus`: Call `sendWebhook(clinicId, 'appointment.updated', appointmentData)`.

#### [MODIFY] `src/modules/messaging/messaging.service.ts`
- Inject `IntegrationService`.
- In `sendMessage` (when a staff member sends a message from the UI): Call `sendWebhook(clinicId, 'message.outbound', messageData)` to tell n8n to send the actual WhatsApp message.

## n8n Workflow Configuration

To connect the n8n side, you will need to create two primary workflows in your n8n instance:

### 1. Outbound Workflow (KlinikApp -> WhatsApp via n8n)
This workflow is triggered when an event occurs in KlinikApp (e.g., a message is sent from the UI, or a patient is created).
1.  **Add a Webhook Node**:
    *   **Method**: `POST`
    *   **Path**: e.g., `klinikapp-outbound`
    *   *Action*: Copy the "Test URL" or "Production URL" from this node and save it in the KlinikApp Settings UI (which we will build) as your webhook URL.
2.  **Add a WhatsApp Node** (or equivalent API like Evolution/Twilio/WATI):
    *   Map the incoming data from the webhook to the WhatsApp node.
    *   For example, if KlinikApp sends `{ "phone": "90555...", "message": "Hello" }`, map `{{ $json.body.phone }}` to the recipient and `{{ $json.body.message }}` to the message body.

### 2. Inbound Workflow (WhatsApp -> n8n -> KlinikApp)
This workflow is triggered when a patient sends a WhatsApp message to your clinic's number.
1.  **Add a Webhook Node**:
    *   Configure this webhook URL in your WhatsApp Business API provider (e.g., Meta Developer Console, Twilio, etc.) to receive incoming messages.
2.  **Add an HTTP Request Node**:
    *   **Method**: `POST`
    *   **URL**: `https://your-klinikapp-domain.com/api/integration/n8n/webhook/:clinicId`
    *   **Headers**: Add the `X-API-KEY` header using the API key generated in KlinikApp.
    *   **Body**: Map the incoming WhatsApp message data (sender, message content) to the payload format that KlinikApp expects. (e.g. `{ "action": "incoming_message", "waPhone": "905...", "body": "..." }`)

## Verification Plan

### Automated Tests
- No automated tests are currently specified. We will rely on manual testing with n8n.

### Manual Verification
1.  **API Key Generation**:
    *   Start the backend (`npm run start:dev`).
    *   Use Postman/cURL to hit `POST /integration/api-key/generate` (authenticated as a clinic admin).
    *   Verify the API key is returned and saved in the DB.
2.  **Outbound Webhooks (KlinikApp -> n8n)**:
    *   Configure a test webhook URL (e.g., using `webhook.site` or a local n8n instance) in the clinic's `externalSettings`.
    *   Create a new patient via the KlinikApp API/UI.
    *   Verify the webhook payload is received at the configured URL containing the patient data.
3.  **Inbound Webhooks (n8n -> KlinikApp)**:
    *   Use Postman to send a `POST` request to `/integration/n8n/webhook`.
    *   Include the generated `X-API-KEY` in the headers.
    *   Send a mock payload for an incoming WhatsApp message.
    *   Verify the endpoint accepts the request (200 OK) and the message is processed (e.g., a new `Message` record is created in the DB).
