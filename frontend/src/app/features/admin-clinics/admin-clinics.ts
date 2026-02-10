import { Component, OnInit } from '@angular/core';
import { Api } from '../../core/api';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';

interface Area {
  _id: string;
  name: string;
  code?: string;
}

interface Clinic {
  _id: string;
  name: string;
  areaId: Area | string;
  code?: string;
}

@Component({
  selector: 'app-admin-clinics',
  standalone: true,
  imports: [CardModule, TableModule, ButtonModule, InputTextModule, FormsModule, DialogModule, MessageModule, SelectModule],
  templateUrl: './admin-clinics.html',
  styleUrl: './admin-clinics.scss',
})
export class AdminClinics implements OnInit {
  clinics: Clinic[] = [];
  areas: Area[] = [];
  loading = false;
  showDialog = false;
  showEditDialog = false;
  editingClinic: Clinic | null = null;
  name = '';
  code = '';
  areaId = '';
  error = '';

  constructor(
    private api: Api,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.load();
    this.api.get<{ data: Area[] }>('/areas').subscribe({ next: (res) => (this.areas = res.data) });
  }

  load(): void {
    this.loading = true;
    this.api.get<{ data: Clinic[] }>('/clinics').subscribe({
      next: (res) => (this.clinics = res.data),
      error: () => {},
      complete: () => (this.loading = false),
    });
  }

  openDialog(): void {
    this.showDialog = true;
    this.name = '';
    this.code = '';
    this.areaId = '';
    this.error = '';
  }

  openEdit(c: Clinic): void {
    this.editingClinic = c;
    this.name = c.name;
    this.code = c.code ?? '';
    this.areaId = typeof c.areaId === 'object' && c.areaId?._id ? c.areaId._id : (c.areaId as string);
    this.error = '';
    this.showEditDialog = true;
  }

  getAreaName(clinic: Clinic): string {
    const a = clinic.areaId;
    return typeof a === 'object' && a?.name ? a.name : '—';
  }

  create(): void {
    this.error = '';
    if (!this.name.trim()) {
      this.error = 'Name is required';
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: this.error });
      return;
    }
    if (!this.areaId) {
      this.error = 'Area is required';
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: this.error });
      return;
    }
    this.api.post<Clinic>('/clinics', { name: this.name.trim(), areaId: this.areaId, code: this.code.trim() || undefined }).subscribe({
      next: () => {
        this.showDialog = false;
        this.load();
        this.messageService.add({ severity: 'success', summary: 'Clinic created', detail: this.name.trim() });
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to create clinic';
        this.messageService.add({ severity: 'error', summary: 'Create clinic failed', detail: this.error });
      },
    });
  }

  updateClinic(): void {
    if (!this.editingClinic) return;
    this.error = '';
    if (!this.name.trim()) {
      this.error = 'Name is required';
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: this.error });
      return;
    }
    if (!this.areaId) {
      this.error = 'Area is required';
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: this.error });
      return;
    }
    this.api.patch<Clinic>(`/clinics/${this.editingClinic._id}`, { name: this.name.trim(), areaId: this.areaId, code: this.code.trim() || undefined }).subscribe({
      next: () => {
        this.showEditDialog = false;
        this.editingClinic = null;
        this.load();
        this.messageService.add({ severity: 'success', summary: 'Clinic updated', detail: this.name.trim() });
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to update clinic';
        this.messageService.add({ severity: 'error', summary: 'Update clinic failed', detail: this.error });
      },
    });
  }
}
