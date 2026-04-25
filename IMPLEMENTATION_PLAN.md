# KlinikApp - Finalization and Integration Plan

This document outlines the steps required to finalize the KlinikApp MVP, specifically focusing on the n8n WhatsApp integration, exposing the application for webhook consumption, and handling HBYS data integration.

## Phase 1: Backend Preparation (✅ Completed)

We have modified the KlinikApp backend to securely handle inbound webhooks from n8n and to send outbound messages via n8n.

1.  **Secure Webhook Endpoints:**
    *   Added `N8nWebhookGuard` to `POST /appointments/whatsapp` to ensure only n8n can hit the endpoint using the `x-n8n-secret` header.
    *   *Previously complete:* `POST /webhooks/whatsapp` (inbound messages) already had this protection.
2.  **Patient & Doctor Lookup:**
    *   Created `createFromWhatsApp` service method. When n8n books an appointment with only a patient's name and phone number, the backend now automatically finds or creates the patient record.
    *   The backend now securely looks up the Doctor ID using the doctor's name provided by the n8n bot flow.
3.  **Real-time Calendar Updates:**
    *   Added Socket.IO events (`appointment_created`) so that when the bot books an appointment, the clinic's calendar UI updates instantly without requiring a page refresh.
4.  **Outbound Message Relay:**
    *   Modified the `sendMessage()` service. When doctors use the app in "HUMAN mode" to reply, the backend now calls n8n's outbound webhook URL to dispatch the message via WhatsApp Cloud API.
5.  **Environment Variables Template:**
    *   Created `.env.example` defining `N8N_WEBHOOK_SECRET` and `N8N_OUTBOUND_WEBHOOK_URL` to guide the configuration.

## Phase 2: Exposing the Local Backend (⏳ In Testing Stage)

n8n is running in the cloud and needs a public URL to talk to the backend running currently on `localhost:3001`.

1.  **Setup ngrok (Temporary Tunnel):**
    *   *Step:* Run `ngrok config add-authtoken <your-token>` (Requires a free ngrok account).
    *   *Step:* Run `ngrok http 3001` to expose the backend.
    *   *Goal:* Obtain the temporary `https://<hash>.ngrok.app` URL to configure n8n.
    *   *Note:* This is a temporary solution for testing and MVP onboarding day. A permanent deployment (Phase 5) is highly recommended immediately after MVP testing.

## Phase 3: n8n Workflow Configuration (⏳ In Testing Stage)

This phase requires access to the n8n workspace to modifying the logical flows to communicate with the updated KlinikApp backend.

1.  **Preparation (Need User Input):**
    *   We need the **n8n URL**, **login credentials**, and the **names of existing workflows**.
    *   We have the Clinic UUID (`135460d3-f612-457f-89e8-8ead3181c562`) ready for the webhook bodies.
2.  **Workflow 1: Inbound WhatsApp Handler (Modifying Existing)**
    *   *Goal:* Route human/bot conversations properly and book appointments.
    *   *Step:* Add logic to check condition (BOT vs HUMAN mode).
    *   *Step:* If appointment booked, remove Google Sheets/Calendar nodes and replace with an HTTP Node sending a `POST` request to `[ngrok-url]/appointments/whatsapp`, including `x-n8n-secret` header and the required body (Clinic ID, names, phone, etc).
    *   *Step:* Ensure all generic inbound messages trigger a `POST` to `[ngrok-url]/webhooks/whatsapp`.
3.  **Workflow 2: Outbound Message Relay (Creating New)**
    *   *Goal:* Allow doctors to message patients from the App.
    *   *Step:* Create a new workflow triggered by a "Webhook" node.
    *   *Step:* Define the Webhook URL (this becomes `N8N_OUTBOUND_WEBHOOK_URL` in the backend `.env`).
    *   *Step:* Link the webhook to the WhatsApp Meta API node to send the message payload (`{ to, message }`).
4.  **Workflow 3: Appointment Reminders (Modifying Existing)**
    *   *Goal:* Pull from DB instead of Google Sheets, handle cancellation feedback.
    *   *Step:* Change the data source to an HTTP Node calling `GET /appointments` (filtered for tomorrow).
    *   *Step:* If a user replies with "cancel/hayır", trigger a `PATCH /appointments/:id/cancel` HTTP Node to update KlinikApp.

## Phase 4: HBYS Daily Data Uploads (🔄 Pending Definition)

The system needs to upload daily data perfectly to HBYS (Hastane Bilgi Yönetim Sistemi).

1.  **Requirement Gathering:**
    *   Understand the exact HBYS integration requirements (API endpoints, required data formats like XML/JSON, authentication).
2.  **Development:**
    *   Create a cron job (using `@nestjs/schedule`) or an endpoint to trigger the daily export.
    *   Format data (appointments, patients, clinical notes) as required by HBYS.
    *   Implement robust error handling and logging for these uploads.

## Phase 5: Production Deployment (🔄 Future/Pending)

Moving from the temporary ngrok setup to a permanent production environment.

1.  **Hosting:** Deploy the NestJS backend and Next.js frontend to a permanent hosting provider (e.g., Railway, Render, DigitalOcean).
2.  **Database:** Migrate the local PostgreSQL database to a managed database service.
3.  **Update n8n:** Replace the temporary `ngrok` URLs in all n8n workflows with the permanent production domains.
