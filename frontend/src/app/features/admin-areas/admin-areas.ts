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
import { TooltipModule } from 'primeng/tooltip';

interface Area {
  _id: string;
  name: string;
  code?: string;
}

@Component({
  selector: 'app-admin-areas',
  standalone: true,
  imports: [CardModule, TableModule, ButtonModule, InputTextModule, FormsModule, DialogModule, MessageModule, TooltipModule],
  templateUrl: './admin-areas.html',
  styleUrl: './admin-areas.scss',
})
export class AdminAreas implements OnInit {
  areas: Area[] = [];
  first = 0;
  rows = 10;
  loading = false;
  showDialog = false;
  showEditDialog = false;
  editingArea: Area | null = null;
  name = '';
  code = '';
  error = '';

  constructor(
    private api: Api,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  onPage(event: TableLazyLoadEvent): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 10;
  }

  get displayEnd(): number {
    return Math.min(this.first + this.rows, this.areas.length);
  }

  load(): void {
    this.loading = true;
    this.api.get<{ data: Area[] }>('/areas').subscribe({
      next: (res) => (this.areas = res.data),
      error: () => {},
      complete: () => (this.loading = false),
    });
  }

  openDialog(): void {
    this.showDialog = true;
    this.name = '';
    this.code = '';
    this.error = '';
  }

  create(): void {
    this.error = '';
    if (!this.name.trim()) {
      this.error = 'Name is required';
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: this.error });
      return;
    }
    this.api.post<Area>('/areas', { name: this.name.trim(), code: this.code.trim() || undefined }).subscribe({
      next: () => {
        this.showDialog = false;
        this.load();
        this.messageService.add({ severity: 'success', summary: 'Area created', detail: this.name.trim() });
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to create area';
        this.messageService.add({ severity: 'error', summary: 'Create area failed', detail: this.error });
      },
    });
  }

  openEdit(a: Area): void {
    this.editingArea = a;
    this.name = a.name;
    this.code = a.code ?? '';
    this.error = '';
    this.showEditDialog = true;
  }

  updateArea(): void {
    if (!this.editingArea) return;
    this.error = '';
    if (!this.name.trim()) {
      this.error = 'Name is required';
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: this.error });
      return;
    }
    this.api.patch<Area>(`/areas/${this.editingArea._id}`, { name: this.name.trim(), code: this.code.trim() || undefined }).subscribe({
      next: () => {
        this.showEditDialog = false;
        this.editingArea = null;
        this.load();
        this.messageService.add({ severity: 'success', summary: 'Area updated', detail: this.name.trim() });
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to update area';
        this.messageService.add({ severity: 'error', summary: 'Update area failed', detail: this.error });
      },
    });
  }

  confirmDelete(a: Area): void {
    this.confirmationService.confirm({
      message: `Delete area "${a.name}"? Clinics in this area must be removed or reassigned first.`,
      header: 'Delete Area',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteArea(a),
    });
  }

  deleteArea(a: Area): void {
    this.api.delete<void>(`/areas/${a._id}`).subscribe({
      next: () => {
        this.load();
        this.messageService.add({ severity: 'success', summary: 'Area deleted', detail: a.name });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Delete failed',
          detail: err.error?.message || 'Failed to delete area.',
        });
      },
    });
  }
}
