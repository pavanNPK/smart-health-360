import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, tap, EMPTY } from 'rxjs';
import { environment } from '../../environments/environment';

export type UserRole = 'RECEPTIONIST' | 'DOCTOR' | 'SUPER_ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clinicId?: string;
  clinic?: { id: string; name: string; areaName: string };
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    const stored = sessionStorage.getItem('user');
    if (stored) {
      try {
        this.currentUserSubject.next(JSON.parse(stored));
      } catch {}
    }
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  get accessToken(): string | null {
    return sessionStorage.getItem('accessToken');
  }

  login(email: string, password: string) {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((res) => {
          sessionStorage.setItem('accessToken', res.accessToken);
          sessionStorage.setItem('refreshToken', res.refreshToken);
          sessionStorage.setItem('user', JSON.stringify(res.user));
          this.currentUserSubject.next(res.user);
        })
      );
  }

  logout(): void {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  setSession(accessToken: string, refreshToken: string, user: User): void {
    sessionStorage.setItem('accessToken', accessToken);
    sessionStorage.setItem('refreshToken', refreshToken);
    sessionStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  isLoggedIn(): boolean {
    return !!this.currentUserValue && !!this.accessToken;
  }

  refreshToken() {
    const refresh = sessionStorage.getItem('refreshToken');
    if (!refresh) return EMPTY;
    return this.http
      .post<{ accessToken: string }>(`${environment.apiUrl}/auth/refresh`, { refreshToken: refresh })
      .pipe(
        tap((res) => sessionStorage.setItem('accessToken', res.accessToken))
      );
  }

  /** Refresh current user from API (e.g. to get clinicId for doctor/receptionist). */
  refreshUser() {
    const token = this.accessToken;
    if (!token) return EMPTY;
    return this.http
      .get<User>(`${environment.apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .pipe(
        tap((user) => {
          sessionStorage.setItem('user', JSON.stringify(user));
          this.currentUserSubject.next(user);
        })
      );
  }
}
