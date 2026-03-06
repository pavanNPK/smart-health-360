# Patient Details Module

## Folder structure and files added

### Backend

```
backend/src/
├── models/
│   ├── VisitRecord.ts          # Visit/encounter (NEW, FOLLOWUP, CONTINUATION)
│   ├── Prescription.ts          # Prescription with medicines, tests/xray, approval
│   └── PatientAttachment.ts    # Medicine/X-Ray metadata and file links
├── controllers/
│   ├── patientDetailsController.ts   # GET /patients/:id/details
│   ├── visitRecordsController.ts    # GET/POST /patients/:id/visit-records
│   ├── prescriptionsController.ts   # GET/POST prescriptions, PUT /prescriptions/:id
│   └── attachmentsController.ts     # GET/POST /patients/:id/attachments
├── services/
│   ├── notification.ts         # Email + WhatsApp provider interfaces + stubs
│   └── prescriptionService.ts  # Finalize prescription → trigger notifications
└── routes/
    └── prescriptions.ts        # PUT /prescriptions/:id
```

- **patients.ts** (updated): added routes for `/:id/details`, `/:id/visit-records`, `/:id/prescriptions`, `/:id/attachments`.
- **app.ts** (updated): mounted `prescriptionsRoutes` at `/prescriptions`.

### Frontend

```
frontend/src/app/features/
├── patient-details/
│   └── patient-details.ts           # Tab container (Settings, Records, Prescription, Medicine/X-Ray)
├── patient-settings-tab/
│   └── patient-settings-tab.ts      # Patient info + edit link
├── patient-records-tab/
│   └── patient-records-tab.ts      # Visit records list + create (receptionist)
├── patient-prescription-tab/
│   └── patient-prescription-tab.ts  # Prescriptions list, add/edit, view/print, doctor approval
└── patient-medicine-xray-tab/
    └── patient-medicine-xray-tab.ts # Attachments list + add (receptionist)
```

- **app.routes.ts** (updated): added `patients/:id/details` under reception, doctor, and admin.
- **patient-profile** (updated): added “Patient details” button linking to `.../details`.
- **core/api.ts** (updated): added `put<T>()` for prescription update.

---

## Sample MongoDB documents

### Patient (existing schema; reference only)

```json
{
  "_id": "ObjectId(\"...\")",
  "firstName": "John",
  "lastName": "Doe",
  "dob": "1990-05-15T00:00:00.000Z",
  "gender": "M",
  "contactEmail": "john.doe@example.com",
  "contactPhone": "+919876543210",
  "contactPhoneNormalized": "919876543210",
  "primaryDoctorId": "ObjectId(\"...\")",
  "patientVisibility": "VIS_A",
  "createdBy": "ObjectId(\"...\")",
  "createdAt": "2025-03-01T10:00:00.000Z",
  "updatedAt": "2025-03-01T10:00:00.000Z"
}
```

### VisitRecord

```json
{
  "_id": "ObjectId(\"...\")",
  "patientId": "ObjectId(\"...\")",
  "visitType": "NEW",
  "visitedAt": "2025-03-06T09:00:00.000Z",
  "diseaseSummary": "Fever and cough",
  "diagnosis": "Upper respiratory infection",
  "treatedByDoctorId": "ObjectId(\"...\")",
  "prescribedMedicinesSummary": "Paracetamol, Cough syrup",
  "notes": "Advise rest and fluids.",
  "createdByRole": "RECEPTIONIST",
  "createdByUserId": "ObjectId(\"...\")",
  "createdAt": "2025-03-06T10:00:00.000Z",
  "updatedAt": "2025-03-06T10:00:00.000Z"
}
```

### Prescription

```json
{
  "_id": "ObjectId(\"...\")",
  "patientId": "ObjectId(\"...\")",
  "writtenByDoctorId": "ObjectId(\"...\")",
  "enteredByReceptionistId": "ObjectId(\"...\")",
  "enteredAt": "2025-03-06T10:30:00.000Z",
  "prescriptionDate": "2025-03-06T00:00:00.000Z",
  "complaintSymptoms": "Fever, cough",
  "diagnosis": "Viral URTI",
  "medicines": [
    {
      "name": "Paracetamol",
      "dosageText": "1-0-1",
      "frequencyPerDay": 2,
      "days": 5,
      "instructions": "After food",
      "beforeFood": false
    }
  ],
  "testsOrXray": [
    { "type": "LAB", "name": "CBC", "notes": "If fever persists" }
  ],
  "followUpDate": "2025-03-13T00:00:00.000Z",
  "status": "FINAL",
  "doctorApproval": {
    "approved": true,
    "approvedAt": "2025-03-06T11:00:00.000Z",
    "approvedByDoctorId": "ObjectId(\"...\")",
    "remarks": "OK"
  },
  "createdByRole": "RECEPTIONIST",
  "updatedByRole": "DOCTOR",
  "createdAt": "2025-03-06T10:30:00.000Z",
  "updatedAt": "2025-03-06T11:00:00.000Z"
}
```

### PatientAttachment

```json
{
  "_id": "ObjectId(\"...\")",
  "patientId": "ObjectId(\"...\")",
  "category": "XRAY",
  "name": "Chest X-Ray",
  "description": "PA view",
  "fileUrl": "https://storage.example.com/reports/xyz.pdf",
  "prescriptionId": "ObjectId(\"...\")",
  "createdBy": "ObjectId(\"...\")",
  "createdByRole": "RECEPTIONIST",
  "createdAt": "2025-03-06T12:00:00.000Z",
  "updatedAt": "2025-03-06T12:00:00.000Z"
}
```

---

## How to run

### Prerequisites

- Node.js 18+
- MongoDB
- Existing auth: `req.user` with `{ id, role }` (RECEPTIONIST | DOCTOR | SUPER_ADMIN)

### Backend

```bash
cd backend
cp .env.example .env   # if needed; set MONGODB_URI, JWT_SECRET, etc.
npm install
npm run build
npm run dev
```

- API base: `http://localhost:3000` (or `APP_PORT` from `.env`).

### Frontend

```bash
cd frontend
npm install
npm start
```

- App: `http://localhost:4200`. Log in as Receptionist/Doctor/Super Admin and open a patient, then use **“Patient details”** to open the tabbed module.

### Using the Patient Details module

1. **Reception** or **Doctor** or **Admin** → **Patients** → click the **eye icon (View)** on a row to open the **Patient Details** tabbed page (Settings, Records, Prescription, Medicine / X-Ray Data).
2. Alternatively, open a patient’s profile first, then click **“Patient details”** to open the same tabbed page.
3. **Settings**: view patient info; **Edit patient** (reception/admin) goes to existing edit form.
4. **Records**: filter by visit type (New / Follow-up / Continuation); **New record** (reception only).
5. **Prescription**: **Add prescription** (reception); enter from paper, add/remove medicines and tests; save as **Draft** or **Finalize**. On finalize, email (and optional WhatsApp) is triggered via `NotificationService`. Doctor can **Approve** and add remarks; **View** and **Print** available.
6. **Medicine / X-Ray Data**: list attachments; **Add attachment** (reception) with category, name, optional description and file URL.

### Notifications (stubs)

- **Email**: `backend/src/services/notification.ts` uses existing `mail.ts` when `MAIL_*` env vars are set; otherwise logs only.
- **WhatsApp**: `stubWhatsAppProvider` logs and delegates to existing `whatsapp.ts` (Twilio) when configured; replace with Meta/Twilio as needed via `setWhatsAppProvider()`.

### Demo seed script (records + prescriptions)

To get sample data in the tabs (visit records, prescriptions, attachments), run:

```bash
cd backend
npm run seed:patient-details
```

**Requirements:** At least one **DOCTOR** and one **RECEPTIONIST** user must exist (create via the app or after `npm run seed` for admin, then add users).

The script creates (or reuses) a **"Demo Patient"** and adds 3 visit records, 2 prescriptions (1 FINAL, 1 DRAFT), and 2 attachments. Then open **Patients**, find **"Demo Patient"**, and click the **eye icon** to open Patient Details with all tabs filled.

### Troubleshooting

- **"Not found" or "Patient not found"** — The patient ID may not exist, or the backend may not be running. Restart the backend (`npm run dev`), ensure the patient exists in the list, and use the eye icon from the list to open details.
- **Prescription update fails** — Ensure `proxy.conf.json` includes `"/prescriptions"` and restart `ng serve` after changing the proxy.

---

## API summary

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/patients/:id/details` | All (view) | Patient + summary counts |
| GET | `/patients/:id/visit-records` | All (view) | List visit records (query: visitType, page, limit) |
| POST | `/patients/:id/visit-records` | RECEPTIONIST | Create visit record |
| GET | `/patients/:id/prescriptions` | All (view) | List prescriptions (query: status, page, limit) |
| POST | `/patients/:id/prescriptions` | RECEPTIONIST | Create prescription |
| PUT | `/prescriptions/:id` | RECEPTIONIST (edit) / DOCTOR (approval) | Update or finalize or approve |
| GET | `/patients/:id/attachments` | All (view) | List attachments (query: category, page, limit) |
| POST | `/patients/:id/attachments` | RECEPTIONIST | Add attachment (metadata / fileUrl) |

All routes require `Authorization: Bearer <token>` and patient view permission (existing `canViewPatientAsync`).
