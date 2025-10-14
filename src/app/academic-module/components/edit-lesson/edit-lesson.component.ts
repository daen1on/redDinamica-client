import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { GLOBAL } from '../../../services/global';
import { AcademicLessonService } from '../../services/academic-lesson.service';
import { UpdateAcademicLessonRequest, AcademicLesson } from '../../models/academic-lesson.model';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-edit-lesson',
  templateUrl: './edit-lesson.component.html',
  styleUrls: ['./edit-lesson.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule]
})
export class EditLessonComponent implements OnInit {
  lessonForm: FormGroup;
  lesson: AcademicLesson | null = null;
  lessonId: string = '';
  loading = false;
  errorMessage = '';
  successMessage = '';
  submitted = false;
  
  // Variables para áreas de conocimiento
  selectedKnowledgeAreas: any[] = [];
  knowledgeAreaInput = '';
  filteredKnowledgeAreas: any[] = [];
  showKnowledgeAreaDropdown = false;
  allKnowledgeAreas: any[] = [];

  // Estados disponibles según el estado actual
  availableStatuses: Array<{value: string, label: string}> = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private academicLessonService: AcademicLessonService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.lessonForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      resume: ['', [Validators.required, Validators.maxLength(1000)]],
      references: ['', [Validators.maxLength(2000)]],
      tags: ['', Validators.maxLength(500)],
      methodology: ['', [Validators.required, Validators.maxLength(1000)]],
      objectives: ['', [Validators.required, Validators.maxLength(1000)]],
      knowledge_area: ['', Validators.required],
      status: ['draft']
    });
  }

  ngOnInit(): void {
    this.lessonId = this.route.snapshot.params['id'];
    this.loadKnowledgeAreas();
    this.loadLesson();
  }

  loadLesson(): void {
    this.loading = true;
    this.academicLessonService.getLessonById(this.lessonId).subscribe({
      next: (response) => {
        this.lesson = response.data;
        this.populateForm();
        this.setAvailableStatuses();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar lección:', error);
        this.errorMessage = 'Error al cargar la lección';
        this.loading = false;
      }
    });
  }

  populateForm(): void {
    if (!this.lesson) return;

    // Mapear knowledge_areas (pueden ser strings o objetos)
    this.selectedKnowledgeAreas = (this.lesson.knowledge_areas || []).map((area: any) => {
      if (typeof area === 'string') {
        return { _id: area, name: area };
      }
      return area;
    });

    this.lessonForm.patchValue({
      title: this.lesson.title,
      resume: this.lesson.resume,
      references: this.lesson.references || '',
      tags: (this.lesson.tags || []).join(', '),
      methodology: this.lesson.justification?.methodology || '',
      objectives: this.lesson.justification?.objectives || '',
      status: this.lesson.status || 'draft',
      knowledge_area: this.selectedKnowledgeAreas.length > 0 ? 'selected' : ''
    });
  }

  setAvailableStatuses(): void {
    if (!this.lesson) return;
    const currentStatus = this.lesson.status || 'draft';

    // Definir transiciones de estado permitidas
    const statusTransitions: { [key: string]: Array<{value: string, label: string}> } = {
      'draft': [
        { value: 'draft', label: 'Borrador' },
        { value: 'proposed', label: 'Proponer para Revisión' }
      ],
      'proposed': [
        { value: 'proposed', label: 'Propuesta (esperando aprobación del profesor)' }
      ],
      'approved': [
        { value: 'approved', label: 'Aprobada' },
        { value: 'in_development', label: 'Comenzar Desarrollo' }
      ],
      'in_development': [
        { value: 'in_development', label: 'En Desarrollo' },
        { value: 'completed', label: 'Marcar como Completada' }
      ],
      'completed': [
        { value: 'completed', label: 'Completada (esperando calificación)' }
      ],
      'graded': [
        { value: 'graded', label: 'Calificada' }
      ],
      'rejected': [
        { value: 'rejected', label: 'Rechazada (no editable)' }
      ]
    };

    this.availableStatuses = statusTransitions[currentStatus] || [
      { value: currentStatus, label: this.getStatusLabel(currentStatus) }
    ];
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.lessonForm.invalid || this.selectedKnowledgeAreas.length === 0) {
      if (this.selectedKnowledgeAreas.length === 0) {
        this.errorMessage = 'Debes seleccionar al menos un área de conocimiento';
      }
      return;
    }

    // Validaciones según el cambio de estado
    const newStatus = this.lessonForm.value.status;
    const currentStatus = this.lesson?.status || 'draft';

    // Validar si está cambiando de draft a proposed
    if (currentStatus === 'draft' && newStatus === 'proposed') {
      const hasReferences = this.lessonForm.value.references && this.lessonForm.value.references.trim().length > 0;
      const hasFiles = this.lesson?.files && this.lesson.files.length > 0;

      if (!hasReferences) {
        this.errorMessage = 'Debes agregar referencias bibliográficas antes de proponer la lección.';
        return;
      }

      if (!hasFiles) {
        this.errorMessage = 'Debes subir al menos un archivo de la versión propuesta antes de proponer la lección. Ve al detalle de la lección, pestaña Archivos.';
        return;
      }

      if (!confirm('¿Estás seguro de proponer esta lección al profesor? Una vez propuesta, el profesor decidirá si aprobarla o rechazarla.')) {
        return;
      }
    }

    // Validar si está cambiando a completed
    if (newStatus === 'completed') {
      const hasFiles = this.lesson?.files && this.lesson.files.length > 0;
      
      if (!hasFiles) {
        this.errorMessage = 'Debes subir al menos un archivo con el modelo desarrollado antes de marcar como completada.';
        return;
      }

      if (!confirm('¿Estás seguro de marcar esta lección como completada? Una vez completada, el docente procederá a calificarla.')) {
        return;
      }
    }

    this.loading = true;

    const updateData: UpdateAcademicLessonRequest = {
      title: this.lessonForm.value.title,
      resume: this.lessonForm.value.resume,
      justification: {
        methodology: this.lessonForm.value.methodology,
        objectives: this.lessonForm.value.objectives
      },
      references: this.lessonForm.value.references?.trim() || undefined,
      tags: this.lessonForm.value.tags,
      knowledge_areas: this.selectedKnowledgeAreas.map(area => area._id || area.name),
      status: newStatus as any
    };

    this.academicLessonService.updateLesson(this.lessonId, updateData).subscribe({
      next: (response) => {
        this.loading = false;
        this.successMessage = 'Lección actualizada exitosamente';
        
        // Si cambió el estado, mostrar mensaje específico
        if (currentStatus !== newStatus) {
          if (newStatus === 'proposed') {
            this.successMessage = 'Lección propuesta para revisión del docente';
          } else if (newStatus === 'completed') {
            this.successMessage = 'Lección marcada como completada. El docente procederá a calificarla.';
          }
        }

        // Recargar la página después de 1.5 segundos para salir del modo edición
        // Esto evita que el usuario pueda seguir editando después de cambios importantes de estado
        setTimeout(() => {
          window.location.href = `/academia/lessons/${this.lessonId}`;
        }, 1500);
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error.error?.message || 'Error al actualizar la lección';
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/academia/lessons', this.lessonId]);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.lessonForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getErrorMessage(fieldName: string): string {
    const field = this.lessonForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) {
        return 'Este campo es obligatorio';
      }
      if (field.errors['maxlength']) {
        return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
      }
    }
    return '';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'draft': 'Borrador',
      'proposed': 'Propuesta',
      'approved': 'Aprobada',
      'rejected': 'Rechazada',
      'in_development': 'En Desarrollo',
      'completed': 'Completada',
      'graded': 'Calificada'
    };
    return labels[status] || status;
  }

  // Métodos para áreas de conocimiento (igual que en create-lesson)
  loadKnowledgeAreas(): void {
    this.http.get<any>(`${GLOBAL.url}all-areas`).subscribe({
      next: (response) => {
        this.allKnowledgeAreas = response.areas || response || [];
      },
      error: (error) => {
        console.error('Error al cargar knowledge areas:', error);
        this.allKnowledgeAreas = [];
      }
    });
  }

  onKnowledgeAreaInputChange(): void {
    const term = this.knowledgeAreaInput.toLowerCase().trim();
    if (term) {
      this.filteredKnowledgeAreas = this.allKnowledgeAreas.filter(area => 
        area.name.toLowerCase().includes(term) && 
        !this.selectedKnowledgeAreas.some(selected => selected._id === area._id)
      );
      this.showKnowledgeAreaDropdown = true;
    } else {
      this.showKnowledgeAreaDropdown = false;
    }
  }

  selectKnowledgeArea(area: any): void {
    if (!this.selectedKnowledgeAreas.some(selected => selected._id === area._id)) {
      this.selectedKnowledgeAreas.push(area);
      this.updateKnowledgeAreaFormControl();
    }
    this.knowledgeAreaInput = '';
    this.showKnowledgeAreaDropdown = false;
  }

  removeKnowledgeArea(area: any): void {
    this.selectedKnowledgeAreas = this.selectedKnowledgeAreas.filter(selected => selected._id !== area._id);
    this.updateKnowledgeAreaFormControl();
  }

  addNewKnowledgeAreaFromInput(): void {
    const newArea = { _id: Date.now().toString(), name: this.knowledgeAreaInput.trim() };
    if (newArea.name && !this.selectedKnowledgeAreas.some(selected => selected.name === newArea.name)) {
      this.selectedKnowledgeAreas.push(newArea);
      this.updateKnowledgeAreaFormControl();
    }
    this.knowledgeAreaInput = '';
    this.showKnowledgeAreaDropdown = false;
  }

  updateKnowledgeAreaFormControl(): void {
    const value = this.selectedKnowledgeAreas.length > 0 ? 'selected' : '';
    this.lessonForm.patchValue({ knowledge_area: value });
  }

  get f() { return this.lessonForm.controls; }
}

