import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { Api } from '../../core/api';
import { Auth } from '../../core/auth';
import { CardModule } from 'primeng/card';
import { TableModule, type TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';

interface Doctor {
  _id: string;
  name: string;
  email?: string;
  specialization?: string;
}

@Component({
  selector: 'app-reception-doctors',
  imports: [CardModule, TableModule, ButtonModule],
  templateUrl: './reception-doctors.html',
  styleUrl: './reception-doctors.scss',
})
export class ReceptionDoctors implements OnInit, OnDestroy {
  doctors: Doctor[] = [];
  first = 0;
  rows = 10;
  loading = false;
  error = '';
  clinicId: string | undefined;
  private destroy$ = new Subject<void>();

  constructor(
    private api: Api,
    private auth: Auth
  ) {
    this.clinicId = this.auth.currentUserValue?.clinicId;
  }

  ngOnInit(): void {
    if (this.clinicId) {
      this.load();
    } else {
      this.auth.currentUser$
        .pipe(
          filter((u) => !!u?.clinicId),
          takeUntil(this.destroy$)
        )
        .subscribe((u) => {
          if (u?.clinicId) {
            this.clinicId = u.clinicId;
            this.load();
          }
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPage(event: TableLazyLoadEvent): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 10;
  }

  get displayEnd(): number {
    return Math.min(this.first + this.rows, this.doctors.length);
  }

  load(): void {
    if (!this.clinicId) return;
    this.loading = true;
    this.error = '';
    this.api.get<{ data: Doctor[] }>(`/clinics/${this.clinicId}/doctors`).subscribe({
      next: (res) => {
        this.doctors = res.data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load doctors';
        this.doctors = [];
        this.loading = false;
      },
    });
  }
}
