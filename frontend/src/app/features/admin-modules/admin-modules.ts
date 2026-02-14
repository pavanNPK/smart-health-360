import { Component } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { MultiSelectModule } from 'primeng/multiselect';

interface ModuleItem {
  id: string;
  name: string;
  code: string;
  addUserIds: string[];
  editUserIds: string[];
  deleteUserIds: string[];
  viewUserIds: string[];
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
}

/** Static modules = screens in the app. SA-only feature. */
const DEFAULT_MODULES: ModuleItem[] = [
  { id: '1', name: 'Admin Dashboard', code: '/admin/dashboard', addUserIds: [], editUserIds: [], deleteUserIds: [], viewUserIds: [] },
  { id: '2', name: 'User Management', code: '/admin/users', addUserIds: [], editUserIds: [], deleteUserIds: [], viewUserIds: [] },
  { id: '3', name: 'Areas', code: '/admin/areas', addUserIds: [], editUserIds: [], deleteUserIds: [], viewUserIds: [] },
  { id: '4', name: 'Clinics', code: '/admin/clinics', addUserIds: [], editUserIds: [], deleteUserIds: [], viewUserIds: [] },
  { id: '5', name: 'Hierarchy', code: '/admin/hierarchy', addUserIds: [], editUserIds: [], deleteUserIds: [], viewUserIds: [] },
  { id: '6', name: 'Patients', code: '/admin/patients', addUserIds: [], editUserIds: [], deleteUserIds: [], viewUserIds: [] },
  { id: '7', name: 'Audit', code: '/admin/audit', addUserIds: [], editUserIds: [], deleteUserIds: [], viewUserIds: [] },
  { id: '8', name: 'Doctor Dashboard', code: '/doctor/dashboard', addUserIds: [], editUserIds: [], deleteUserIds: [], viewUserIds: [] },
  { id: '9', name: 'Doctor Patients', code: '/doctor/patients', addUserIds: [], editUserIds: [], deleteUserIds: [], viewUserIds: [] },
  { id: '10', name: 'Doctor Staff', code: '/doctor/staff', addUserIds: [], editUserIds: [], deleteUserIds: [], viewUserIds: [] },
  { id: '11', name: 'Reception Patients', code: '/reception/patients', addUserIds: [], editUserIds: [], deleteUserIds: [], viewUserIds: [] },
  { id: '12', name: 'Reception Doctors', code: '/reception/doctors', addUserIds: [], editUserIds: [], deleteUserIds: [], viewUserIds: [] },
];

/** Static users for assignment dropdown – no backend. */
const STATIC_USERS: UserItem[] = [
  { id: 'u1', name: 'Admin User', email: 'admin@example.com', role: 'SUPER_ADMIN' },
  { id: 'u2', name: 'Dr. John Smith', email: 'john@example.com', role: 'DOCTOR' },
  { id: 'u3', name: 'Dr. Jane Doe', email: 'jane@example.com', role: 'DOCTOR' },
  { id: 'u4', name: 'Reception Mary', email: 'mary@example.com', role: 'RECEPTIONIST' },
  { id: 'u5', name: 'Reception Bob', email: 'bob@example.com', role: 'RECEPTIONIST' },
];

@Component({
  selector: 'app-admin-modules',
  standalone: true,
  imports: [CardModule, TableModule, ButtonModule, InputTextModule, FormsModule, DialogModule, MessageModule, TooltipModule, MultiSelectModule],
  templateUrl: './admin-modules.html',
  styleUrl: './admin-modules.scss',
})
export class AdminModules {
  modules: ModuleItem[] = JSON.parse(JSON.stringify(DEFAULT_MODULES));
  staticUsers: UserItem[] = [...STATIC_USERS];
  first = 0;
  rows = 10;

  showAddDialog = false;
  showEditDialog = false;
  showViewDialog = false;
  editingModule: ModuleItem | null = null;
  viewingModule: ModuleItem | null = null;

  name = '';
  code = '';
  addUserIds: string[] = [];
  editUserIds: string[] = [];
  deleteUserIds: string[] = [];
  viewUserIds: string[] = [];
  error = '';

  constructor(
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  get displayEnd(): number {
    return Math.min(this.first + this.rows, this.modules.length);
  }

  getUserById(id: string): UserItem | undefined {
    return this.staticUsers.find((u) => u.id === id);
  }

  getAssignedNames(ids: string[]): string {
    if (!ids.length) return '—';
    return ids.map((id) => this.getUserById(id)?.name ?? id).join(', ');
  }

  onPage(event: { first?: number | null; rows?: number | null }): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 10;
  }

  openAdd(): void {
    this.showAddDialog = true;
    this.name = '';
    this.code = '';
    this.addUserIds = [];
    this.editUserIds = [];
    this.deleteUserIds = [];
    this.viewUserIds = [];
    this.error = '';
  }

  add(): void {
    this.error = '';
    if (!this.name.trim()) {
      this.error = 'Name is required';
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: this.error });
      return;
    }
    const id = String(Date.now());
    this.modules = [
      ...this.modules,
      {
        id,
        name: this.name.trim(),
        code: this.code.trim(),
        addUserIds: [...this.addUserIds],
        editUserIds: [...this.editUserIds],
        deleteUserIds: [...this.deleteUserIds],
        viewUserIds: [...this.viewUserIds],
      },
    ];
    this.showAddDialog = false;
    this.messageService.add({ severity: 'success', summary: 'Module added', detail: this.name.trim() });
  }

  openEdit(m: ModuleItem): void {
    this.editingModule = m;
    this.name = m.name;
    this.code = m.code;
    this.addUserIds = [...m.addUserIds];
    this.editUserIds = [...m.editUserIds];
    this.deleteUserIds = [...m.deleteUserIds];
    this.viewUserIds = [...m.viewUserIds];
    this.error = '';
    this.showEditDialog = true;
  }

  update(): void {
    if (!this.editingModule) return;
    this.error = '';
    if (!this.name.trim()) {
      this.error = 'Name is required';
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: this.error });
      return;
    }
    this.modules = this.modules.map((m) =>
      m.id === this.editingModule!.id
        ? {
            ...m,
            name: this.name.trim(),
            code: this.code.trim(),
            addUserIds: [...this.addUserIds],
            editUserIds: [...this.editUserIds],
            deleteUserIds: [...this.deleteUserIds],
            viewUserIds: [...this.viewUserIds],
          }
        : m
    );
    this.showEditDialog = false;
    this.editingModule = null;
    this.messageService.add({ severity: 'success', summary: 'Module updated', detail: this.name.trim() });
  }

  openView(m: ModuleItem): void {
    this.viewingModule = m;
    this.showViewDialog = true;
  }

  saveViewAssignments(): void {
    if (!this.viewingModule) return;
    this.modules = this.modules.map((m) =>
      m.id === this.viewingModule!.id
        ? {
            ...m,
            addUserIds: [...(this.viewingModule?.addUserIds ?? [])],
            editUserIds: [...(this.viewingModule?.editUserIds ?? [])],
            deleteUserIds: [...(this.viewingModule?.deleteUserIds ?? [])],
            viewUserIds: [...(this.viewingModule?.viewUserIds ?? [])],
          }
        : m
    );
    this.messageService.add({ severity: 'success', summary: 'Assignments saved', detail: this.viewingModule.name });
    this.showViewDialog = false;
    this.viewingModule = null;
  }

  confirmDelete(m: ModuleItem): void {
    this.confirmationService.confirm({
      message: `Delete module "${m.name}"?`,
      header: 'Delete Module',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteModule(m),
    });
  }

  deleteModule(m: ModuleItem): void {
    this.modules = this.modules.filter((mod) => mod.id !== m.id);
    this.messageService.add({ severity: 'success', summary: 'Module deleted', detail: m.name });
  }
}
