import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { GLOBAL } from '../../../services/GLOBAL';
import { AcademicLessonService } from '../../services/academic-lesson.service';
import { AcademicGroupService } from '../../services/academic-group.service';
import { CreateAcademicLessonRequest } from '../../models/academic-lesson.model';
import { AcademicGroup } from '../../models/academic-group.model';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-create-lesson',
  templateUrl: './create-lesson.component.html',
  styleUrls: ['./create-lesson.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule]
})
export class CreateLessonComponent implements OnInit {
  lessonForm: FormGroup;
  groups: AcademicGroup[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  preselectedGroupId: string | null = null;
  showSuccessActions = false;
  submitted = false;
  
  // Variables para áreas de conocimiento
  selectedKnowledgeAreas: any[] = [];
  knowledgeAreaInput = '';
  filteredKnowledgeAreas: any[] = [];
  showKnowledgeAreaDropdown = false;
  allKnowledgeAreas: any[] = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private academicLessonService: AcademicLessonService,
    private academicGroupService: AcademicGroupService,
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
      knowledge_area: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Obtener el groupId de los query parameters si existe
    this.route.queryParams.subscribe(params => {
      this.preselectedGroupId = params['groupId'] || null;
      this.loadGroups();
    });
    this.loadKnowledgeAreas();
  }

  loadGroups(): void {
    // Determinar el rol del usuario para cargar los grupos apropiados
    const user = JSON.parse(localStorage.getItem('user') || localStorage.getItem('identity') || '{}');
    const userRole = user.role?.toLowerCase();
    
    // Los docentes ven sus grupos de enseñanza, los estudiantes ven sus grupos de participación
    const groupsObservable = (['teacher', 'admin', 'facilitator'].includes(userRole)) 
      ? this.academicGroupService.getTeacherGroups()
      : this.academicGroupService.getStudentGroups();
    
    groupsObservable.subscribe({
      next: (response) => {
        this.groups = response.data;
        
        // El grupo está implícito por el contexto, no necesitamos seleccionarlo
      },
      error: (error) => {
        console.error('Error al cargar grupos:', error);
        this.errorMessage = 'Error al cargar los grupos';
      }
    });
  }

  onSubmit(): void {
    this.submitted = true;
    
    if (this.lessonForm.valid && this.selectedKnowledgeAreas.length > 0) {
      this.loading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const lessonData: CreateAcademicLessonRequest = {
        title: this.lessonForm.value.title,
        resume: this.lessonForm.value.resume,
        academicGroup: this.preselectedGroupId || '', // Usar el grupo preseleccionado
        justification: {
          methodology: this.lessonForm.value.methodology,
          objectives: this.lessonForm.value.objectives
        },
        references: this.lessonForm.value.references?.trim() || undefined,
        tags: this.lessonForm.value.tags,
        knowledge_areas: this.selectedKnowledgeAreas.map(area => area._id)
      };
      console.log(lessonData);
      this.academicLessonService.createLesson(lessonData).subscribe({
        next: (response) => {
          this.loading = false;
          this.successMessage = 'Lección creada exitosamente. Ahora puedes invitar colaboradores y comenzar a trabajar en equipo.';
          this.showSuccessActions = true;
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = error.error?.message || 'Error al crear la lección';
        }
      });
    } else {
      if (this.selectedKnowledgeAreas.length === 0) {
        this.errorMessage = 'Debes seleccionar al menos un área de conocimiento';
      }
    }
  }

  cancel(): void {
    // Si vino desde un grupo específico, volver al grupo
    if (this.preselectedGroupId) {
      this.router.navigate(['/academia/groups', this.preselectedGroupId]);
    } else {
      this.router.navigate(['/academia/lessons']);
    }
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
      if (field.errors['min']) {
        return `El valor mínimo es ${field.errors['min'].min}`;
      }
      if (field.errors['max']) {
        return `El valor máximo es ${field.errors['max'].max}`;
      }
    }
    return '';
  }

  getLevelLabel(level: string): string {
    const labels: { [key: string]: string } = {
      'primary': 'Primaria',
      'secondary': 'Secundaria',
      'university': 'Universidad'
    };
    return labels[level] || level;
  }

  getDurationLabel(minutes: number): string {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${mins}min`;
  }

  // Métodos para áreas de conocimiento
  loadKnowledgeAreas(): void {
    // Cargar áreas de conocimiento reales desde el backend
    this.http.get<any>(`${GLOBAL.url}all-areas`).subscribe({
      next: (response) => {
        // El backend puede devolver { areas: [...] } o directamente el array
        this.allKnowledgeAreas = response.areas || response || [];
        console.log('Knowledge areas cargadas:', this.allKnowledgeAreas);
      },
      error: (error) => {
        console.error('Error al cargar knowledge areas:', error);
        // Fallback con datos básicos en caso de error
        this.allKnowledgeAreas = [
          { _id: 'temp1', name: 'Matemáticas' },
          { _id: 'temp2', name: 'Física' },
          { _id: 'temp3', name: 'Química' },
          { _id: 'temp4', name: 'Biología' },
          { _id: 'temp5', name: 'Ciencias de la Computación' }
        ];
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

  // Métodos de navegación después del éxito
  createAnotherLesson(): void {
    this.showSuccessActions = false;
    this.successMessage = '';
    this.lessonForm.reset();
    this.selectedKnowledgeAreas = [];
    this.submitted = false;
  }

  closeAndReturn(): void {
    if (this.preselectedGroupId) {
      this.router.navigate(['/academia/groups', this.preselectedGroupId]);
    } else {
      this.router.navigate(['/academia/lessons']);
    }
  }

  // Getter para el formulario
  get f() { return this.lessonForm.controls; }
}
