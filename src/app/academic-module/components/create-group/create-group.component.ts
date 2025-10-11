import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AcademicGroupService } from '../../services/academic-group.service';
import { CreateAcademicGroupRequest } from '../../models/academic-group.model';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BasicDataService } from '../../../services/basicData.service';
import { KnowledgeArea } from '../../../models/knowledge-area.model';

@Component({
  selector: 'app-create-group',
  templateUrl: './create-group.component.html',
  styleUrls: ['./create-group.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule]
})
export class CreateGroupComponent implements OnInit {
  @ViewChild('successAlert') successAlertRef?: ElementRef<HTMLDivElement>;
  groupForm: FormGroup;
  academicLevels = ['Colegio', 'Universidad'];
  validGrades: string[] = [];
  knowledgeAreas: KnowledgeArea[] = [];
  // Autocompletado de materias/áreas
  selectedSubjects: Array<{ _id?: string; name: string }> = [];
  subjectInput = '';
  filteredSubjects: Array<{ _id?: string; name: string }> = [];
  showSubjectDropdown = false;
  submitted = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private academicGroupService: AcademicGroupService,
    private basicDataService: BasicDataService,
    private router: Router
  ) {
    this.groupForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      academicLevel: ['', Validators.required],
      grade: ['', Validators.required],
      maxStudents: [30, [Validators.required, Validators.min(1), Validators.max(100)]],
      subjects: [[]]
    });
  }

  ngOnInit(): void {
    // Cargar áreas de conocimiento
    this.loadKnowledgeAreas();
    
    // Escuchar cambios en el nivel académico para actualizar los grados válidos
    this.groupForm.get('academicLevel')?.valueChanges.subscribe(level => {
      if (level) {
        this.loadValidGrades(level);
        this.groupForm.get('grade')?.setValue('');
      }
    });
  }

  loadValidGrades(academicLevel: string): void {
    this.academicGroupService.getValidGrades(academicLevel).subscribe({
      next: (response) => {
        this.validGrades = response.data;
      },
      error: (error) => {
        console.error('Error al cargar grados válidos:', error);
        this.errorMessage = 'Error al cargar los grados válidos';
      }
    });
  }

  onSubmit(): void {
    // Evita envíos duplicados por doble clic
    if (this.loading) {
      return;
    }
    this.submitted = true;
    const subjectsArray: string[] = this.groupForm.value.subjects || [];
    if (subjectsArray.length === 0 && this.selectedSubjects.length > 0) {
      // Sincroniza por si vienen solo desde chips
      this.groupForm.patchValue({ subjects: this.selectedSubjects.map(s => s.name) });
    }

    // Bloquea inmediatamente el botón para evitar múltiples envíos por doble clic
    this.loading = true;

    const hasSubjects = (this.groupForm.value.subjects?.length || 0) > 0;
    if (!(this.groupForm.valid && hasSubjects)) {
      // Si el formulario no es válido, libera el bloqueo
      this.loading = false;
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

      const groupData: CreateAcademicGroupRequest = {
        name: this.groupForm.value.name,
        description: this.groupForm.value.description,
        academicLevel: this.groupForm.value.academicLevel,
        grade: this.groupForm.value.grade,
        maxStudents: this.groupForm.value.maxStudents,
        subjects: this.groupForm.value.subjects || []
      };

      console.log('Enviando datos del grupo:', groupData); // Debug log
      
      this.academicGroupService.createGroup(groupData).subscribe({
        next: (response) => {
          console.log('Respuesta exitosa:', response); // Debug log
          this.loading = false;
          this.successMessage = response.message;
          // Enfoca y desplaza hacia el mensaje de éxito para dar feedback inmediato
          setTimeout(() => {
            const el = this.successAlertRef?.nativeElement;
            if (el) {
              el.focus();
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 0);
          setTimeout(() => {
            this.router.navigate(['/academia/groups']);
          }, 2000);
        },
        error: (error) => {
          console.error('Error al crear grupo:', error); // Debug log
          this.loading = false;
          this.errorMessage = error.error?.message || error.message || 'Error al crear el grupo';
        }
      });
    
  }

  loadKnowledgeAreas(): void {
    this.basicDataService.getKnowledgeAreas().subscribe({
      next: (response) => {
        if (response && Array.isArray(response.areas)) {
          this.knowledgeAreas = response.areas;
          console.log('Áreas de conocimiento cargadas:', this.knowledgeAreas);
        } else {
          this.knowledgeAreas = [];
          console.error('La respuesta de áreas de conocimiento no es un array:', response);
        }
      },
      error: (error) => {
        console.error("Error al cargar las áreas de conocimiento:", error);
        this.knowledgeAreas = [];
      }
    });
  }

  addSubject(): void {
    const subjects = this.groupForm.get('subjects')?.value || [];
    const newSubject = (this.subjectInput || '').trim();
    if (newSubject) {
      if (!subjects.includes(newSubject)) {
        subjects.push(newSubject);
        this.groupForm.get('subjects')?.setValue(subjects);
      }
      if (!this.selectedSubjects.some(s => s.name.toLowerCase() === newSubject.toLowerCase())) {
        this.selectedSubjects.push({ name: newSubject });
      }
      this.subjectInput = '';
      this.showSubjectDropdown = false;
    }
  }

  addSubjectFromKnowledgeArea(area: KnowledgeArea): void {
    const subjects = this.groupForm.get('subjects')?.value || [];
    if (!subjects.includes(area.name)) {
      subjects.push(area.name);
      this.groupForm.get('subjects')?.setValue(subjects);
    }
    if (!this.selectedSubjects.some(s => s.name === area.name)) {
      this.selectedSubjects.push({ _id: (area as any)._id, name: area.name });
    }
  }

  removeSubject(index: number): void {
    const subjects = this.groupForm.get('subjects')?.value || [];
    subjects.splice(index, 1);
    this.groupForm.get('subjects')?.setValue(subjects);
  }

  // Manejo de chips del nuevo UI
  selectSubject(area: { _id?: string; name: string }): void {
    if (!this.selectedSubjects.some(s => s.name.toLowerCase() === area.name.toLowerCase())) {
      this.selectedSubjects.push(area);
    }
    const subjects = this.groupForm.get('subjects')?.value || [];
    if (!subjects.includes(area.name)) {
      subjects.push(area.name);
      this.groupForm.get('subjects')?.setValue(subjects);
    }
    this.subjectInput = '';
    this.showSubjectDropdown = false;
  }

  removeSubjectChip(area: { _id?: string; name: string }): void {
    this.selectedSubjects = this.selectedSubjects.filter(s => s.name !== area.name);
    const subjects = (this.groupForm.get('subjects')?.value || []).filter((s: string) => s !== area.name);
    this.groupForm.get('subjects')?.setValue(subjects);
  }

  onSubjectInputChange(): void {
    const term = (this.subjectInput || '').toLowerCase().trim();
    if (term) {
      const base = this.knowledgeAreas.map(a => ({ _id: (a as any)._id, name: a.name }));
      this.filteredSubjects = base.filter(a => 
        a.name.toLowerCase().includes(term) &&
        !this.selectedSubjects.some(s => s.name.toLowerCase() === a.name.toLowerCase())
      );
      this.showSubjectDropdown = true;
    } else {
      this.showSubjectDropdown = false;
    }
  }

  addNewSubjectFromInput(): void {
    const name = (this.subjectInput || '').trim();
    if (!name) return;
    this.selectSubject({ name });
  }

  cancel(): void {
    this.router.navigate(['/academia/groups']);
  }

  // Métodos para validación y mensajes de error
  isFieldInvalid(fieldName: string): boolean {
    const field = this.groupForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getErrorMessage(fieldName: string): string {
    const field = this.groupForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) {
        return 'Este campo es obligatorio';
      }
      if (field.errors['maxlength']) {
        return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
      }
      if (field.errors['min']) {
        return `Mínimo ${field.errors['min'].min}`;
      }
      if (field.errors['max']) {
        return `Máximo ${field.errors['max'].max}`;
      }
    }
    return '';
  }

  getAcademicYearOptions(): string[] {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 2; i++) {
      years.push(i.toString());
    }
    return years;
  }
}
