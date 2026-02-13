import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api';
import { MessageService } from 'primeng/api';
import { DatePipe, JsonPipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule, type TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';

interface AuditLog {
  _id: string;
  action: string;
  userId: { name: string; email: string; role: string };
  patientId?: string;
  recordId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

@Component({
  selector: 'app-audit-viewer',
  imports: [FormsModule, DatePipe, JsonPipe, CardModule, TableModule, ButtonModule, DialogModule, TooltipModule, SelectModule],
  templateUrl: './audit-viewer.html',
  styleUrl: './audit-viewer.scss',
})
export class AuditViewer implements OnInit {
  logs: AuditLog[] = [];
  total = 0;
  page = 1;
  limit = 20;
  first = 0;
  last = 0;
  loading = false;
  selectedLog: AuditLog | null = null;
  showDetailsDialog = false;
  actionFilter: string | undefined = undefined;
  actionOptions = [
    { label: 'All actions', value: undefined },
    { label: 'API access (every request)', value: 'API_ACCESS' },
    { label: 'Login', value: 'LOGIN' },
    { label: 'Export records', value: 'EXPORT_RECORDS' },
    { label: 'Import records', value: 'IMPORT_RECORDS' },
    { label: 'Move visibility', value: 'MOVE_VISIBILITY' },
    { label: 'Emergency hide', value: 'EMERGENCY_HIDE' },
    { label: 'Emergency restore', value: 'EMERGENCY_RESTORE' },
  ];

  hasDetails(log: AuditLog): boolean {
    return !!log.details && Object.keys(log.details).length > 0;
  }

  constructor(
    private api: Api,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.first = event.first ?? 0;
    this.limit = event.rows ?? 20;
    this.page = this.limit > 0 ? Math.floor(this.first / this.limit) + 1 : 1;
    this.load();
  }

  load(): void {
    this.loading = true;
    const params: Record<string, string | number> = { page: this.page, limit: this.limit };
    if (this.actionFilter) params['action'] = this.actionFilter;
    this.api.get<{ data: AuditLog[]; total: number }>('/audit', params).subscribe({
      next: (res) => {
        this.logs = res.data;
        this.total = res.total;
        this.last = this.total === 0 ? 0 : Math.min(this.first + this.logs.length, this.total);
      },
      error: (err) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Load failed',
          detail: err?.error?.message || 'Failed to load audit logs. Check backend and network.',
        });
      },
      complete: () => (this.loading = false),
    });
  }

  viewDetails(log: AuditLog): void {
    this.selectedLog = log;
    this.showDetailsDialog = true;
  }
}
