import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ErrorService } from '../../services/error.service'; // Ajusta la ruta según tu estructura
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-edit-error',
  templateUrl: './edit-error.component.html',
  styleUrls: ['./edit-error.component.css']
})
export class EditErrorComponent implements OnInit {
  @Input() errorReport: any;
  editErrorForm: FormGroup;
  file: File | null = null;
  public errorTypes: string[] = ['Fallo / Bug', 'Mejora', 'Característica deseada'];
  public modules: string[] = ['Modulo Inicio', 'Modulo Lecciones', 'Repositorio', 'Publicaciones', 'Perfil', 'Mensajes'];
  public errorMessage: string | null = null;
  public successMessage: string | null = null;
  constructor(
    private fb: FormBuilder,
    private errorService: ErrorService,
    public activeModal: NgbActiveModal
  ) {}

  ngOnInit(): void {
    this.editErrorForm = this.fb.group({
      type: [this.errorReport.type, Validators.required],
      module: [this.errorReport.module, Validators.required],
      description: [this.errorReport.description, Validators.required],
      steps: [this.errorReport.steps, Validators.required],
    });
  }

  onFileChange(event: any): void {
    if (event.target.files.length > 0) {
      this.file = event.target.files[0];
    }
  }

  onSubmit(): void {
    if (this.editErrorForm.valid) {
      const updatedError = this.editErrorForm.value;
      this.errorService.updateErrorReport(this.errorReport._id, updatedError, this.file).subscribe({
        next: () => {
          this.successMessage = 'Reporte actualizado con éxito.';
          setTimeout(() => {
            this.activeModal.close('success');
          }, 1000);
        },
        error: (err) => {
          this.errorMessage = 'Error al actualizar el reporte: ' + (err.error.message || err.message || 'Error desconocido');
        }
      });
    }
  }
}
