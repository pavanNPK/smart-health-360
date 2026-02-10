import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Api } from '../../core/api';
import { Auth } from '../../core/auth';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  dob: string;
  contactEmail?: string;
  primaryDoctorId?: { _id: string; name: string };
  isPrivatePatient: boolean;
}

interface Record {
  _id: string;
  type: string;
  visibility: string;
  title?: string;
  disease?: string;
  notes?: string;
  createdAt: string;
  createdBy?: { name: string };
}

@Component({
  selector: 'app-patient-profile',
  imports: [RouterLink, DatePipe, CardModule, ButtonModule, MessageModule],
  templateUrl: './patient-profile.html',
  styleUrl: './patient-profile.scss',
})
export class PatientProfile implements OnInit {
  patientId = '';
  patient: Patient | null = null;
  activeTab = signal<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  publicRecords = signal<Record[]>([]);
  privateRecords = signal<Record[]>([]);
  loadingPatient = true;
  loadingRecords = false;
  error = '';
  canViewPrivate = computed(() => {
    const u = this.auth.currentUserValue;
    return u?.role === 'DOCTOR' || u?.role === 'SUPER_ADMIN';
  });
  canChangeVisibility = computed(() => this.canViewPrivate());

  constructor(
    private route: ActivatedRoute,
    private api: Api,
    private auth: Auth,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('id') || '';
    this.loadPatient();
    this.loadRecords('PUBLIC');
  }

  loadPatient(): void {
    this.loadingPatient = true;
    this.api.get<Patient>(`/patients/${this.patientId}`).subscribe({
      next: (p) => (this.patient = p),
      error: (err) => (this.error = err.error?.message || 'Failed to load patient'),
      complete: () => (this.loadingPatient = false),
    });
  }

  loadRecords(visibility: 'PUBLIC' | 'PRIVATE'): void {
    this.loadingRecords = true;
    this.api
      .get<{ data: Record[] }>(`/patients/${this.patientId}/records`, { visibility })
      .subscribe({
        next: (res) => {
          if (visibility === 'PUBLIC') this.publicRecords.set(res.data);
          else this.privateRecords.set(res.data);
        },
        error: () => {
          if (visibility === 'PRIVATE') this.privateRecords.set([]);
        },
        complete: () => (this.loadingRecords = false),
      });
  }

  setTab(tab: 'PUBLIC' | 'PRIVATE'): void {
    this.activeTab.set(tab);
    if (tab === 'PRIVATE' && this.canViewPrivate()) this.loadRecords('PRIVATE');
  }

  exportRecords(): void {
    this.api.post<{ message: string; recordCount: number }>(`/patients/${this.patientId}/export`, { format: 'PDF' }).subscribe({
      next: (res) =>
        this.messageService.add({
          severity: 'success',
          summary: 'Export complete',
          detail: `${res.message} Records: ${res.recordCount}`,
        }),
      error: (err) =>
        this.messageService.add({
          severity: 'error',
          summary: 'Export failed',
          detail: err.error?.message || 'Export failed',
        }),
    });
  }
}
