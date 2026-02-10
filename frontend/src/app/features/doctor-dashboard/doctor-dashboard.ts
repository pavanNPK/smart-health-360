import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Api } from '../../core/api';

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  dob: string;
  contactEmail?: string;
  primaryDoctorId?: { name: string };
}

@Component({
  selector: 'app-doctor-dashboard',
  imports: [RouterLink, DatePipe],
  templateUrl: './doctor-dashboard.html',
  styleUrl: './doctor-dashboard.scss',
})
export class DoctorDashboard implements OnInit {
  patients: Patient[] = [];
  loading = false;

  constructor(private api: Api) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.get<{ data: Patient[] }>('/patients', { assignedTo: 'me' }).subscribe({
      next: (res) => (this.patients = res.data),
      error: () => {},
      complete: () => (this.loading = false),
    });
  }
}
