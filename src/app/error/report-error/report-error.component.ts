import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ErrorService } from '../../services/error.service'; // Asegúrate de ajustar la ruta según tu estructura

@Component({
    selector: 'app-report-error',
    templateUrl: './report-error.component.html',
    styleUrls: ['./report-error.component.css'],
    standalone: false
})
export class ReportErrorComponent implements OnInit {
  reportErrorForm: FormGroup;
  submitted = false;
  loading = false;
  file: File | null = null;
  successMessage: string = '';

  constructor(
    private formBuilder: FormBuilder,
    private errorService: ErrorService
  ) { }

  ngOnInit(): void {
    this.reportErrorForm = this.formBuilder.group({
      type: ['', Validators.required],
      module: ['', Validators.required],
      description: ['', [Validators.required, Validators.maxLength(2000)]],
      steps: ['', Validators.required],
      file: [null]
    });
  }

  get f() { return this.reportErrorForm.controls; }

  onFileChange(event: any): void {
    if (event.target.files.length > 0) {
      this.file = event.target.files[0];
    }
  }

  onSubmit(): void {
    this.submitted = true;
    this.successMessage = '';

    if (this.reportErrorForm.invalid) {
      return;
    }

    this.loading = true;

    const errorReport = {
      type: this.f.type.value,
      module: this.f.module.value,
      description: this.f.description.value,
      steps: this.f.steps.value,
    };

    this.errorService.addErrorReport(errorReport, this.file).subscribe({
      next: response => {
        this.loading = false;
        this.successMessage = 'Reporte enviado exitosamente.';
        this.reportErrorForm.reset();
        this.file = null;
        this.submitted = false;
      },
      error: error => {
        console.error('Error al enviar el reporte de error:', error);
        this.loading = false;
      }
    });
  }
}
