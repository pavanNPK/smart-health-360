import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-patient-import',
  imports: [RouterLink, FormsModule, CardModule, ButtonModule, InputTextModule, MessageModule],
  templateUrl: './patient-import.html',
  styleUrl: './patient-import.scss',
})
export class PatientImport implements OnInit {
  patientId = '';
  fileName = 'import.json';
  itemsJson = '';
  result: { successCount: number; failureCount: number; errors?: { row: number; message: string }[] } | null = null;
  error = '';
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private api: Api,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('id') || '';
  }

  submit(): void {
    this.error = '';
    this.result = null;
    let items: unknown[];
    try {
      items = JSON.parse(this.itemsJson || '[]');
      if (!Array.isArray(items)) throw new Error('Must be an array');
    } catch (e) {
      this.error = 'Invalid JSON. Provide an array of record objects.';
      this.messageService.add({ severity: 'error', summary: 'Invalid JSON', detail: this.error });
      return;
    }
    this.loading = true;
    this.api.post<{ successCount: number; failureCount: number; errors?: { row: number; message: string }[] }>(`/patients/${this.patientId}/import`, { fileName: this.fileName, items }).subscribe({
      next: (res) => {
        this.result = res;
        if (res.failureCount === 0) {
          this.messageService.add({ severity: 'success', summary: 'Import complete', detail: `${res.successCount} record(s) imported.` });
        } else {
          this.messageService.add({
            severity: res.successCount > 0 ? 'warn' : 'error',
            summary: 'Import finished',
            detail: `Imported: ${res.successCount}, Failed: ${res.failureCount}.`,
          });
        }
      },
      error: (err) => {
        this.error = err.error?.message || 'Import failed';
        this.messageService.add({ severity: 'error', summary: 'Import failed', detail: this.error });
      },
      complete: () => (this.loading = false),
    });
  }
}
