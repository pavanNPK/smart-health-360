import { Routes } from '@angular/router';
import { authGuard } from './core/auth-guard';
import { roleGuard } from './core/role-guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login/login').then((m) => m.Login) },
  { path: 'verify-email', loadComponent: () => import('./features/verify-email/verify-email').then((m) => m.VerifyEmail) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/layout/layout').then((m) => m.Layout),
    children: [
      {
        path: 'reception',
        canActivate: [roleGuard],
        data: { roles: ['RECEPTIONIST', 'SUPER_ADMIN'] },
        children: [
          { path: 'patients', loadComponent: () => import('./features/patient-list/patient-list').then((m) => m.PatientList) },
          { path: 'doctors', canActivate: [roleGuard], data: { roles: ['RECEPTIONIST'] }, loadComponent: () => import('./features/reception-doctors/reception-doctors').then((m) => m.ReceptionDoctors) },
          { path: 'patients/new', loadComponent: () => import('./features/patient-form/patient-form').then((m) => m.PatientForm) },
          { path: 'patients/:id/edit', loadComponent: () => import('./features/patient-form/patient-form').then((m) => m.PatientForm) },
          { path: 'patients/:id', loadComponent: () => import('./features/patient-profile/patient-profile').then((m) => m.PatientProfile) },
          { path: 'patients/:id/import', loadComponent: () => import('./features/patient-import/patient-import').then((m) => m.PatientImport) },
        ],
      },
      {
        path: 'doctor',
        canActivate: [roleGuard],
        data: { roles: ['DOCTOR'] },
        children: [
          { path: 'dashboard', loadComponent: () => import('./features/doctor-dashboard/doctor-dashboard').then((m) => m.DoctorDashboard) },
          { path: 'staff', loadComponent: () => import('./features/doctor-staff/doctor-staff').then((m) => m.DoctorStaff) },
          { path: 'patients', loadComponent: () => import('./features/doctor-patient-list/doctor-patient-list').then((m) => m.DoctorPatientList) },
          { path: 'patients/:id', loadComponent: () => import('./features/patient-profile/patient-profile').then((m) => m.PatientProfile) },
        ],
      },
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN'] },
        children: [
          { path: 'dashboard', loadComponent: () => import('./features/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard) },
          { path: 'users', loadComponent: () => import('./features/user-management/user-management').then((m) => m.UserManagement) },
          { path: 'areas', loadComponent: () => import('./features/admin-areas/admin-areas').then((m) => m.AdminAreas) },
          { path: 'clinics', loadComponent: () => import('./features/admin-clinics/admin-clinics').then((m) => m.AdminClinics) },
          { path: 'hierarchy', loadComponent: () => import('./features/admin-hierarchy/admin-hierarchy').then((m) => m.AdminHierarchy) },
          { path: 'patients/:id', loadComponent: () => import('./features/patient-profile/patient-profile').then((m) => m.PatientProfile) },
        ],
      },
      { path: 'audit', canActivate: [roleGuard], data: { roles: ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST'] }, loadComponent: () => import('./features/audit-viewer/audit-viewer').then((m) => m.AuditViewer) },
      { path: '', loadComponent: () => import('./features/home-redirect/home-redirect').then((m) => m.HomeRedirect) },
    ],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
