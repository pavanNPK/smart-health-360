import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { Auth } from '../../core/auth';
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { PatientSettingsTab } from '../patient-settings-tab/patient-settings-tab';
import { PatientRecordsTab } from '../patient-records-tab/patient-records-tab';
import { PatientPrescriptionTab } from '../patient-prescription-tab/patient-prescription-tab';
import { PatientMedicineXrayTab } from '../patient-medicine-xray-tab/patient-medicine-xray-tab';

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
  summary?: { visitRecordCount: number; prescriptionCount: number };
}

@Component({
  selector: 'app-patient-details',
  standalone: true,
  imports: [
    RouterLink,
    TabsModule,
    ButtonModule,
    PatientSettingsTab,
    PatientRecordsTab,
    PatientPrescriptionTab,
    PatientMedicineXrayTab,
  ],
  template: `
    <div class="flex flex-column gap-4">
      <div class="flex flex-wrap align-items-center justify-content-between gap-3">
        <a [routerLink]="backUrl()" class="back-link flex align-items-center gap-1 no-underline font-medium">
          <i class="pi pi-arrow-left"></i> Back to list
        </a>
      </div>
      @if (loading()) {
        <div class="flex align-items-center justify-content-center py-8">
          <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
        </div>
      } @else if (error()) {
        <p class="text-red-600">{{ error() }}</p>
      } @else if (patient()) {
        <div class="flex flex-column gap-2 mb-2">
          <h1 class="m-0 text-2xl font-semibold text-900">{{ patient()!.fullName }}</h1>
          <div class="flex flex-wrap gap-2 align-items-center text-600 text-sm">
            @if (patient()!.email) {
              <span><i class="pi pi-envelope mr-1"></i> {{ patient()!.email }}</span>
            }
            @if (patient()!.phone) {
              <span><i class="pi pi-phone mr-1"></i> {{ patient()!.phone }}</span>
            }
            @if (patient()!.age != null) {
              <span>Age: {{ patient()!.age }}</span>
            }
            @if (patient()!.primaryDoctorId?.name) {
              <span><i class="pi pi-user mr-1"></i> Doctor: {{ patient()!.primaryDoctorId!.name }}</span>
            }
          </div>
        </div>
        <p-tabs [(value)]="activeTabIndex">
          <p-tablist>
            <p-tab [value]="0">Settings</p-tab>
            <p-tab [value]="1">Records</p-tab>
            <p-tab [value]="2">Prescription</p-tab>
            <p-tab [value]="3">Medicine / X-Ray Data</p-tab>
          </p-tablist>
          <p-tabpanels>
            <p-tabpanel [value]="0">
              <app-patient-settings-tab
                [patientId]="patientId()"
                [patient]="patient()!"
                (patientUpdated)="loadDetails()"
              />
            </p-tabpanel>
            <p-tabpanel [value]="1">
              <app-patient-records-tab [patientId]="patientId()" [patient]="patient()!" />
            </p-tabpanel>
            <p-tabpanel [value]="2">
              <app-patient-prescription-tab [patientId]="patientId()" [patient]="patient()!" />
            </p-tabpanel>
            <p-tabpanel [value]="3">
              <app-patient-medicine-xray-tab [patientId]="patientId()" [patient]="patient()!" />
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class PatientDetails implements OnInit {
  patientId = signal('');
  patient = signal<PatientDetailsSummary | null>(null);
  loading = signal(true);
  error = signal('');
  activeTabIndex = 0;

  backUrl = computed(() => {
    const url = this.router.url;
    if (url.startsWith('/doctor')) return '/doctor/patients';
    if (url.startsWith('/admin')) return '/admin/patients';
    return '/reception/patients';
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: Api,
    private auth: Auth
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.patientId.set(id);
    this.loadDetails();
  }

  loadDetails(): void {
    const id = this.patientId();
    if (!id) return;
    this.loading.set(true);
    this.error.set('');
    this.api.get<PatientDetailsSummary>(`/patients/${id}/details`).subscribe({
      next: (p) => {
        this.patient.set(p);
        this.loading.set(false);
      },
      error: (err) => {
        const status = err?.status;
        const msg = err?.error?.message;
        if (status === 404) this.error.set(msg || 'Patient not found.');
        else if (status === 403) this.error.set(msg || 'You do not have permission to view this patient.');
        else this.error.set(msg || 'Failed to load patient. Check that the backend is running and the patient exists.');
        this.loading.set(false);
      },
    });
  }
}
