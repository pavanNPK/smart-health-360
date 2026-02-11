# Smart Health 360 – Clinical Hospital (VIS_A / VIS_B Records)

Clinical hospital system with role-based record visibility (VIS_A / VIS_B): **Angular 20** frontend, **Node.js + Express + TypeScript** API, **MongoDB** (database: **medical_coding**), and **Nodemailer** for email.

## Quick start

### 1. Backend (API)

- Uses **MongoDB** database **medical_coding** (connection string in `.env`).
- Create `.env` in `backend/` from `backend/.env.example` and set `DB_URL`, JWT and mail secrets.

```bash
cd backend
npm install
npm run build
# Create Super Admin (run once)
npm run seed
# Start API
npm run dev
```

API runs at **http://localhost:3000**.  
Seed creates Super Admin: `admin@hospital.com` / `Admin123!` (override with `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`).

### 2. Frontend (Angular 20)

```bash
cd frontend
npm install
npm start
```

App runs at **http://localhost:4200**.  
Set `apiUrl` in `frontend/src/environments/environment.ts` if the API is not on `http://localhost:3000`.

### 3. First login

1. Log in as Super Admin: `admin@hospital.com` / `Admin123!`.
2. In **Admin → Users**, create a **Receptionist** and a **Doctor**.
3. In **Patients**, register a patient (Receptionist).
4. In **Admin → Users** (or a future “Assign doctor” flow), assign the doctor to the patient (PATCH `/patients/:id/assign-doctor` with `doctorId`).
5. Log in as Doctor to see **Dashboard → My Patients** and open a patient to view records (single table with Status VIS_A / VIS_B).

## Flow summary

- **Receptionist**: Create patients (must assign doctor), view patient list and profile (VIS_A + VIS_B in-app), import records with VIS_A/VIS_B tag; export is **VIS_A only**.
- **Doctor**: Dashboard (assigned patients), patient profile single table (Status VIS_A/VIS_B), create/update records, change status VIS_A ↔ VIS_B (reason + audit), export VIS_A + VIS_B for assigned patients.
- **Super Admin**: User management, assign doctor, audit logs, emergency hide/restore VIS_B; cannot create patients.

MongoDB is connected to the **medical_coding** database as per your `DB_URL`. All collections (users, patients, records, reports, audit_logs, imports) are created in that database.

## API overview

- **Auth**: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/send-otp`, `POST /auth/verify-otp`
- **Users** (SA): `POST /users`, `GET /users`, `PATCH /users/:id`
- **Patients**: `POST /patients`, `GET /patients`, `GET /patients/:id`, `PATCH /patients/:id/assign-doctor`
- **Records**: `POST /patients/:id/records`, `GET /patients/:id/records?status=VIS_A|VIS_B|all&type=...&fromDate=...&toDate=...`, `PATCH /records/:recordId/visibility`
- **Emergency Hide** (SA only): `POST /admin/emergency-hide` (body: `{ reason }`), `POST /admin/emergency-restore`, `GET /admin/inspection-mode`
- **Reports**: `POST /patients/:id/reports` (multipart), `GET /patients/:id/reports`
- **Import**: `POST /patients/:id/import`
- **Export**: `POST /patients/:id/export`
- **Audit** (SA): `GET /audit`

Export is role-filtered: Receptionist = VIS_A only; Doctor = VIS_A + VIS_B for assigned patients; SA = configurable (default VIS_A only; VIS_B requires override + audit). When **inspection mode** (Emergency Hide) is ON, all exports are VIS_A only.

**Migration**: If you have existing patients with the old `isPrivatePatient` field, run once: `cd backend && npm run migrate:patient-visibility`.

---

## How doctors and Super Admin are registered

### Super Admin

- **Only via seed script** (no UI). Run once:
  ```bash
  cd backend && npm run seed
  ```
- Creates one Super Admin (default: `admin@hospital.com` / `Admin123!`). Override with env: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`.

### Doctors and Receptionists (OTP email verification)

- **Super Admin** creates them in **Admin → Users** (User Management).
- **Default flow (OTP):** Leave **Password** blank → Create user. The user is created with status **PENDING_VERIFICATION** and a **6-digit OTP is sent to their email** (valid 15 minutes). They must:
  1. Go to **Verify email** (link on login page or `/verify-email`).
  2. Enter **email**, **OTP**, and **new password**.
  3. Submit → account becomes **ACTIVE** and they are logged in.
- **Optional (no OTP):** Enter a password when creating the user → user is created as **ACTIVE** and can log in immediately (no email verification).
- **Resend OTP:** In User Management, users with status **PENDING_VERIFICATION** have a **Resend OTP** button; the new user can also use **Resend OTP** on the Verify email page.
- If they try to **log in** before verifying, they see “Please verify your email first” and are redirected to Verify email.
