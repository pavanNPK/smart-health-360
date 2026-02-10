import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Auth } from './auth';

@Injectable({
  providedIn: 'root',
})
export class Api {
  constructor(
    private http: HttpClient,
    private auth: Auth
  ) {}

  get baseUrl(): string {
    return environment.apiUrl;
  }

  getHeaders(): Record<string, string> {
    const token = this.auth.accessToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  get<T>(path: string, params?: Record<string, string | number | boolean>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        httpParams = httpParams.set(k, String(v));
      });
    }
    return this.http.get<T>(`${this.baseUrl}${path}`, {
      headers: this.getHeaders(),
      params: httpParams,
    });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${path}`, body, {
      headers: this.getHeaders(),
    });
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${path}`, body, {
      headers: this.getHeaders(),
    });
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${path}`, {
      headers: this.getHeaders(),
    });
  }
}
