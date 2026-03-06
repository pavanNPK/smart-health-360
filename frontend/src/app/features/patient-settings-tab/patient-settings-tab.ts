import { Component, Input, computed, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Auth } from '../../core/auth';
import { Api } from '../../core/api';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

export interface PatientDetailsSummary {
  _id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  dob: string;
  age?: number;
  gender?: string;
  email?: string;
  phone?: string;
  contactEmail?: string;
  contactPhone?: string;
  primaryDoctorId?: { _id: string; name: string };
}

@Component({
  selector: 'app-patient-settings-tab',
  standalone: true,
  imports: [RouterLink, DatePipe, CardModule, ButtonModule],
  template: `
    <p-card header="Patient settings" styleClass="shadow-2 border-round-lg card-header-plain">
      <div class="flex flex-column gap-3">
        <div class="grid">
          <div class="col-12 md:col-6">
            <span class="text-600 font-medium block mb-1">Name</span>
            <span class="text-900">{{ patient.fullName }}</span>
          </div>
          <div class="col-12 md:col-6">
            <span class="text-600 font-medium block mb-1">Date of birth</span>
            <span class="text-900">{{ patient.dob | date : 'mediumDate' }}</span>
          </div>
          <div class="col-12 md:col-6">
            <span class="text-600 font-medium block mb-1">Gender</span>
            <span class="text-900">{{ patient.gender || '—' }}</span>
          </div>
          <div class="col-12 md:col-6">
            <span class="text-600 font-medium block mb-1">Email</span>
            <span class="text-900">{{ patient.email || patient.contactEmail || '—' }}</span>
          </div>
          <div class="col-12 md:col-6">
            <span class="text-600 font-medium block mb-1">Phone</span>
            <span class="text-900">{{ patient.phone || patient.contactPhone || '—' }}</span>
          </div>
          <div class="col-12 md:col-6">
            <span class="text-600 font-medium block mb-1">Assigned doctor</span>
            <span class="text-900">{{ patient.primaryDoctorId?.name || '—' }}</span>
          </div>
        </div>
        @if (recordSummary()) {
          <div class="flex flex-wrap gap-3 align-items-center text-sm">
            <span class="font-medium text-900">VIS_A: {{ recordSummary()!.visACount }}</span>
            <span class="font-medium text-900">VIS_B: {{ recordSummary()!.visBCount }}</span>
            <span class="text-600">|</span>
            @for (entry of recordSummary()!.byTypeEntries; track entry.type) {
              <span class="text-600">{{ entry.type }}: {{ entry.count }}</span>
            }
          </div>
        }
        @if (canEdit()) {
          <div>
            <a [routerLink]="editLink()" class="no-underline">
              <p-button label="Edit patient" icon="pi pi-pencil" styleClass="p-button-outlined"></p-button>
            </a>
          </div>
        }
      </div>
    </p-card>
  `,
})
export class PatientSettingsTab implements OnInit {
  @Input() patientId = '';
  @Input() patient!: PatientDetailsSummary;
  @Input() patientUpdated?: () => void;

  recordSummary = signal<{ visACount: number; visBCount: number; byTypeEntries: { type: string; count: number }[] } | null>(null);

  editLink = computed(() => {
    const url = typeof window !== 'undefined' ? window.location.pathname : '';
    const base = url.startsWith('/admin') ? '/admin/patients' : '/reception/patients';
    return [base, this.patientId, 'edit'];
  });

  canEdit = computed(() => {
    const u = this.auth.currentUserValue;
    return u?.role === 'RECEPTIONIST' || u?.role === 'SUPER_ADMIN';
  });

  constructor(private auth: Auth, private api: Api) {}

  ngOnInit(): void {
    if (!this.patientId) return;
    this.api
      .get<{ visACount: number; visBCount: number; byType: Record<string, number> }>(
        `/patients/${this.patientId}/records/summary`
      )
      .subscribe({
        next: (res) => {
          const entries = Object.entries(res.byType || {}).map(([type, count]) => ({ type, count }));
          this.recordSummary.set({ visACount: res.visACount, visBCount: res.visBCount, byTypeEntries: entries });
        },
        error: () => {
          this.recordSummary.set(null);
        },
      });
  }
}
