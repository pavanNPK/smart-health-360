import { Component, Input, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';

export interface PatientDetailsSummary {
  _id: string;
  fullName: string;
}

export interface PatientRecord {
  _id: string;
  type: string;
  visibility: string;
  createdAt: string;
  notes?: string;
  createdBy?: { name: string };
}

@Component({
  selector: 'app-patient-records-tab',
  standalone: true,
  imports: [FormsModule, DatePipe, CardModule, ButtonModule, TableModule, SelectModule],
  template: `
    <p-card header="Records" styleClass="shadow-2 border-round-lg card-header-plain">
      <div class="flex flex-wrap gap-2 align-items-center mb-3">
        <span class="font-medium text-900">Filters:</span>
        <p-select
          [(ngModel)]="statusFilter"
          [options]="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="All"
          styleClass="w-10rem"
          (onChange)="onFilterChange()"
        />
      </div>
      <p-table
        [value]="records()"
        [loading]="loading()"
        [paginator]="true"
        [rows]="10"
        [rowsPerPageOptions]="[10, 25, 50]"
        styleClass="p-datatable-sm p-datatable-striped"
        [tableStyle]="{ 'min-width': '40rem' }"
      >
        <ng-template pTemplate="header">
          <tr>
            <th style="width: 4rem;">S.No</th>
            <th>Type</th>
            <th>Status</th>
            <th>Date</th>
            <th>Created by</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-r let-rowIndex="rowIndex">
          <tr>
            <td>{{ rowIndex + 1 }}</td>
            <td>{{ r.type }}</td>
            <td>
              <span [class]="r.visibility === 'VIS_B' ? 'text-orange-600' : 'text-600'">
                {{ r.visibility }}
              </span>
            </td>
            <td>{{ r.createdAt | date : 'short' }}</td>
            <td>{{ r.createdBy?.name || '—' }}</td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="5" class="text-center py-4 text-600">No records.</td>
          </tr>
        </ng-template>
      </p-table>
    </p-card>
  `,
})
export class PatientRecordsTab implements OnInit {
  @Input() patientId = '';
  @Input() patient!: PatientDetailsSummary;

  records = signal<PatientRecord[]>([]);
  loading = signal(false);
  statusFilter: 'all' | 'VIS_A' | 'VIS_B' = 'all';

  statusOptions = [
    { label: 'All', value: 'all' },
    { label: 'VIS_A', value: 'VIS_A' },
    { label: 'VIS_B', value: 'VIS_B' },
  ];

  constructor(private api: Api, private messageService: MessageService) {}

  ngOnInit(): void {
    this.loadRecords();
  }

  loadRecords(): void {
    this.loading.set(true);
    const params: Record<string, string | number | boolean> = { page: 1, limit: 100 };
    if (this.statusFilter !== 'all') params['status'] = this.statusFilter;
    this.api
      .get<{ data: PatientRecord[]; total: number }>(`/patients/${this.patientId}/records`, params)
      .subscribe({
        next: (res) => {
          this.records.set(res.data);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.records.set([]);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load records.',
          });
        },
      });
  }

  onFilterChange(): void {
    this.loadRecords();
  }
}

