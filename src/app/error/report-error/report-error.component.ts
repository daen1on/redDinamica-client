import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ErrorService } from '../../services/error.service';
import { ActivatedRoute } from '@angular/router';

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
  errorMessage: string = '';
  lockPublicationId: boolean = false;
  lockReportedUserId: boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private errorService: ErrorService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.reportErrorForm = this.formBuilder.group({
      category: ['', Validators.required],
      type: [''],
      module: [''],
      description: ['', [Validators.required, Validators.maxLength(2000)]],
      steps: [''],
      publicationId: [''],
      reportedUserId: [''],
      file: [null]
    });

    // Prellenar desde parámetros de consulta
    const categoryParam = this.route.snapshot.queryParamMap.get('category');
    const publicationIdParam = this.route.snapshot.queryParamMap.get('publicationId');
    const reportedUserIdParam = this.route.snapshot.queryParamMap.get('reportedUserId');

    // Manejar denuncia de publicación
    if (categoryParam === 'publication' || publicationIdParam) {
      // Establecer categoría y validadores
      this.f.category.setValue('publication');
      this.onCategoryChange();

      if (publicationIdParam) {
        this.f.publicationId.setValue(publicationIdParam);
        this.f.publicationId.updateValueAndValidity();
        this.lockPublicationId = true;
      }
    }

    // Manejar denuncia de usuario
    if (categoryParam === 'user' || reportedUserIdParam) {
      // Establecer categoría y validadores
      this.f.category.setValue('user');
      this.onCategoryChange();

      if (reportedUserIdParam) {
        this.f.reportedUserId.setValue(reportedUserIdParam);
        this.f.reportedUserId.updateValueAndValidity();
        this.lockReportedUserId = true;
      }
    }
  }

  get f() { return this.reportErrorForm.controls; }

  onCategoryChange(): void {
    // Resetear campos cuando cambia la categoría (excepto los bloqueados)
    this.f.type.setValue('');
    this.f.module.setValue('');
    this.f.steps.setValue('');
    
    // Solo resetear publicationId si no está bloqueado
    if (!this.lockPublicationId) {
      this.f.publicationId.setValue('');
    }
    
    // Solo resetear reportedUserId si no está bloqueado
    if (!this.lockReportedUserId) {
      this.f.reportedUserId.setValue('');
    }
    
    // Actualizar validadores según la categoría
    const category = this.f.category.value;
    
    // Limpiar todos los validadores primero
    this.f.type.clearValidators();
    this.f.module.clearValidators();
    this.f.steps.clearValidators();
    this.f.publicationId.clearValidators();
    this.f.reportedUserId.clearValidators();
    
    // Agregar validadores según la categoría
    if (category === 'technical') {
      this.f.type.setValidators([Validators.required]);
      this.f.module.setValidators([Validators.required]);
      this.f.steps.setValidators([Validators.required]);
    } else if (category === 'publication') {
      this.f.type.setValidators([Validators.required]);
      this.f.publicationId.setValidators([Validators.required]);
    } else if (category === 'user') {
      this.f.type.setValidators([Validators.required]);
      this.f.reportedUserId.setValidators([Validators.required]);
    }
    
    // Actualizar validación
    this.f.type.updateValueAndValidity();
    this.f.module.updateValueAndValidity();
    this.f.steps.updateValueAndValidity();
    this.f.publicationId.updateValueAndValidity();
    this.f.reportedUserId.updateValueAndValidity();
    
    // Resetear estado de submitted
    this.submitted = false;
  }

  onFileChange(event: any): void {
    if (event.target.files.length > 0) {
      this.file = event.target.files[0];
    }
  }

  onSubmit(): void {
    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';

    if (this.reportErrorForm.invalid) {
      this.errorMessage = 'Por favor complete todos los campos obligatorios.';
      return;
    }

    this.loading = true;

    const errorReport = {
      category: this.f.category.value,
      type: this.f.type.value,
      module: this.f.module.value || 'N/A',
      description: this.f.description.value,
      steps: this.f.steps.value || 'N/A',
      publicationId: this.f.publicationId.value || null,
      reportedUserId: this.f.reportedUserId.value || null
    };

    this.errorService.addErrorReport(errorReport, this.file).subscribe({
      next: response => {
        this.loading = false;
        const categoryText = this.getCategoryText(this.f.category.value);
        this.successMessage = `${categoryText} enviado exitosamente. Nuestro equipo lo revisará a la brevedad.`;
        this.reportErrorForm.reset();
        this.file = null;
        this.submitted = false;
        
        // Scroll to top to show success message
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: error => {
        console.error('Error al enviar el reporte:', error);
        this.loading = false;
        this.errorMessage = 'Ocurrió un error al enviar el reporte. Por favor intente nuevamente.';
      }
    });
  }

  private getCategoryText(category: string): string {
    switch(category) {
      case 'technical':
        return 'Reporte técnico';
      case 'publication':
        return 'Denuncia de publicación';
      case 'user':
        return 'Denuncia de usuario';
      default:
        return 'Reporte';
    }
  }
}
