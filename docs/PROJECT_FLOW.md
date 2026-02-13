# Smart Health 360 – End-to-End Project Flow (Pin-to-Pin)

This document explains how the application connects end-to-end: how users log in, how data is rendered, and **who can see what** and **who can do what** by role. Use it to explain the project in demos.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  BROWSER (localhost:4200)                                                    │
│  Angular Frontend                                                            │
│  • Login → Session (JWT + user in sessionStorage)                            │
│  • All API calls: Authorization: Bearer <accessToken>                       │
│  • Routes & sidebar depend on user.role (SUPER_ADMIN | DOCTOR | RECEPTIONIST)│
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ HTTP (same origin in dev)
                                    │ Proxy: /auth, /patients, /users, /audit...
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  BACKEND (localhost:3000) – Express + MongoDB                                │
│  • authMiddleware: reads JWT → sets req.user (id, role, email, clinicId)     │
│  • roleGuard: allows/denies by role per route                                │
│  • Controllers: filter data by role (e.g. doctor sees only assigned patients)│
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  MONGODB                                                                     │
│  Collections: User, Patient, Record, AuditLog, Area, Clinic, etc.           │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Frontend**: Angular, PrimeNG. `apiUrl: ''` so dev server proxies `/auth`, `/patients`, etc. to backend.
- **Backend**: Express. Every authenticated request gets `req.user` from JWT (id, role, email, clinicId).
- **Data rendering**: Components call `Api.get/post/patch/delete(...)`. Backend returns JSON. Frontend binds to templates (tables, forms, cards).

---

## 2. Auth Flow (Pin-to-Pin)

### 2.1 Login

| Step | Where | What happens |
|------|--------|--------------|
| 1 | User enters email/password on `/login` | `Auth.login(email, password)` |
| 2 | Frontend | `POST /auth/login` with `{ email, password }` (no token yet) |
| 3 | Backend | Validates credentials, loads user from DB (role, clinicId, etc.) |
| 4 | Backend | Issues JWT: `{ id, role, email, clinicId }` + refreshToken, returns `{ accessToken, refreshToken, user }` |
| 5 | Frontend | Saves `accessToken`, `refreshToken`, `user` in **sessionStorage**; `currentUserSubject.next(user)` |
| 6 | Frontend | Redirect: SA → `/admin/dashboard`, Doctor → `/doctor/dashboard`, Receptionist → `/reception/patients` |

### 2.2 Every API Call After Login

| Step | Where | What happens |
|------|--------|--------------|
| 1 | Frontend | `Api.get('/patients', params)` → `HttpClient.get(url, { headers: { Authorization: 'Bearer ' + accessToken } })` |
| 2 | Dev server | Proxies request to backend (e.g. `GET http://localhost:3000/patients?...`) with same headers |
| 3 | Backend | `authMiddleware`: verifies JWT, sets `req.user = { id, role, email, clinicId }` |
| 4 | Backend | Route-specific `roleGuard` (if any): e.g. `roleGuard('SUPER_ADMIN')` → only SA passes |
| 5 | Backend | Controller runs, **filters data by role** (see tables below), returns JSON |
| 6 | Frontend | Component receives response, updates state (e.g. `this.patients = res.data`), template re-renders |

So: **same API path** (e.g. `GET /patients`) can return **different data** depending on **who is in the JWT** (role + clinicId + id).

---

## 3. Roles and Routes (Who Sees Which URL)

Roles never mix: each role has its own path prefix and sidebar.

| Role | Path prefix | Landing after login | Sidebar (main links) |
|------|-------------|---------------------|----------------------|
| **SUPER_ADMIN** | `/admin/*` | `/admin/dashboard` | Dashboard, Admin (Users, Areas, Clinics, Hierarchy, **Patients**), System (Audit) |
| **DOCTOR** | `/doctor/*` | `/doctor/dashboard` | Dashboard, Patients, Staff, System (Audit) |
| **RECEPTIONIST** | `/reception/*` | `/reception/patients` | Patients, Doctors, System (Audit) |

- SA **never** uses `/reception/*` for patients; they use **`/admin/patients`**.
- Receptionist uses **`/reception/patients`**.
- Doctor uses **`/doctor/patients`** (only patients assigned to them, or same-clinic doctor’s patients in detail view).

### 3.1 Frontend route → component mapping

| Route | Component | Who can open |
|-------|-----------|----------------|
| `/login` | Login | Anyone (not logged in) |
| `/verify-email` | VerifyEmail | Anyone (set password with OTP) |
| `/admin/dashboard` | AdminDashboard | SA only |
| `/admin/users` | UserManagement | SA only |
| `/admin/areas` | AdminAreas | SA only |
| `/admin/clinics` | AdminClinics | SA only |
| `/admin/hierarchy` | AdminHierarchy | SA only |
| `/admin/patients` | PatientList | SA only |
| `/admin/patients/:id` | PatientProfile | SA only |
| `/admin/patients/:id/edit` | PatientForm | SA only |
| `/admin/patients/:id/import` | PatientImport | SA only |
| `/admin/audit` | AuditViewer | SA only |
| `/doctor/dashboard` | DoctorDashboard | Doctor only |
| `/doctor/patients` | DoctorPatientList | Doctor only |
| `/doctor/patients/:id` | PatientProfile | Doctor only |
| `/doctor/staff` | DoctorStaff | Doctor only |
| `/doctor/audit` | AuditViewer | Doctor only |
| `/reception/patients` | PatientList | Receptionist only |
| `/reception/patients/:id` | PatientProfile | Receptionist only |
| `/reception/patients/new` | PatientForm | Receptionist only |
| `/reception/patients/:id/edit` | PatientForm | Receptionist only |
| `/reception/patients/:id/import` | PatientImport | Receptionist only |
| `/reception/doctors` | ReceptionDoctors | Receptionist only |
| `/reception/audit` | AuditViewer | Receptionist only |

Guards: `authGuard` (must be logged in); `roleGuard` with `data.roles` so only the right role can open each block.

---

## 4. Backend API → Role → Data (Pin-to-Pin)

### 4.1 Auth (no role guard on login)

| Method | Path | Who | What |
|--------|------|-----|------|
| POST | `/auth/login` | Anyone | Login; returns tokens + user (role, clinicId, etc.) |
| POST | `/auth/refresh` | Anyone (with refresh token) | New accessToken |
| POST | `/auth/send-otp` | Anyone | Send OTP for new user |
| POST | `/auth/verify-otp` | Anyone | Verify OTP, set password, return tokens |
| GET | `/auth/me` | Authenticated | Current user (used to refresh session) |

### 4.2 Users (SA only)

| Method | Path | Who | What |
|--------|------|-----|------|
| GET | `/users` | SA | List all users (paginated) |
| POST | `/users` | SA | Create user (Doctor/Receptionist/SA) |
| PATCH | `/users/:id` | SA | Update user |
| DELETE | `/users/:id` | SA | Delete user |

### 4.3 Patients (filtered by role)

| Method | Path | Who | Backend behavior / who can operate |
|--------|------|-----|------------------------------------|
| GET | `/patients` | All authenticated | **listPatients**: SA = all; Doctor = `primaryDoctorId = user.id`; Receptionist = patients whose primary doctor is in **same clinic** |
| GET | `/patients/stats` | SA (or Doctor with `assignedTo=me`) | Counts (total, VIS_A, VIS_B) |
| GET | `/patients/:id` | All authenticated | **getPatient**: allowed if **canViewPatientAsync** – SA all; Receptionist all; Doctor = self as primary **or** patient’s primary doctor in **same clinic** |
| POST | `/patients` | Receptionist only | Create patient (assign primary doctor) |
| PATCH | `/patients/:id` | Receptionist, SA | Update patient |
| DELETE | `/patients/:id` | Receptionist, SA | Delete patient |
| PATCH | `/patients/:id/assign-doctor` | SA only | Assign primary doctor |

So: **Doctor** can **view** a patient if they are the primary doctor **or** the patient’s primary doctor is in the same clinic; Doctor **cannot** create/update/delete patients.

### 4.4 Records (per patient; permission = can view patient + record visibility)

| Method | Path | Who | Backend behavior |
|--------|------|-----|-------------------|
| GET | `/patients/:id/records` | Authenticated | **listRecords**: same as getPatient – must pass **canViewPatientAsync**; then each record filtered by **canViewRecord** (VIS_A: all three roles; VIS_B: Doctor if assigned/primary, SA always; Receptionist no) |
| GET | `/patients/:id/records/summary` | Authenticated | Same permission as getPatient |
| POST | `/patients/:id/records` | Authenticated | **createRecord**: must pass canViewPatientAsync (so Doctor can add records for same-clinic patients too) |
| PATCH | `/records/:recordId/visibility` | Authenticated | **updateVisibility**: allowed if **canChangeVisibility** – SA; Doctor (if primary or unassigned); Receptionist if can view patient |

### 4.5 Audit (scoped by role)

| Method | Path | Who | Backend behavior |
|--------|------|-----|-------------------|
| GET | `/audit` | SA, Doctor, Receptionist | **listAuditLogs**: SA = all; Doctor = self + **same-clinic receptionists**; Receptionist = self only |

Every other authenticated request is also logged as `API_ACCESS` by **auditRequestMiddleware** (method, path, status, role).

### 4.6 Areas, Clinics, Admin, Export/Import (summary)

| Resource | List/Create/Update/Delete | Who |
|-----------|---------------------------|-----|
| Areas | All operations | SA only |
| Clinics | List: SA + Doctor + Receptionist (Doctor/Receptionist see own clinic); Create/Patch/Delete | SA only |
| Admin stats | GET `/admin/stats` | SA only |
| Export/Import | Controllers check **canViewPatient** / **canExportVisB** etc. | SA, Doctor (own/same-clinic), Receptionist (clinic) as per permissions |

---

## 5. Permission Matrix (Who Can See / Operate)

### 5.1 Patients

| Action | SUPER_ADMIN | DOCTOR | RECEPTIONIST |
|--------|-------------|--------|--------------|
| List patients | All | Only assigned to me (primaryDoctorId = me) | Only where primary doctor in my clinic |
| View patient profile | Any | If I’m primary **or** primary doctor in my clinic | Any (in their clinic in practice) |
| Create patient | No (uses UI under admin) | No | Yes |
| Edit patient | Yes | No | Yes |
| Delete patient | Yes | No | Yes |
| Assign doctor | Yes | No | No |

### 5.2 Records (per patient)

| Action | SUPER_ADMIN | DOCTOR | RECEPTIONIST |
|--------|-------------|--------|--------------|
| See VIS_A records | Yes | Yes (if can view patient) | Yes (if can view patient) |
| See VIS_B records | Yes | Yes if I’m assigned/primary for that patient | No |
| Create record | Yes (if can view patient) | Yes (if can view patient, incl. same-clinic) | Yes (if can view patient) |
| Change visibility (VIS_A ↔ VIS_B) | Yes | Yes if primary or unassigned patient | Yes if can view patient |

### 5.3 Users, Areas, Clinics, Audit

| Resource | SUPER_ADMIN | DOCTOR | RECEPTIONIST |
|----------|-------------|--------|--------------|
| Users (CRUD) | Full | No | No |
| Areas (CRUD) | Full | No | No |
| Clinics (list own / all) | All | Own clinic | Own clinic |
| Clinics (create/update/delete) | Full | No | No |
| Audit logs | All | Self + same-clinic receptionists | Self only |

---

## 6. Data Flow Examples (Pin-to-Pin)

### 6.1 Doctor opens “Patients” list

1. User (Doctor) is on `/doctor/patients` → **DoctorPatientList** loads.
2. Component calls `Api.get('/patients', { assignedTo: 'me' })` with `Authorization: Bearer <token>`.
3. Backend **listPatients**: `req.user.role === 'DOCTOR'` → `filter.primaryDoctorId = user.id` → MongoDB returns only patients where primary doctor = this doctor.
4. Response `{ data, total, page, limit }` → component sets `this.patients = res.data`, table shows rows.

### 6.2 Doctor opens a patient profile

1. User clicks a patient → navigates to `/doctor/patients/:id`.
2. **PatientProfile** loads, calls `Api.get('/patients/' + id)`.
3. Backend **getPatient**: loads patient, then **canViewPatientAsync(patient, user)** – true if doctor is primary **or** patient’s primary doctor is in same clinic → 200 + patient JSON.
4. Component loads patient, then calls `Api.get('/patients/' + id + '/records')` for the records table.
5. Backend **listRecords**: same canViewPatientAsync; then each record filtered by **canViewRecord** (VIS_A/VIS_B rules) → 200 + `{ data: records, total, page, limit }`.
6. Table and summary render from that data.

### 6.3 SA opens Audit

1. User (SA) is on `/admin/audit` → **AuditViewer** loads.
2. Component calls `Api.get('/audit', { page, limit })`.
3. Backend **listAuditLogs**: `user.role === 'SUPER_ADMIN'` → no filter on userId → returns all audit logs (paginated).
4. Table shows all logs.

### 6.4 Receptionist creates patient

1. User (Receptionist) is on `/reception/patients/new` → **PatientForm**.
2. Submits form → `Api.post('/patients', { firstName, lastName, dob, primaryDoctorId, ... })`.
3. Backend **createPatient**: route has `roleGuard('RECEPTIONIST')` → only receptionist; controller creates patient, may send registration email.
4. Frontend redirects to patient profile or list.

---

## 7. Connection Summary Diagram

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    LOGIN                                 │
                    │  POST /auth/login → JWT (id, role, email, clinicId)     │
                    │  Frontend: sessionStorage + currentUser$                │
                    └───────────────────────────┬─────────────────────────────┘
                                                │
         ┌──────────────────────────────────────┼──────────────────────────────────────┐
         │                                      │                                      │
         ▼                                      ▼                                      ▼
┌─────────────────┐                  ┌─────────────────┐                  ┌─────────────────┐
│  SUPER_ADMIN    │                  │  DOCTOR         │                  │  RECEPTIONIST   │
│  /admin/*       │                  │  /doctor/*      │                  │  /reception/*   │
│                 │                  │                 │                  │                 │
│ • Users (CRUD)  │                  │ • My patients  │                  │ • Patients      │
│ • Areas, Clinics│                  │ • My + clinic  │                  │   (clinic list) │
│ • Hierarchy     │                  │   patient view │                  │ • Doctors list   │
│ • All patients  │                  │ • Staff, Audit  │                  │ • Register pt   │
│ • All audit     │                  │ • Audit (me +  │                  │ • Audit (self)  │
│ • Emergency     │                  │   clinic recept)                   │                 │
└────────┬────────┘                  └────────┬────────┘                  └────────┬────────┘
         │                                    │                                    │
         │  All API calls: Authorization: Bearer <accessToken>                    │
         │  Backend: authMiddleware → req.user; roleGuard per route;              │
         │  Controllers filter data by role (listPatients, getPatient, listAudit)  │
         ▼                                    ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  BACKEND (Express)                                                                       │
│  /auth, /users, /patients, /records, /audit, /areas, /clinics, /admin, /reports, ...   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  MONGODB: User, Patient, Record, AuditLog, Area, Clinic, ...                             │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Quick Reference: Who Can See Who / What

| Question | Answer |
|----------|--------|
| Who can see all patients? | SUPER_ADMIN (via `/admin/patients`). |
| Who can see “my” patients only? | DOCTOR (primary doctor = me). |
| Who can see patients in “my clinic”? | RECEPTIONIST (primary doctor in my clinic); DOCTOR can **view** a patient if that patient’s primary doctor is in my clinic. |
| Who can see all audit logs? | SUPER_ADMIN. |
| Who can see audit for self + same-clinic receptionists? | DOCTOR. |
| Who can see only own audit? | RECEPTIONIST. |
| Who can create/edit/delete patients? | RECEPTIONIST and SUPER_ADMIN (Doctor: view only, plus add records if can view patient). |
| Who can change record visibility (VIS_A/VIS_B)? | SA always; Doctor if primary or unassigned; Receptionist if can view patient. |

---

This document is the single pin-to-pin reference for: how the app connects (frontend → API → backend → DB), how data is filtered by role, and who can see and operate what. Use it alongside the demo to explain the flow.
