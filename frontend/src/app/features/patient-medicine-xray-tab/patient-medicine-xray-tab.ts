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
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

export interface PatientDetailsSummary {
  _id: string;
  fullName: string;
}

export interface PatientAttachment {
  _id: string;
  category: string;
  name: string;
  description?: string;
  fileUrl?: string;
  createdAt: string;
  createdBy?: { name: string };
}

@Component({
  selector: 'app-patient-medicine-xray-tab',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    CardModule,
    ButtonModule,
    TableModule,
    DialogModule,
    SelectModule,
    InputTextModule,
    TextareaModule,
  ],
  template: `
    <p-card header="Medicine / X-Ray data &amp; reports" styleClass="shadow-2 border-round-lg card-header-plain">
      <div class="flex flex-wrap gap-2 align-items-center mb-3">
        <span class="font-medium text-900">Category:</span>
        <p-select
          [(ngModel)]="categoryFilter"
          [options]="categoryOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="All"
          styleClass="w-10rem"
          (onChange)="loadAttachments()"
        />
        @if (canAdd()) {
          <p-button label="Add attachment" icon="pi pi-plus" (onClick)="openAddDialog()"></p-button>
        }
      </div>
      <p-table
        [value]="attachments()"
        [loading]="loading()"
        [paginator]="true"
        [rows]="10"
        styleClass="p-datatable-sm p-datatable-striped"
        [tableStyle]="{ 'min-width': '40rem' }"
      >
        <ng-template pTemplate="header">
          <tr>
            <th>Category</th>
            <th>Name</th>
            <th>Description</th>
            <th>Link / URL</th>
            <th>Added</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-a>
          <tr>
            <td>{{ a.category }}</td>
            <td>{{ a.name }}</td>
            <td>{{ a.description || '—' }}</td>
            <td>
              @if (a.fileUrl) {
                <a [href]="a.fileUrl" target="_blank" rel="noopener">View</a>
              } @else {
                —
              }
            </td>
            <td>{{ a.createdAt | date : 'short' }}</td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="5" class="text-center py-4 text-600">No attachments. Add reports or metadata links.</td>
          </tr>
        </ng-template>
      </p-table>
    </p-card>

    <p-dialog
      [(visible)]="showAddDialog"
      header="Add attachment / report"
      [modal]="true"
      [style]="{ width: '28rem' }"
      [draggable]="false"
      (onHide)="resetAddForm()"
    >
      <div class="flex flex-column gap-3">
        <div>
          <label class="font-medium block mb-1">Category</label>
          <p-select
            [(ngModel)]="newAttachment.category"
            [options]="categoryOptions"
            optionLabel="label"
            optionValue="value"
            styleClass="w-full"
          />
        </div>
        <div>
          <label class="font-medium block mb-1">Name</label>
          <input pInputText [(ngModel)]="newAttachment.name" placeholder="e.g. X-Ray Chest" class="w-full" />
        </div>
        <div>
          <label class="font-medium block mb-1">Description (optional)</label>
          <textarea pInputTextarea [(ngModel)]="newAttachment.description" rows="2" class="w-full"></textarea>
        </div>
        <div>
          <label class="font-medium block mb-1">File URL (optional)</label>
          <input pInputText [(ngModel)]="newAttachment.fileUrl" placeholder="https://..." class="w-full" />
          <span class="text-sm text-600 block mt-1">Store link to report if file storage is not integrated.</span>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" (onClick)="showAddDialog = false"></p-button>
        <p-button label="Save" icon="pi pi-check" (onClick)="submitAdd()" [disabled]="!newAttachment.name.trim()"></p-button>
      </ng-template>
    </p-dialog>
  `,
})
export class PatientMedicineXrayTab implements OnInit {
  @Input() patientId = '';
  @Input() patient!: PatientDetailsSummary;

  attachments = signal<PatientAttachment[]>([]);
  loading = signal(false);
  showAddDialog = false;
  categoryFilter: string | null = null;
  categoryOptions = [
    { label: 'All', value: null },
    { label: 'Medicine', value: 'MEDICINE' },
    { label: 'X-Ray', value: 'XRAY' },
    { label: 'Lab report', value: 'LAB_REPORT' },
    { label: 'Scan', value: 'SCAN' },
    { label: 'Other', value: 'OTHER' },
  ];
  newAttachment: { category: string; name: string; description: string; fileUrl: string } = {
    category: 'XRAY',
    name: '',
    description: '',
    fileUrl: '',
  };

  canAdd = computed(() => this.auth.currentUserValue?.role === 'RECEPTIONIST');

  constructor(
    private api: Api,
    private auth: Auth,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadAttachments();
  }

  loadAttachments(): void {
    this.loading.set(true);
    const params: Record<string, string | number> = { page: 1, limit: 100 };
    if (this.categoryFilter) params['category'] = this.categoryFilter;
    this.api.get<{ data: PatientAttachment[] }>(`/patients/${this.patientId}/attachments`, params).subscribe({
      next: (res: { data: PatientAttachment[] }) => {
        this.attachments.set(res.data);
        this.loading.set(false);
      },
        error: (_err: unknown) => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load attachments.' });
      },
    });
  }

  openAddDialog(): void {
    this.resetAddForm();
    this.showAddDialog = true;
  }

  resetAddForm(): void {
    this.newAttachment = { category: 'XRAY', name: '', description: '', fileUrl: '' };
  }

  submitAdd(): void {
    if (!this.newAttachment.name?.trim()) return;
    this.api
      .post<PatientAttachment>(`/patients/${this.patientId}/attachments`, {
        category: this.newAttachment.category,
        name: this.newAttachment.name.trim(),
        description: this.newAttachment.description?.trim() || undefined,
        fileUrl: this.newAttachment.fileUrl?.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Attachment added.' });
          this.showAddDialog = false;
          this.loadAttachments();
        },
        error: (err: { error?: { message?: string } }) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Failed to add.' });
        },
      });
  }
}
