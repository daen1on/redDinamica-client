import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AcademicLessonService } from '../../services/academic-lesson.service';
import { AcademicGroupService } from '../../services/academic-group.service';
import { AcademicLesson } from '../../models/academic-lesson.model';
import { AcademicGroup } from '../../models/academic-group.model';

@Component({
  selector: 'app-lesson-management',
  templateUrl: './lesson-management.component.html',
  styleUrls: ['./lesson-management.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class LessonManagementComponent implements OnInit {
  lessons: AcademicLesson[] = [];
  filteredLessons: AcademicLesson[] = [];
  groups: AcademicGroup[] = [];
  loading = false;
  errorMessage = '';
  userRole = '';

  // Filtros
  searchTerm = '';
  filterStatus = '';
  filterGroup = '';

  constructor(
    private academicLessonService: AcademicLessonService,
    private academicGroupService: AcademicGroupService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadData();
  }

  loadUserInfo(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.userRole = user.role || '';
  }

  loadData(): void {
    this.loading = true;
    
    // Cargar grupos si es docente
    if (this.userRole === 'teacher') {
      this.academicGroupService.getTeacherGroups().subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.groups = response.data;
          }
        },
        error: (error) => {
          console.error('Error loading groups:', error);
        }
      });
    }

    // Cargar lecciones según el rol
    if (this.userRole === 'teacher') {
      this.academicLessonService.getTeacherLessons().subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.lessons = response.data;
            this.applyFilters();
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
    } else {
      this.academicLessonService.getMyLessons().subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.lessons = response.data;
            this.applyFilters();
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
  }

  applyFilters(): void {
    this.filteredLessons = this.lessons.filter(lesson => {
      const matchesSearch = !this.searchTerm || 
        lesson.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        lesson.resume.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesStatus = !this.filterStatus || lesson.status === this.filterStatus;
      const matchesGroup = !this.filterGroup || lesson.academicGroup === this.filterGroup;
      
      return matchesSearch && matchesStatus && matchesGroup;
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterStatus = '';
    this.filterGroup = '';
    this.applyFilters();
  }

  getFilteredLessons(): AcademicLesson[] {
    return this.filteredLessons;
  }

  createNewLesson(): void {
    this.router.navigate(['/academia/lessons/create']);
  }

  viewLessonDetails(lessonId: string): void {
    this.router.navigate(['/academia/lessons', lessonId]);
  }

  editLesson(lesson: AcademicLesson): void {
    this.router.navigate(['/academia/lessons', lesson._id, 'edit']);
  }

  deleteLesson(lessonId: string): void {
    if (confirm('¿Estás seguro de que quieres eliminar esta lección?')) {
      this.academicLessonService.deleteLesson(lessonId).subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.loadData(); // Recargar datos
          }
        },
        error: (error) => {
          console.error('Error deleting lesson:', error);
          this.errorMessage = 'Error al eliminar la lección';
        }
      });
    }
  }

  approveLesson(lessonId: string): void {
    this.academicLessonService.approveLesson(lessonId, { feedback: 'Lección aprobada' }).subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.loadData(); // Recargar datos
        }
      },
      error: (error) => {
        console.error('Error approving lesson:', error);
        this.errorMessage = 'Error al aprobar la lección';
      }
    });
  }

  rejectLesson(lessonId: string): void {
    this.academicLessonService.rejectLesson(lessonId, 'Lección rechazada').subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.loadData(); // Recargar datos
        }
      },
      error: (error) => {
        console.error('Error rejecting lesson:', error);
        this.errorMessage = 'Error al rechazar la lección';
      }
    });
  }

  gradeLesson(lessonId: string): void {
    // Implementar lógica de calificación
    console.log('Grading lesson:', lessonId);
  }

  exportToMain(lessonId: string): void {
    this.academicLessonService.exportToMain(lessonId).subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.loadData(); // Recargar datos
        }
      },
      error: (error) => {
        console.error('Error exporting lesson:', error);
        this.errorMessage = 'Error al exportar la lección';
      }
    });
  }

  // Métodos de permisos
  canEdit(lesson: AcademicLesson): boolean {
    return this.userRole === 'student' && lesson.author === this.getCurrentUserId();
  }

  canDelete(lesson: AcademicLesson): boolean {
    return this.userRole === 'student' && lesson.author === this.getCurrentUserId();
  }

  canApprove(lesson: AcademicLesson): boolean {
    return this.userRole === 'teacher' && lesson.status === 'proposed';
  }

  canGrade(lesson: AcademicLesson): boolean {
    return this.userRole === 'teacher' && lesson.status === 'completed';
  }

  canExport(lesson: AcademicLesson): boolean {
    return this.userRole === 'teacher' && lesson.status === 'graded' && lesson.grade >= 4;
  }

  // Métodos de utilidad
  getCurrentUserId(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user._id || '';
  }

  getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      'draft': 'Borrador',
      'proposed': 'Propuesta',
      'approved': 'Aprobada',
      'rejected': 'Rechazada',
      'completed': 'Completada',
      'graded': 'Calificada'
    };
    return statusLabels[status] || status;
  }

  getStatusBadgeClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'draft': 'badge-secondary',
      'proposed': 'badge-warning',
      'approved': 'badge-success',
      'rejected': 'badge-danger',
      'completed': 'badge-info',
      'graded': 'badge-primary'
    };
    return statusClasses[status] || 'badge-secondary';
  }

  getLevelLabel(level: string): string {
    const levelLabels: { [key: string]: string } = {
      'Colegio': 'Colegio',
      'Universidad': 'Universidad'
    };
    return levelLabels[level] || level;
  }
}
