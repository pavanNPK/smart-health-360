import { Component, Input, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api';
import { Auth } from '../../core/auth';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

export interface PatientDetailsSummary {
  _id: string;
  fullName: string;
  primaryDoctorId?: { _id: string; name: string };
}

export interface MedicineItem {
  name: string;
  dosageText: string;
  frequencyPerDay?: number;
  days?: number;
  instructions?: string;
  beforeFood: boolean;
}

export interface TestOrXrayItem {
  type: 'XRAY' | 'LAB' | 'SCAN';
  name: string;
  notes?: string;
}

export interface Prescription {
  _id: string;
  prescriptionDate: string;
  complaintSymptoms?: string;
  diagnosis?: string;
  medicines: MedicineItem[];
  testsOrXray: TestOrXrayItem[];
  followUpDate?: string;
  status: 'DRAFT' | 'FINAL';
  doctorApproval?: { approved: boolean; approvedAt?: string; remarks?: string };
  writtenByDoctorId?: { name: string };
  enteredByReceptionistId?: { name: string };
}

@Component({
  selector: 'app-patient-prescription-tab',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    CardModule,
    ButtonModule,
    TableModule,
    DialogModule,
    DatePickerModule,
    InputTextModule,
    TextareaModule,
    CheckboxModule,
    SelectModule,
    TooltipModule,
  ],
  template: `
    <p-card header="Prescriptions" styleClass="shadow-2 border-round-lg card-header-plain">
      <div class="flex flex-wrap gap-2 align-items-center mb-3">
        @if (canCreate()) {
          <p-button label="Add prescription" icon="pi pi-plus" (onClick)="openCreateDialog()"></p-button>
        }
      </div>
      <p-table
        [value]="prescriptions()"
        [loading]="loading()"
        [paginator]="true"
        [rows]="10"
        styleClass="p-datatable-sm p-datatable-striped"
        [tableStyle]="{ 'min-width': '40rem' }"
      >
        <ng-template pTemplate="header">
          <tr>
            <th>Date</th>
            <th>Status</th>
            <th>Doctor approval</th>
            <th>Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-p>
          <tr>
            <td>{{ p.prescriptionDate | date : 'shortDate' }}</td>
            <td><span [class]="p.status === 'FINAL' ? 'text-green-600' : 'text-orange-600'">{{ p.status }}</span></td>
            <td>
              @if (p.doctorApproval?.approved === true) {
                <span class="text-green-600">Approved</span>
              } @else if (p.doctorApproval?.approved === false) {
                <span class="text-red-600">Rejected</span>
                <i class="pi pi-info-circle ml-1 text-600 cursor-help" [pTooltip]="p.doctorApproval?.remarks || 'No message provided.'" style="font-size: 0.9rem;"></i>
              } @else {
                —
              }
            </td>
            <td>
              <p-button icon="pi pi-eye" styleClass="p-button-text p-button-sm" (onClick)="viewPrescription(p)" pTooltip="View"></p-button>
              @if (canEdit(p)) {
                <p-button icon="pi pi-pencil" styleClass="p-button-text p-button-sm" (onClick)="openEditDialog(p)"></p-button>
              }
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="4" class="text-center py-4 text-600">No prescriptions.</td>
          </tr>
        </ng-template>
      </p-table>
    </p-card>

    <!-- Create / Edit form dialog -->
    <p-dialog
      [(visible)]="showFormDialog"
      [header]="editingId ? 'Edit prescription' : 'Add prescription'"
      [modal]="true"
      [style]="{ width: '36rem' }"
      [draggable]="false"
      [resizable]="false"
      [styleClass]="'prescription-form-dialog'"
      (onHide)="closeFormDialog()"
    >
      <div class="flex flex-column gap-3">
        <div class="grid">
          <div class="col-6">
            <label class="font-medium block mb-1">Prescription date</label>
            <p-datepicker [(ngModel)]="form.prescriptionDate" dateFormat="yy-mm-dd" [showIcon]="true" styleClass="w-full" />
          </div>
          <div class="col-6">
            <label class="font-medium block mb-1">Status</label>
            <p-select [(ngModel)]="form.status" [options]="statusOptions" optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <div>
          <label class="font-medium block mb-1">Complaint / symptoms</label>
          <input pInputText type="text" [(ngModel)]="form.complaintSymptoms" class="w-full" />
        </div>
        <div>
          <label class="font-medium block mb-1">Diagnosis</label>
          <input pInputText type="text" [(ngModel)]="form.diagnosis" class="w-full" />
        </div>
        <div>
          <label class="font-medium block mb-1">Medicines</label>
          <div class="flex flex-column gap-2">
            @for (m of form.medicines; track $index) {
              <div class="flex flex-column gap-1 w-full">
                <div class="flex gap-2 flex-wrap">
                  <input
                    pInputText
                    [(ngModel)]="m.name"
                    placeholder="Name"
                    class="flex-grow-1"
                    style="min-width: 8rem;"
                  />
                  <input
                    pInputText
                    [(ngModel)]="m.dosageText"
                    placeholder="Dosage (e.g. 1-0-1)"
                    class="w-8rem"
                  />
                </div>
                <div class="flex gap-2 align-items-center flex-wrap">
                  <input
                    pInputText
                    type="number"
                    [(ngModel)]="m.days"
                    placeholder="Days"
                    class="w-5rem"
                  />
                  <div class="flex align-items-center gap-2">
                    <p-checkbox [(ngModel)]="m.beforeFood" [binary]="true" inputId="bf-{{ $index }}"></p-checkbox>
                    <label [for]="'bf-' + $index" class="text-sm">Before food</label>
                  </div>
                  <p-button
                    icon="pi pi-trash"
                    styleClass="p-button-text p-button-sm p-button-danger ml-auto"
                    (onClick)="removeMedicine($index)"
                  ></p-button>
                </div>
              </div>
            }
            <p-button
              label="Add medicine"
              icon="pi pi-plus"
              styleClass="p-button-outlined p-button-sm"
              (onClick)="addMedicine()"
            ></p-button>
          </div>
        </div>
        <div>
          <label class="font-medium block mb-1">Tests / X-Ray</label>
          <div class="flex flex-column gap-2">
            @for (t of form.testsOrXray; track $index) {
              <div class="flex gap-2 align-items-end flex-wrap">
                <p-select [(ngModel)]="t.type" [options]="testTypeOptions" optionLabel="label" optionValue="value" styleClass="w-8rem" />
                <input pInputText [(ngModel)]="t.name" placeholder="Name" class="flex-grow-1" style="min-width: 8rem;" />
                <p-button icon="pi pi-trash" styleClass="p-button-text p-button-sm" (onClick)="removeTest($index)"></p-button>
              </div>
            }
            <p-button label="Add test / X-Ray" icon="pi pi-plus" styleClass="p-button-outlined p-button-sm" (onClick)="addTest()"></p-button>
          </div>
        </div>
        <div>
          <label class="font-medium block mb-1">Follow-up date</label>
          <p-datepicker [(ngModel)]="form.followUpDate" dateFormat="yy-mm-dd" [showIcon]="true" styleClass="w-full" />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" styleClass="p-button-outlined" (onClick)="closeFormDialog()"></p-button>
        <p-button label="Save draft" icon="pi pi-save" (onClick)="savePrescription('DRAFT')" [disabled]="saving()" pTooltip="Save without finalizing; doctor will not see it until you click Finalize."></p-button>
        <p-button label="Finalize" icon="pi pi-check" (onClick)="savePrescription('FINAL')" [disabled]="saving() || form.medicines.length === 0"></p-button>
      </ng-template>
    </p-dialog>

    <!-- View / Print dialog (with Approve/Reject for doctor when FINAL and not yet approved) -->
    <p-dialog
      [(visible)]="showViewDialog"
      header="Prescription"
      [modal]="true"
      [style]="{ width: '32rem' }"
      [draggable]="false"
      (onHide)="selectedPrescription.set(null); approvalPrescription.set(null); showRejectTextarea = false"
    >
      @if (selectedPrescription()) {
        <div class="prescription-print-view" id="prescription-print-area">
          <p class="font-semibold text-lg">{{ patient.fullName }}</p>
          <p class="text-600 text-sm">Date: {{ selectedPrescription()!.prescriptionDate | date : 'mediumDate' }}</p>
          @if (selectedPrescription()!.complaintSymptoms) {
            <p><strong>Complaint:</strong> {{ selectedPrescription()!.complaintSymptoms }}</p>
          }
          @if (selectedPrescription()!.diagnosis) {
            <p><strong>Diagnosis:</strong> {{ selectedPrescription()!.diagnosis }}</p>
          }
          <div class="mt-2">
            <strong>Medicines</strong>
            <ul class="mt-1 pl-3">
              @for (m of selectedPrescription()!.medicines; track $index) {
                <li>{{ m.name }} — {{ m.dosageText }} @if (m.days) { for {{ m.days }} days } @if (m.beforeFood) { (before food) }</li>
              }
            </ul>
          </div>
          @if (selectedPrescription()!.testsOrXray.length) {
            <div class="mt-2">
              <strong>Tests / X-Ray</strong>
              <ul class="mt-1 pl-3">
                @for (t of selectedPrescription()!.testsOrXray; track $index) {
                  <li>{{ t.type }}: {{ t.name }}</li>
                }
              </ul>
            </div>
          }
          @if (selectedPrescription()!.followUpDate) {
            <p class="mt-2"><strong>Follow-up:</strong> {{ selectedPrescription()!.followUpDate | date : 'mediumDate' }}</p>
          }
          @if (selectedPrescription()!.status === 'FINAL' && selectedPrescription()!.doctorApproval?.approved === false) {
            <div class="mt-3 pt-3 border-top-1 surface-border">
              <p class="font-semibold text-900 mb-1">Doctor rejection</p>
              <p class="text-600 m-0">{{ selectedPrescription()!.doctorApproval?.remarks || 'No message provided.' }}</p>
            </div>
          }
        </div>
        @if (isDoctor() && selectedPrescription()!.status === 'FINAL') {
          <div class="mt-3 pt-3 border-top-1 surface-border">
            <p class="font-semibold text-900 mb-2">Doctor approval</p>
            @if (canApprove(selectedPrescription()!)) {
              <div class="flex flex-column gap-2">
                <div class="flex gap-2 flex-wrap">
                  <p-button label="Approve" icon="pi pi-check" (onClick)="submitApprovalFromView(true)"></p-button>
                  <p-button label="Reject" icon="pi pi-times" severity="danger" (onClick)="showRejectTextarea = true"></p-button>
                </div>
                @if (showRejectTextarea) {
                  <div class="flex flex-column gap-1">
                    <label class="font-medium">Rejection message (required)</label>
                    <textarea pInputTextarea [(ngModel)]="approvalRemarks" rows="2" placeholder="Enter reason for rejection..." class="w-full"></textarea>
                    <div class="flex gap-2">
                      <p-button label="Confirm reject" icon="pi pi-times" severity="danger" (onClick)="submitApprovalFromView(false)"></p-button>
                      <p-button label="Cancel" severity="secondary" (onClick)="showRejectTextarea = false"></p-button>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <p class="text-600 m-0">
                @if (selectedPrescription()!.doctorApproval?.approved === true) {
                  <span class="text-green-600">Approved</span>
                } @else if (selectedPrescription()!.doctorApproval?.approved === false) {
                  <span class="text-red-600">Rejected</span>
                  @if (selectedPrescription()!.doctorApproval?.remarks) {
                    — {{ selectedPrescription()!.doctorApproval?.remarks }}
                  }
                }
              </p>
            }
          </div>
        }
        <ng-template pTemplate="footer">
          <p-button label="Close" (onClick)="closeViewDialog()"></p-button>
          @if (!isDoctor() || selectedPrescription()!.status !== 'FINAL' || !canApprove(selectedPrescription()!)) {
            <p-button label="Print" icon="pi pi-print" (onClick)="printPrescription()"></p-button>
          }
        </ng-template>
      }
    </p-dialog>
  `,
  styles: [
    `
      .prescription-print-view {
        font-size: 14px;
      }
      @media print {
        body * { visibility: hidden; }
        #prescription-print-area, #prescription-print-area * { visibility: visible; }
        #prescription-print-area { position: absolute; left: 0; top: 0; }
      }
    `,
  ],
})
export class PatientPrescriptionTab implements OnInit {
  @Input() patientId = '';
  @Input() patient!: PatientDetailsSummary;

  prescriptions = signal<Prescription[]>([]);
  loading = signal(false);
  saving = signal(false);
  showFormDialog = false;
  showViewDialog = false;
  editingId: string | null = null;
  selectedPrescription = signal<Prescription | null>(null);
  approvalPrescription = signal<Prescription | null>(null);
  approvalRemarks = '';
  showRejectTextarea = false;

  statusOptions = [
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Final', value: 'FINAL' },
  ];
  testTypeOptions = [
    { label: 'X-Ray', value: 'XRAY' },
    { label: 'Lab', value: 'LAB' },
    { label: 'Scan', value: 'SCAN' },
  ];

  form: {
    prescriptionDate: Date | null;
    complaintSymptoms: string;
    diagnosis: string;
    medicines: MedicineItem[];
    testsOrXray: TestOrXrayItem[];
    followUpDate: Date | null;
    status: string;
  } = {
    prescriptionDate: new Date(),
    complaintSymptoms: '',
    diagnosis: '',
    medicines: [],
    testsOrXray: [],
    followUpDate: null,
    status: 'DRAFT',
  };

  canCreate = computed(() => this.auth.currentUserValue?.role === 'RECEPTIONIST');
  canEdit = (p: Prescription) =>
    this.auth.currentUserValue?.role === 'RECEPTIONIST' &&
    (p.status === 'DRAFT' || (p.status === 'FINAL' && p.doctorApproval?.approved === false));
  isDoctor = computed(() => this.auth.currentUserValue?.role === 'DOCTOR');
  /** Show Approve/Reject only when pending (no decision yet). Hide when already approved or rejected until receptionist modifies. */
  canApprove = (p: Prescription) =>
    this.auth.currentUserValue?.role === 'DOCTOR' && p.status === 'FINAL' && !p.doctorApproval;

  constructor(
    private api: Api,
    private auth: Auth,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadPrescriptions();
  }

  loadPrescriptions(): void {
    this.loading.set(true);
    this.api.get<{ data: Prescription[] }>(`/patients/${this.patientId}/prescriptions`, { page: 1, limit: 100 }).subscribe({
      next: (res: { data: Prescription[] }) => {
        this.prescriptions.set(res.data);
        this.loading.set(false);
      },
        error: (_err: unknown) => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load prescriptions.' });
      },
    });
  }

  openCreateDialog(): void {
    this.editingId = null;
    this.form = {
      prescriptionDate: new Date(),
      complaintSymptoms: '',
      diagnosis: '',
      medicines: [{ name: '', dosageText: '', beforeFood: false }],
      testsOrXray: [],
      followUpDate: null,
      status: 'DRAFT',
    };
    this.showFormDialog = true;
  }

  openEditDialog(p: Prescription): void {
    if (!this.canEdit(p)) return;
    this.editingId = p._id;
    this.form = {
      prescriptionDate: new Date(p.prescriptionDate),
      complaintSymptoms: p.complaintSymptoms || '',
      diagnosis: p.diagnosis || '',
      medicines: p.medicines?.length ? p.medicines.map((m) => ({ ...m, beforeFood: !!m.beforeFood })) : [{ name: '', dosageText: '', beforeFood: false }],
      testsOrXray: p.testsOrXray || [],
      followUpDate: p.followUpDate ? new Date(p.followUpDate) : null,
      status: p.status,
    };
    this.showFormDialog = true;
  }

  closeFormDialog(): void {
    this.showFormDialog = false;
    this.editingId = null;
  }

  addMedicine(): void {
    this.form.medicines = [...this.form.medicines, { name: '', dosageText: '', beforeFood: false }];
  }

  removeMedicine(i: number): void {
    this.form.medicines = this.form.medicines.filter((_, idx) => idx !== i);
    if (this.form.medicines.length === 0) this.form.medicines = [{ name: '', dosageText: '', beforeFood: false }];
  }

  addTest(): void {
    this.form.testsOrXray = [...this.form.testsOrXray, { type: 'LAB', name: '' }];
  }

  removeTest(i: number): void {
    this.form.testsOrXray = this.form.testsOrXray.filter((_, idx) => idx !== i);
  }

  savePrescription(status: 'DRAFT' | 'FINAL'): void {
    const payload = {
      prescriptionDate: this.form.prescriptionDate?.toISOString().slice(0, 10),
      complaintSymptoms: this.form.complaintSymptoms || undefined,
      diagnosis: this.form.diagnosis || undefined,
      medicines: this.form.medicines.filter((m) => m.name?.trim() && m.dosageText?.trim()).map((m) => ({
        name: m.name.trim(),
        dosageText: m.dosageText.trim(),
        days: m.days,
        beforeFood: !!m.beforeFood,
        instructions: m.instructions,
        frequencyPerDay: m.frequencyPerDay,
      })),
      testsOrXray: this.form.testsOrXray.filter((t) => t.name?.trim()).map((t) => ({ type: t.type, name: t.name.trim(), notes: t.notes })),
      followUpDate: this.form.followUpDate ? this.form.followUpDate.toISOString().slice(0, 10) : undefined,
      status,
    };
    if (status === 'FINAL' && (!payload.medicines || payload.medicines.length === 0)) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Add at least one medicine to finalize.' });
      return;
    }
    this.saving.set(true);
    if (this.editingId) {
      this.api.put<Prescription>(`/prescriptions/${this.editingId}`, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Prescription updated.' });
          this.closeFormDialog();
          this.loadPrescriptions();
        },
        error: (err: { error?: { message?: string } }) => {
          this.saving.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Update failed.' });
        },
      });
    } else {
      this.api.post<Prescription>(`/patients/${this.patientId}/prescriptions`, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.messageService.add({ severity: 'success', summary: 'Saved', detail: status === 'FINAL' ? 'Prescription finalized. Patient will be notified.' : 'Draft saved.' });
          this.closeFormDialog();
          this.loadPrescriptions();
        },
        error: (err: { error?: { message?: string } }) => {
          this.saving.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Save failed.' });
        },
      });
    }
  }

  viewPrescription(p: Prescription): void {
    this.selectedPrescription.set(p);
    if (this.isDoctor() && this.canApprove(p)) {
      this.approvalPrescription.set(p);
      this.approvalRemarks = p.doctorApproval?.remarks || '';
    }
    this.showViewDialog = true;
  }

  closeViewDialog(): void {
    this.showViewDialog = false;
    this.selectedPrescription.set(null);
    this.approvalPrescription.set(null);
    this.showRejectTextarea = false;
  }

  submitApprovalFromView(approved: boolean): void {
    const p = this.selectedPrescription();
    if (!p) return;
    if (!approved && !this.approvalRemarks.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please enter a rejection message.' });
      return;
    }
    this.approvalPrescription.set(p);
    this.api
      .put<Prescription>(`/prescriptions/${p._id}`, {
        doctorApproval: { approved, remarks: this.approvalRemarks.trim() || undefined },
      })
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Done',
            detail: approved ? 'Prescription approved.' : 'Prescription rejected.',
          });
          this.showRejectTextarea = false;
          this.closeViewDialog();
          this.loadPrescriptions();
        },
        error: (err: { error?: { message?: string } }) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Failed.' });
        },
      });
  }

  printPrescription(): void {
    window.print();
  }

}
