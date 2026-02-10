import { Component, OnInit } from '@angular/core';
import { Api } from '../../core/api';
import { DatePipe, JsonPipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';

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
  imports: [DatePipe, JsonPipe, CardModule, TableModule],
  templateUrl: './audit-viewer.html',
  styleUrl: './audit-viewer.scss',
})
export class AuditViewer implements OnInit {
  logs: AuditLog[] = [];
  total = 0;
  page = 1;
  limit = 20;
  loading = false;

  constructor(private api: Api) {}

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
      error: () => {},
      complete: () => (this.loading = false),
    });
  }
}
