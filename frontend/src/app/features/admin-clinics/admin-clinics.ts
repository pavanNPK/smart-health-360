import { Component, OnInit } from '@angular/core';
import { Api } from '../../core/api';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TableModule, type TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

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
  imports: [CardModule, TableModule, ButtonModule, InputTextModule, FormsModule, DialogModule, MessageModule, SelectModule, TooltipModule],
  templateUrl: './admin-clinics.html',
  styleUrl: './admin-clinics.scss',
})
export class AdminClinics implements OnInit {
  clinics: Clinic[] = [];
  areas: Area[] = [];
  first = 0;
  rows = 10;
  loading = false;
  showDialog = false;
  showEditDialog = false;
  editingClinic: Clinic | null = null;
  name = '';
  code = '';
  areaId = '';
  error = '';
  search = '';
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private api: Api,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.load();
    this.api.get<{ data: Area[] }>('/areas').subscribe({ next: (res) => (this.areas = res.data) });
  }

  onPage(event: TableLazyLoadEvent): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 10;
  }

  get displayEnd(): number {
    return Math.min(this.first + this.rows, this.clinics.length);
  }

  load(): void {
    this.loading = true;
    const params: Record<string, string> = {};
    if (this.search.trim()) params['search'] = this.search.trim();
    this.api.get<{ data: Clinic[] }>('/clinics', params).subscribe({
      next: (res) => (this.clinics = res.data),
      error: () => {
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Load failed', detail: 'Failed to load clinics. Check backend and network.' });
      },
      complete: () => (this.loading = false),
    });
  }

  onSearchInput(): void {
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.first = 0;
      this.load();
      this.searchDebounceTimer = null;
    }, 300);
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

  confirmDelete(c: Clinic): void {
    this.confirmationService.confirm({
      message: `Delete clinic "${c.name}"? Users in this clinic must be removed or reassigned first.`,
      header: 'Delete Clinic',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteClinic(c),
    });
  }

  deleteClinic(c: Clinic): void {
    this.api.delete<void>(`/clinics/${c._id}`).subscribe({
      next: () => {
        this.load();
        this.messageService.add({ severity: 'success', summary: 'Clinic deleted', detail: c.name });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Delete failed',
          detail: err.error?.message || 'Failed to delete clinic.',
        });
      },
    });
  }
}
