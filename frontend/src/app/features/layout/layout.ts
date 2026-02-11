import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../../core/auth';
import type { User, UserRole } from '../../core/auth';
import { Api } from '../../core/api';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';

interface ClinicLookupItem {
  _id: string;
  name: string;
  areaId?: { _id: string; name?: string } | string;
}

@Component({
  selector: 'app-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ButtonModule, PopoverModule],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout implements OnInit {
  user: User | null = null;
  profileArea = '—';
  profileClinic = '—';
  private clinicLookupLoadedForUserId: string | null = null;

  constructor(
    private auth: Auth,
    private api: Api,
    private router: Router,
    private messageService: MessageService
  ) {
    this.user = this.auth.currentUserValue;
    this.updateProfileLocation(this.user);
    this.auth.currentUser$.subscribe((u) => {
      this.user = u;
      this.updateProfileLocation(u);
    });
  }

  ngOnInit(): void {
    // Refresh user from API so doctor/receptionist have clinicId (Staff, patient form doctors dropdown)
    if (this.auth.isLoggedIn()) {
      this.auth.refreshUser().subscribe({
        next: (u) => this.updateProfileLocation(u),
        error: () => this.updateProfileLocation(this.auth.currentUserValue),
      });
    }
    const url = this.router.url;
    if (url === '/' || url === '') {
      const u = this.auth.currentUserValue;
      if (u?.role === 'SUPER_ADMIN') this.router.navigate(['/admin/dashboard']);
      else if (u?.role === 'DOCTOR') this.router.navigate(['/doctor/dashboard']);
      else this.router.navigate(['/reception/patients']);
    }
  }

  logout(profilePopover?: { hide(): void }): void {
    profilePopover?.hide();
    this.messageService.add({ severity: 'info', summary: 'Signed out', detail: 'You have been logged out.' });
    this.auth.logout();
  }

  canAccess(role: UserRole): boolean {
    return this.user?.role === role || this.user?.role === 'SUPER_ADMIN';
  }

  canAccessAudit(): boolean {
    return this.user?.role === 'SUPER_ADMIN' || this.user?.role === 'DOCTOR' || this.user?.role === 'RECEPTIONIST';
  }

  private updateProfileLocation(user: User | null): void {
    if (!user || (user.role !== 'DOCTOR' && user.role !== 'RECEPTIONIST')) {
      this.profileArea = '—';
      this.profileClinic = '—';
      this.clinicLookupLoadedForUserId = null;
      return;
    }

    if (user.clinic?.name) {
      this.profileClinic = user.clinic.name;
      this.profileArea = user.clinic.areaName || '—';
      this.clinicLookupLoadedForUserId = user.id;
      return;
    }

    this.profileClinic = user.clinicId || '—';
    this.profileArea = '—';
    this.fetchClinicFromApi(user);
  }

  private fetchClinicFromApi(user: User): void {
    if (!user.clinicId || this.clinicLookupLoadedForUserId === user.id) return;
    this.clinicLookupLoadedForUserId = user.id;
    this.api.get<{ data: ClinicLookupItem[] }>('/clinics').subscribe({
      next: (res) => {
        const clinic = res.data?.find((c) => c._id === user.clinicId) ?? res.data?.[0];
        if (!clinic) return;
        this.profileClinic = clinic.name || user.clinicId || '—';
        const area = clinic.areaId;
        this.profileArea = typeof area === 'object' && area?.name ? area.name : '—';
      },
      error: () => {},
    });
  }
}
