import { Component, OnInit } from '@angular/core';
import { Api } from '../../core/api';
import { MessageService } from 'primeng/api';
import { DatePipe, JsonPipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

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
  imports: [DatePipe, JsonPipe, CardModule, TableModule, ButtonModule, DialogModule],
  templateUrl: './audit-viewer.html',
  styleUrl: './audit-viewer.scss',
})
export class AuditViewer implements OnInit {
  logs: AuditLog[] = [];
  total = 0;
  page = 1;
  limit = 20;
  loading = false;
  selectedLog: AuditLog | null = null;
  showDetailsDialog = false;

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

  load(): void {
    this.loading = true;
    this.api.get<{ data: AuditLog[]; total: number }>('/audit', { page: this.page, limit: this.limit }).subscribe({
      next: (res) => {
        this.logs = res.data;
        this.total = res.total;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Load failed',
          detail: err.error?.message || 'Failed to load audit logs.',
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
