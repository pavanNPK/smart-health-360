import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api';
import { Auth } from '../../core/auth';
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
  private loadId = 0;
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

  /** Role-based scope description for the audit page */
  get auditScopeDescription(): string {
    const role = this.auth.currentUserValue?.role;
    if (role === 'SUPER_ADMIN') return 'Showing all audits: doctors, receptionists, and Super Admins.';
    if (role === 'DOCTOR') return 'Showing your audits and same-clinic receptionists.';
    return 'Showing your audits only.';
  }

  constructor(
    private api: Api,
    private auth: Auth,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    if (this.loading) return;
    this.limit = event.rows ?? 20;
    const rawFirst = event.first ?? 0;
    this.page = this.limit > 0 ? Math.floor(rawFirst / this.limit) + 1 : 1;
    this.first = (this.page - 1) * this.limit;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loadId += 1;
    const currentLoadId = this.loadId;
    const requestPage = this.page;
    const requestLimit = this.limit;
    const params: Record<string, string | number> = { page: requestPage, limit: requestLimit };
    if (this.actionFilter) params['action'] = this.actionFilter;
    this.api.get<{ data: AuditLog[]; total: number }>('/audit', params).subscribe({
      next: (res) => {
        if (currentLoadId !== this.loadId) return;
        const total = res.total;
        if (total > 0 && (requestPage - 1) * requestLimit >= total) {
          this.page = Math.max(1, Math.ceil(total / requestLimit));
          this.first = (this.page - 1) * requestLimit;
          this.load();
          return;
        }
        this.logs = res.data;
        this.total = total;
        this.first = (requestPage - 1) * requestLimit;
        this.page = requestPage;
        this.last = this.total === 0 ? 0 : Math.min(this.first + this.logs.length, this.total);
      },
      error: (err) => {
        if (currentLoadId !== this.loadId) return;
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Load failed',
          detail: err?.error?.message || 'Failed to load audit logs. Check backend and network.',
        });
      },
      complete: () => {
        if (currentLoadId === this.loadId) this.loading = false;
      },
    });
  }

  viewDetails(log: AuditLog): void {
    this.selectedLog = log;
    this.showDetailsDialog = true;
  }
}
