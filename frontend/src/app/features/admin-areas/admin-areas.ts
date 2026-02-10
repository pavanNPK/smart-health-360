import { Component, OnInit } from '@angular/core';
import { Api } from '../../core/api';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';

interface Area {
  _id: string;
  name: string;
  code?: string;
}

@Component({
  selector: 'app-admin-areas',
  standalone: true,
  imports: [CardModule, TableModule, ButtonModule, InputTextModule, FormsModule, DialogModule, MessageModule],
  templateUrl: './admin-areas.html',
  styleUrl: './admin-areas.scss',
})
export class AdminAreas implements OnInit {
  areas: Area[] = [];
  loading = false;
  showDialog = false;
  name = '';
  code = '';
  error = '';

  constructor(private api: Api) {}

  ngOnInit(): void {
    this.load();
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
      return;
    }
    this.api.post<Area>('/areas', { name: this.name.trim(), code: this.code.trim() || undefined }).subscribe({
      next: () => {
        this.showDialog = false;
        this.load();
      },
      error: (err) => (this.error = err.error?.message || 'Failed to create area'),
    });
  }
}
