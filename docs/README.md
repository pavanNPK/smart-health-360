# Smart Health 360 - Project Flow

This document explains the Smart Health 360 project flow from patient entry to doctor consultation, record storage, visibility control, audit handling, and future workflow plans.

The application is currently built for three main users:

- **Super Admin (SA)**: hospital owner/admin/trusted head person who controls users, clinics, audit, and high-level permissions.
- **Doctor**: sees assigned patients, patient history, records, prescriptions, medicines, reports, and waiting-room flow.
- **Receptionist**: registers patients, assigns doctor, manages queue-related patient entry, enters prescription/supporting data where allowed, and helps operate the hospital front desk.

The main business idea is that the hospital can run normal digital patient management while also controlling which patient records are visible as normal records and which records are treated as incognito records using `VIS_A` and `VIS_B`.

---

## 1. One-Line Project Summary

Smart Health 360 is a hospital workflow system where the receptionist registers the patient, the doctor sees the patient digitally, records and prescriptions are maintained in one place, and the hospital can mark selected patient data as normal (`VIS_A`) or incognito (`VIS_B`) based on internal trust and audit requirements.

---

## 2. Simple Real-World Story

Imagine a patient named **Ramesh Kumar** walks into the hospital.

1. Ramesh reaches the reception.
2. Receptionist registers Ramesh in the system.
3. Receptionist assigns Ramesh to **Dr. Arjun**.
4. Ramesh appears in the doctor's patient list or waiting-room screen.
5. Doctor opens Ramesh's profile and sees:
   - basic details,
   - previous visits,
   - diagnosis history,
   - prescription history,
   - medicine history,
   - X-ray or lab attachments,
   - current visit notes.
6. Doctor completes consultation and adds the medical record or prescription.
7. The record is saved as either:
   - `VIS_A`: normal visible hospital record,
   - `VIS_B`: incognito/sensitive record.
8. If required later, an authorized person can change the record from `VIS_A` to `VIS_B`, or from `VIS_B` back to `VIS_A`.
9. During audit/inspection mode, `VIS_B` data can be hidden from normal views and exports, while `VIS_A` data remains visible.

So the hospital gets a digital system for daily work plus controlled visibility for sensitive records.

---

## 3. Main Actors And Their Work

### 3.1 Receptionist

The receptionist is the front-desk operator.

Main responsibilities:

- Register new patients.
- Search existing patients.
- Assign each patient to a doctor.
- Maintain basic patient information.
- Add visit support data where allowed.
- Add medicine/X-ray attachment links or reports where allowed.
- Help create a digital waiting-room flow.
- View patient records based on system permission.

Example:

Ramesh comes to the hospital for fever. The receptionist creates his patient profile, enters mobile number, age/date of birth, gender, and assigns him to Dr. Arjun. Ramesh now appears in the system instead of being managed only on paper.

### 3.2 Doctor

The doctor is the consultation user.

Main responsibilities:

- See assigned patients.
- Open patient details before or during consultation.
- Check previous visit history.
- Check medicine and prescription history.
- Add diagnosis, advice, prescription, and follow-up notes.
- Approve or review prescription entries when needed.
- Change record visibility when authorized.
- Use the system as a digital patient screen and workflow tool.

Example:

Dr. Arjun opens the waiting-room list and sees Ramesh is next. Before calling him inside, the doctor can open Ramesh's profile and see that he came two months ago for cough and was prescribed a medicine. This reduces repeated questions and helps treatment continuity.

### 3.3 Super Admin

The Super Admin is the highest-control role.

Main responsibilities:

- Create doctors and receptionists.
- Manage hospital/clinic setup.
- View broader patient and audit data.
- Assign or change doctor mapping where allowed.
- Monitor system activity.
- Control emergency hide/restore features.
- Handle trusted administrative operations.

Example:

The hospital owner or trusted senior person creates a new doctor account, assigns staff to clinics, checks audit logs, and controls emergency incognito visibility when needed.

---

## 4. VIS_A And VIS_B Explanation

The system uses two visibility levels:

| Term | Simple Meaning | Practical Meaning |
|------|----------------|-------------------|
| `VIS_A` | Normal visible record | Regular patient record visible in normal hospital workflow and normal exports |
| `VIS_B` | Incognito/sensitive record | Controlled record that can be hidden during inspection/audit mode and protected from normal export |

In discussions, these may be described as "normal/incognito" records. In the application and project documentation, the terms are `VIS_A` and `VIS_B`.

### 4.1 VIS_A Real Example

Patient: **Ramesh Kumar**  
Visit reason: fever and cough  
Doctor: Dr. Arjun  
Record status: `VIS_A`

This means:

- It is a normal hospital record.
- Doctor can see it.
- Reception/front desk can see it based on permission.
- It can appear in standard patient history.
- It can be included in normal reports/exports based on role.

This is suitable for regular outpatient treatment history.

### 4.2 VIS_B Real Example

Patient: **Suresh Reddy**  
Visit reason: sensitive internal consultation  
Doctor: Dr. Arjun  
Record status: `VIS_B`

This means:

- It is stored in the system but treated as incognito/sensitive.
- Authorized doctors/admins can see it when the system is in normal mode.
- During audit/inspection mode, the system can hide this record from normal screens and exports.
- It gives the hospital controlled visibility over sensitive patient entries.

This is suitable for records that the hospital wants to handle with extra discretion.

---

## 5. Changing VIS_A To VIS_B And VIS_B To VIS_A

The system supports changing visibility during the patient lifecycle.

### 5.1 Normal To Incognito

Example:

1. Ramesh is registered as a normal patient.
2. His first visit is saved as `VIS_A`.
3. Later, hospital decides this record should be treated as incognito.
4. Authorized user changes the status from `VIS_A` to `VIS_B`.
5. From that point, the record follows incognito visibility rules.

Result:

The patient exists in the system, but that specific record becomes controlled/sensitive.

### 5.2 Incognito To Normal

Example:

1. Suresh has a record saved as `VIS_B`.
2. Later, hospital decides it can be part of normal history.
3. Authorized user changes the status from `VIS_B` to `VIS_A`.
4. The record returns to normal visible workflow.

Result:

The record becomes part of normal patient history and normal visibility rules again.

### 5.3 Why This Matters

Hospitals do not always know the final visibility requirement at the time of registration. Sometimes the decision happens later. The application supports this by allowing controlled movement between `VIS_A` and `VIS_B`, with audit tracking.

---

## 6. Complete Start-To-End Flow

```
Patient arrives
    |
    v
Receptionist searches existing patient or creates new patient
    |
    v
Receptionist assigns doctor
    |
    v
Patient appears in doctor's workflow / waiting-room list
    |
    v
Doctor opens patient details
    |
    v
Doctor checks previous records, medicines, prescriptions, reports
    |
    v
Doctor consults patient
    |
    v
Record / prescription / attachment is saved
    |
    v
Record is marked VIS_A or VIS_B
    |
    v
Hospital continues normal treatment history
    |
    v
If audit/inspection mode is needed, VIS_B data can be hidden
    |
    v
After audit/inspection, VIS_B data can be restored
```

---

## 7. Role-Based Flow Tree

```
Smart Health 360
|
+-- Super Admin
|   |
|   +-- Creates doctors and receptionists
|   +-- Manages clinics / areas / hierarchy
|   +-- Views audit logs
|   +-- Controls emergency hide / restore
|   +-- Can view/manage broader patient data
|
+-- Receptionist
|   |
|   +-- Registers patient
|   +-- Assigns doctor
|   +-- Updates patient demographic details
|   +-- Adds visit support details where allowed
|   +-- Adds medicine/X-ray attachment data where allowed
|   +-- Helps operate waiting-room flow
|
+-- Doctor
    |
    +-- Sees assigned patients
    +-- Opens patient profile
    +-- Reads visit history
    +-- Reads medicine and prescription history
    +-- Adds diagnosis and prescription
    +-- Approves/reviews medical entries
    +-- Uses VIS_A / VIS_B visibility where authorized
```

---

## 8. Doctor Consultation Flow In Detail

### Step 1: Doctor Logs In

Doctor opens the portal and logs in with their email and password.

After login, the doctor sees their own dashboard, not the receptionist or admin dashboard.

### Step 2: Doctor Sees Patient Queue / Patient List

The doctor sees patients assigned to them.

Example:

| Queue No | Patient | Reason | Assigned Doctor | Status |
|----------|---------|--------|-----------------|--------|
| 1 | Ramesh Kumar | Fever | Dr. Arjun | Waiting |
| 2 | Priya Sharma | Follow-up | Dr. Arjun | Waiting |
| 3 | Suresh Reddy | Consultation | Dr. Arjun | Waiting |

This can become a complete digital waiting-room screen in future.

### Step 3: Doctor Opens Patient Details

Doctor clicks Ramesh Kumar.

The doctor can see:

- patient name, age, gender, phone,
- assigned doctor,
- previous visit records,
- disease summary,
- diagnosis history,
- prescription history,
- medicine history,
- test/X-ray attachments,
- follow-up information.

### Step 4: Doctor Adds Current Consultation

Doctor enters:

- current complaint,
- diagnosis,
- medicines,
- tests or X-ray advice,
- follow-up date,
- notes.

### Step 5: Record Is Saved

The record is saved with a visibility status:

- `VIS_A` for normal record,
- `VIS_B` for incognito/sensitive record.

### Step 6: Patient History Is Maintained

Next time Ramesh visits, the doctor does not start from zero. The doctor can open previous history and continue treatment properly.

---

## 9. Patient Details Module

The project includes a patient details area with multiple sections.

### 9.1 Settings

Shows basic patient information:

- name,
- age/date of birth,
- gender,
- contact details,
- assigned doctor,
- patient status/visibility information where applicable.

### 9.2 Records

Shows visit history:

- new visit,
- follow-up,
- continuation,
- disease summary,
- diagnosis,
- doctor notes,
- created date,
- visibility status.

### 9.3 Prescription

Shows prescription details:

- symptoms,
- diagnosis,
- medicines,
- dosage,
- food instructions,
- number of days,
- tests or X-rays,
- follow-up date,
- doctor approval.

### 9.4 Medicine / X-Ray Data

Stores supporting files or links:

- medicine-related files,
- X-ray reports,
- lab attachments,
- prescription-related documents.

This keeps medical history in one place instead of spreading it across multiple papers or registers.

---

## 10. Incognito / Audit Handling Flow

The main agenda of this project is controlled patient visibility.

When the hospital wants to keep some records hidden during audit/inspection, those records are marked as `VIS_B`.

### Normal Mode

In normal hospital operation:

- doctors can access assigned patient data,
- receptionist can do front-desk operations,
- admin can monitor system data,
- `VIS_A` records are normal,
- `VIS_B` records are available only according to permission.

### Inspection / Emergency Hide Mode

When audit or inspection happens:

1. Trusted Super Admin enables emergency hide.
2. `VIS_B` records are moved or hidden from normal record collections/views.
3. Normal screens show only `VIS_A` data.
4. Normal exports include only `VIS_A` data.
5. Audit log stores who enabled the mode, when, and why.

### Restore Mode

After audit/inspection:

1. Trusted Super Admin restores hidden records.
2. `VIS_B` records return to normal controlled availability.
3. Audit log stores restore activity.

This allows the hospital to continue daily digital workflow while keeping sensitive data controlled.

---

## 11. Offline Payment Plan

The current main focus is not online payment gateway integration.

The planned payment approach is:

- allow offline payment mode,
- receptionist records payment status manually,
- payment can be cash, UPI outside the app, card machine, or other offline method,
- system can maintain payment reference or notes,
- the medical workflow does not depend on payment gateway success/failure.

Example:

Ramesh pays consultation fee by cash at reception. Receptionist marks payment as received in the system. Doctor can continue consultation flow without waiting for online payment confirmation.

This keeps the hospital workflow simple and practical.

---

## 12. Future Trusted-Person Operating Model

In future, the whole application can be operated by one trusted person or a trusted small group inside the hospital.

That trusted person can:

- control which records are `VIS_A` and `VIS_B`,
- manage inspection mode,
- manage doctors and receptionists,
- monitor audit logs,
- decide when to restore hidden records,
- ensure sensitive records are handled correctly.

This is important because the incognito feature should not be available to every staff member. It should be controlled only by trusted hospital users.

---

## 13. Waiting-Room Optimization Plan

The application can fully digitalize the waiting room.

Current/future doctor screen can show:

- who is waiting,
- who is next,
- which patient is in consultation,
- visit type,
- assigned doctor,
- patient basic details,
- previous visit summary,
- pending reports,
- follow-up status.

Example waiting-room flow:

```
Reception registers patient
    |
    v
Patient enters waiting list
    |
    v
Doctor screen shows next patient
    |
    v
Doctor opens patient details before calling patient
    |
    v
Consultation starts
    |
    v
Prescription and record saved
    |
    v
Patient checkout / follow-up / medicine process
```

This reduces paper dependency and makes doctor consultation faster.

---

## 14. Medicine History Maintenance

The system maintains medicine and prescription history so doctors can understand previous treatment.

Doctor can check:

- previous medicine names,
- dosage,
- number of days,
- instructions,
- diagnosis connected to medicine,
- follow-up advice,
- whether medicine was part of current or older visit.

Example:

Priya comes again for gastric pain. Doctor checks that she was already given one medicine last month. Doctor can avoid repeating the same medicine unnecessarily and can change treatment based on history.

---

## 15. Who Can See What

| Action | Super Admin | Doctor | Receptionist |
|--------|-------------|--------|--------------|
| Create users | Yes | No | No |
| Create patient | Usually no / admin controlled | No | Yes |
| Assign doctor | Yes | No | Yes during registration |
| See assigned patients | Yes | Yes | Yes based on clinic/front desk |
| See patient profile | Yes | Yes, based on assignment/clinic rules | Yes, based on clinic/front desk |
| Add consultation record | Yes if allowed | Yes | Limited/support entry based on module |
| Add prescription | Controlled | Yes / doctor approval | Entry support where allowed |
| Change `VIS_A` / `VIS_B` | Yes | Yes if authorized | Limited/controlled |
| Emergency hide/restore | Yes | No | No |
| View audit logs | Full | Scoped | Own/scoped |

---

## 16. Export And Audit Safety

Exports must follow role and visibility rules.

General rule:

- Receptionist export should be restricted.
- Doctor export should be related to assigned patients.
- Super Admin export can be broader but should be audited.
- During emergency hide/inspection mode, exports should show only `VIS_A`.

Every important action should be audit logged:

- login,
- patient creation,
- record creation,
- visibility change,
- export,
- emergency hide,
- emergency restore.

Audit log means the system remembers who did what and when.

---

## 17. End-To-End Example

### Patient: Ramesh Kumar

1. Ramesh enters the hospital.
2. Receptionist searches by phone number.
3. Ramesh is new, so receptionist creates patient profile.
4. Receptionist assigns Dr. Arjun.
5. Ramesh appears in Dr. Arjun's waiting list.
6. Doctor opens Ramesh's profile.
7. Doctor sees no previous history because he is new.
8. Doctor diagnoses fever and cough.
9. Doctor adds prescription:
   - Paracetamol,
   - cough syrup,
   - follow-up after 3 days if fever continues.
10. Record is saved as `VIS_A`.
11. Later, Ramesh visits again.
12. Doctor sees previous fever/cough record and continues treatment properly.

### Patient: Suresh Reddy

1. Suresh enters hospital.
2. Receptionist registers him and assigns Dr. Arjun.
3. Doctor completes consultation.
4. Hospital decides this record should be incognito.
5. Record is saved as `VIS_B`.
6. During normal operations, authorized users can access it.
7. During audit/inspection mode, `VIS_B` records are hidden from normal views/exports.
8. After audit, trusted Super Admin restores the hidden data.

---

## 18. Final Project Vision

Smart Health 360 is not only a patient registration system. The final vision is:

- digital reception,
- digital doctor workflow,
- digital waiting room,
- patient medical history in one place,
- prescription and medicine history,
- attachment/report storage,
- offline payment handling,
- controlled incognito patient records,
- audit-safe visibility management,
- trusted-person control for sensitive hospital operations.

In simple words:

The doctor should know who is next, open the full patient history on screen, treat faster with better context, maintain medicine and prescription history, and the hospital should control which records remain normal and which records are handled as incognito.
