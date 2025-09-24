import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AcademicGroupService } from '../../services/academic-group.service';
import { AcademicLessonService } from '../../services/academic-lesson.service';
import { AcademicGroup } from '../../models/academic-group.model';
import { AcademicLesson } from '../../models/academic-lesson.model';

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class StudentDashboardComponent implements OnInit {
  groups: AcademicGroup[] = [];
  myLessons: AcademicLesson[] = [];
  loading = false;
  errorMessage = '';

  // Estadísticas
  totalGroups = 0;
  totalLessons = 0;
  lessonsByStatus: { [key: string]: number } = {};
  averageGrade = 0;
  totalGradedLessons = 0;

  // Permisos de grupos
  groupPermissions: { [groupId: string]: boolean } = {};

  constructor(
    private academicGroupService: AcademicGroupService,
    private academicLessonService: AcademicLessonService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;
    
    // Cargar grupos del estudiante
    this.academicGroupService.getStudentGroups().subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.groups = (response.data || []).map((g: any) => {
            // Normalizar campo teacher para evitar [object Object]
            const teacher = g?.teacher;
            console.log(teacher);
            if (teacher && typeof teacher === 'object') {
              const name = [teacher.name, teacher.surname].filter(Boolean).join(' ').trim();
              console.log(name);
              return { ...g, teacher: name || teacher._id || teacher.id || 'Docente' } as any;
            }
            return g;
          });
          this.totalGroups = this.groups.length;
          
          // Verificar permisos para cada grupo
          this.checkGroupPermissions();
        }
      },
      error: (error) => {
        console.error('Error loading groups:', error);
        this.errorMessage = 'Error al cargar los grupos';
      }
    });

    // Cargar lecciones del estudiante
    this.academicLessonService.getMyLessons().subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.myLessons = response.data;
          this.totalLessons = this.myLessons.length;
          this.calculateStatistics();
        }
      },
      error: (error) => {
        console.error('Error loading lessons:', error);
        this.errorMessage = 'Error al cargar las lecciones';
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  calculateStatistics(): void {
    // Contar lecciones por estado
    this.lessonsByStatus = {};
    this.myLessons.forEach(lesson => {
      const status = lesson.status;
      this.lessonsByStatus[status] = (this.lessonsByStatus[status] || 0) + 1;
    });

    // Calcular promedio de calificaciones
    const gradedLessons = this.myLessons.filter(lesson => lesson.grade && lesson.grade > 0);
    this.totalGradedLessons = gradedLessons.length;
    
    if (this.totalGradedLessons > 0) {
      const totalGrade = gradedLessons.reduce((sum, lesson) => sum + (lesson.grade || 0), 0);
      this.averageGrade = Math.round((totalGrade / this.totalGradedLessons) * 100) / 100;
    } else {
      this.averageGrade = 0;
    }
  }

  // Métodos para el template
  getTotalGroups(): number {
    return this.totalGroups;
  }

  getTotalLessons(): number {
    return this.totalLessons;
  }

  getLessonsByState(state: string): number {
    return this.lessonsByStatus[state] || 0;
  }

  getAverageGrade(): number {
    return this.averageGrade;
  }

  getStateBadgeClass(state: string): string {
    const stateClasses: { [key: string]: string } = {
      'draft': 'badge-secondary',
      'proposed': 'badge-warning',
      'approved': 'badge-success',
      'rejected': 'badge-danger',
      'completed': 'badge-info',
      'graded': 'badge-primary'
    };
    return stateClasses[state] || 'badge-secondary';
  }

  getStateLabel(state: string): string {
    const stateLabels: { [key: string]: string } = {
      'draft': 'Borrador',
      'proposed': 'Propuesta',
      'approved': 'Aprobada',
      'rejected': 'Rechazada',
      'completed': 'Completada',
      'graded': 'Calificada'
    };
    return stateLabels[state] || state;
  }

  createNewLesson(): void {
    this.router.navigate(['/academia/lessons/create']);
  }

  viewGroup(group: AcademicGroup): void {
    this.router.navigate(['/academia/groups', group._id]);
  }

  viewLesson(lesson: AcademicLesson): void {
    this.router.navigate(['/academia/lessons', lesson._id]);
  }

  // Verificar permisos de cada grupo
  checkGroupPermissions(): void {
    this.groups.forEach(group => {
      this.academicGroupService.canStudentCreateLessons(group._id).subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.groupPermissions[group._id] = response.canCreate;
          }
        },
        error: (error) => {
          console.error(`Error checking permissions for group ${group._id}:`, error);
          this.groupPermissions[group._id] = false;
        }
      });
    });
  }

  // Verificar si el estudiante puede crear lecciones en un grupo específico
  canCreateLessonsInGroup(groupId: string): boolean {
    return this.groupPermissions[groupId] || false;
  }

  // Verificar si el estudiante puede crear lecciones en algún grupo
  canCreateLessonsInAnyGroup(): boolean {
    return Object.values(this.groupPermissions).some(canCreate => canCreate);
  }

  // Navegar a crear lección con validación de permisos
  navigateToCreateLesson(groupId: string): void {
    if (this.canCreateLessonsInGroup(groupId)) {
      this.router.navigate(['/academia/lessons/create'], { 
        queryParams: { groupId: groupId } 
      });
    } else {
      alert('No tienes permisos para crear lecciones en este grupo. Contacta al docente para habilitar esta funcionalidad.');
    }
  }

  // Mostrar selección de grupo para crear lección
  showGroupSelection(): void {
    const groupsWithPermission = this.groups.filter(group => this.canCreateLessonsInGroup(group._id));
    
    if (groupsWithPermission.length === 0) {
      alert('No tienes permisos para crear lecciones en ningún grupo. Contacta al docente para habilitar esta funcionalidad.');
      return;
    }

    if (groupsWithPermission.length === 1) {
      // Si solo hay un grupo con permisos, ir directamente
      this.navigateToCreateLesson(groupsWithPermission[0]._id);
    } else {
      // Si hay múltiples grupos, mostrar selección
      const groupNames = groupsWithPermission.map(group => group.name).join('\n');
      const selectedGroupName = prompt(`Selecciona un grupo para crear la lección:\n\n${groupNames}`);
      
      if (selectedGroupName) {
        const selectedGroup = groupsWithPermission.find(group => group.name === selectedGroupName);
        if (selectedGroup) {
          this.navigateToCreateLesson(selectedGroup._id);
        }
      }
    }
  }
}
