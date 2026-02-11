# Smart Health 360 – Updated Blueprint

## 1. Overview & Assumptions

- **Product**: Clinical hospital management with role-based access, record visibility (VIS_A / VIS_B), and inspection-safe emergency hide.
- **Stack**: TypeScript everywhere; Angular frontend; Node.js + Express + MongoDB backend.
- **Strict rule**: The words "public" and "private" must never appear in UI, routes, APIs, DB values, variable names, enums, comments, or logs. Only **VIS_A** and **VIS_B** are used.
- **Roles**: Receptionist, Doctor, Super Admin (SA), and optionally Lab Reporter.
- **Patient creation**: Only Receptionist can create patients; doctor assignment is required at creation.
- **Records**: Single list per patient with a Status column (VIS_A / VIS_B). No "Public/Private" tabs.
- **Emergency Hide**: SA-only mode to move all VIS_B data into vault collections so normal queries return only VIS_A; reversible and fully audited.

---

## 2. Permissions Matrix

| Action | Receptionist | Doctor | Super Admin | Lab Reporter |
|--------|--------------|--------|-------------|--------------|
| Create patient | Yes (must assign doctor) | No | No | No |
| Assign doctor at creation | Yes (required) | — | No | — |
| View patient list | All (full view) | Assigned only | All (basic) | Assigned lab tasks only |
| View VIS_A records (in-app) | Yes | Yes (assigned) | Yes | Per task |
| View VIS_B records (in-app) | Yes | Yes (assigned) | Yes | Per task |
| Export records | **VIS_A only** | VIS_A + VIS_B (assigned) | Default VIS_A only; VIS_B with override + audit | Per task, VIS_A/VIS_B per policy |
| Create/update medical entries, prescriptions, reports | No | Yes (with VIS_A/VIS_B flag) | No | Upload results (VIS_A/VIS_B) |
| Change record status VIS_A ↔ VIS_B | No | Yes (assigned, reason + audit) | Yes | No |
| Import records + tag VIS_A/VIS_B | Yes | No | No | No |
| Emergency Hide / Restore VIS_B | No | No | **Yes only** | No |
| Manage users | No | No | Yes | No |
| View audit logs | Yes (scoped) | Yes (scoped) | Full | Per task |

**Export rules (critical):**

- Receptionist: export always VIS_A only (even though they can view VIS_B in-app).
- Doctor: export includes VIS_A + VIS_B for assigned patients only.
- SA: default VIS_A only; any VIS_B export requires emergency override + audit reason.
- If Emergency Hide (inspection mode) is ON: all exports are VIS_A only unless a special vault export is explicitly allowed.

---

## 3. UX Flows

### 3.1 Patient creation (Receptionist only)

1. Receptionist opens "Register Patient".
2. Fills: name, DOB, contact, etc. **Assigns doctor (required)**.
3. Submits → patient created; redirect to patient profile or list.

### 3.2 Record list (single table, no tabs)

1. User opens patient profile.
2. Single table: all records chronologically; columns include **Status** (VIS_A / VIS_B), type, date, createdBy, etc.
3. Filters: status (VIS_A / VIS_B / all), type, date range, createdBy.
4. Actions (doctor/authorized): Create record, Attach report, Change status VIS_A ↔ VIS_B (reason required + audit).

### 3.3 Export

1. User clicks "Export" on patient profile.
2. Backend applies role + inspection mode: Receptionist → VIS_A only; Doctor → VIS_A+VIS_B (assigned); SA → VIS_A only or override with reason; if inspection mode ON → VIS_A only.
3. Audit log entry; optional PDF/ZIP generation.

### 3.4 Emergency Hide / Restore (SA only)

1. SA opens "Emergency Hide" control.
2. Confirms with reason → all VIS_B records (and report metadata) moved to vault collections; primary collections masked/cleaned; `inspectionMode` set ON; audit log with who, timestamp, reason, counts.
3. "Restore VIS_B" → reverse move; `inspectionMode` OFF; restore audit log.

---

## 4. MongoDB Schema Updates

### 4.1 Existing collections (changes)

- **patients**: `patientVisibility` (optional) `'VIS_A' | 'VIS_B'`; `primaryDoctorId` required at creation.
- **records**: `visibility` enum `['VIS_A', 'VIS_B']` (replacing PUBLIC/PRIVATE).
- **reports**: `visibility` enum `['VIS_A', 'VIS_B']`.

### 4.2 New collections

- **records_secure_vault**: Same schema as Record, plus `_movedAt`, `_movedBy`, `_originalId`; used when Emergency Hide is active.
- **reports_secure_vault**: Same as Report + vault metadata.
- **system_settings**: `{ key: 'inspectionMode', value: boolean, updatedAt, updatedBy }` (and other globals); cached in server memory with TTL.

### 4.3 Audit logs

- Existing **audit_logs** used for: emergency_hide, emergency_restore, export_override, visibility_change (VIS_A ↔ VIS_B).

---

## 5. API Endpoints (with examples)

### 5.1 Patients

- `POST /patients` – Create (Receptionist only). Body: `{ firstName, lastName, dob, primaryDoctorId, ... }`. Response: `201` + patient.
- `GET /patients?assignedTo=me&visibility=VIS_A|VIS_B` – List; visibility filter uses VIS_A/VIS_B.
- `PATCH /patients/:id/assign-doctor` – SA or Receptionist; body `{ doctorId }`.

### 5.2 Records (single list)

- `GET /patients/:id/records?status=VIS_A|VIS_B|all&type=...&fromDate=...&toDate=...&createdBy=...` – Single list; when inspection mode ON, only VIS_A from main collection.
- `POST /patients/:id/records` – Create; body includes `visibility: 'VIS_A' | 'VIS_B'`.
- `PATCH /records/:recordId/visibility` – Change status; body `{ visibility: 'VIS_A'|'VIS_B', reason: string }`; audit logged.

### 5.3 Export

- `POST /patients/:id/export` – Body: `{ format: 'PDF'|'ZIP', includeVisB?: boolean, reason?: string }`. Backend applies role + inspection mode; SA can send `includeVisB: true` + `reason` for audit.

### 5.4 Emergency Hide (SA only)

- `POST /admin/emergency-hide` – Body: `{ reason: string }`. Moves VIS_B records to `records_secure_vault`; marks VIS_B reports with `_vaulted`; sets inspectionMode ON; audit.
- `POST /admin/emergency-restore` – Restores VIS_B from vault; unsets report `_vaulted`; sets inspectionMode OFF; audit.
- `GET /admin/inspection-mode` – Read inspection mode (cached in server memory with TTL).
- Used internally by record list, report list, and export middleware.

---

## 6. Emergency Hide Design

### 6.1 Algorithm

1. Start MongoDB session (transaction if replica set).
2. Read all records where `visibility === 'VIS_B'`; insert into `records_secure_vault` with `_originalId`, `_movedAt`, `_movedBy`.
3. Delete or mask those records in `records` (e.g. remove from main collection or set a `_vaulted` flag and filter in queries).
4. Same for reports → `reports_secure_vault`.
5. Update `system_settings`: `inspectionMode = true`; cache invalidation.
6. Log audit: `EMERGENCY_HIDE`, userId, reason, counts.
7. Commit / end session.

### 6.2 Idempotency & resume

- If not using transactions: use checkpoints (e.g. batch by 100 docs); store last processed id; on restart, resume from checkpoint.
- Before move: check `inspectionMode`; if already true, skip or no-op (idempotent).
- Restore: read from vaults, insert back into records/reports, delete vault docs, set `inspectionMode = false`, audit.

### 6.3 Restore strategy

- Iterate `records_secure_vault` and `reports_secure_vault`; insert back into `records` / `reports`; delete vault document; clear inspectionMode; log EMERGENCY_RESTORE.

---

## 7. Export Filtering Implementation

- **Middleware / helper**: Before building export payload, get current user role and `inspectionMode` from cache.
- If `inspectionMode` is ON: force VIS_A only for export (no VIS_B), regardless of role.
- Else: Receptionist → VIS_A only; Doctor → VIS_A + VIS_B for assigned; SA → VIS_A only unless request has `includeVisB: true` + `reason` (then audit and include VIS_B).
- All exports logged in audit_logs (who, patientId, format, scope VIS_A/VIS_B, timestamp).

---

## 8. Angular Screens / Components / Routes

- **Patient list**: Filters by status VIS_A/VIS_B (query param `visibility=VIS_A|VIS_B`); no "Public/Private" button labels; use "VIS_A" / "VIS_B".
- **Patient profile**: One table for all records; columns: Type, Status (VIS_A/VIS_B), Date, CreatedBy, Actions (create, attach, change status with reason); filters: status, type, date range, createdBy.
- **Patient form**: Receptionist only; required doctor dropdown; no "Private patient" checkbox or replace with "Default record visibility: VIS_A / VIS_B" if needed.
- **Export**: Button on profile; dialog optional for SA (override + reason).
- **Admin**: SA-only route for Emergency Hide / Restore control; display current inspection mode.

---

## 9. Realtime & WhatsApp Integration Plan

- **Realtime**: Socket.IO (preferred) or SSE; server emits events (e.g. `prescription_submitted`, `lab_result_ready`) to relevant users; store notifications in **notifications** collection (read/unread + payload).
- **WhatsApp**: Use provider API (e.g. Twilio, WhatsApp Business API) to send appointment booking + prescription submission; keep Nodemailer as email fallback.
- **Flow**: Doctor submits prescription → backend saves; creates notification; pushes via Socket.IO to receptionist/lab; sends WhatsApp to patient (and email via Nodemailer).

---

## 10. CI Enforcement (Forbidden Keywords)

- **Script**: `scripts/check-forbidden-words.js` (or .ts) scans repo for the strings `"public"` and `"private"` (and `PUBLIC`/`PRIVATE` where they denote visibility).
- **Exclusions**: TypeScript member modifiers (`private x`, `public x`); `package.json` field `"private": true`; `angular.json` build `"input": "public"`; node_modules/dist.
- **Integration**: `npm run check:forbidden`; CI (e.g. GitHub Actions) runs this before build; **build fails** if any forbidden use is found.

---

## Constraints Summary

- TypeScript everywhere; simple, clean code.
- No forbidden words (public/private) anywhere; only VIS_A and VIS_B.
- Single table UI for records; no tabs.
- Emergency hide/restore is SA-only, transaction-safe where possible, and fully audited.
- Export always authorization-filtered and must not leak VIS_B when forbidden.
