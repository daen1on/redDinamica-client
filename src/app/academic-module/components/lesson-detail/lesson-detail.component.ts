import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AcademicLessonService } from '../../services/academic-lesson.service';
import { AcademicLesson } from '../../models/academic-lesson.model';

@Component({
  selector: 'app-lesson-detail',
  templateUrl: './lesson-detail.component.html',
  styleUrls: ['./lesson-detail.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class LessonDetailComponent implements OnInit {
  lesson: AcademicLesson | null = null;
  lessonId: string = '';
  userRole: string = '';
  loading = false;
  errorMessage = '';
  successMessage = '';

  // Variables para modales
  showApproveModal = false;
  showRejectModal = false;
  showGradeModal = false;
  approveData = { feedback: '', grade: 0 };
  rejectReason = '';
  gradeData = { grade: 0, feedback: '' };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private academicLessonService: AcademicLessonService
  ) { }

  ngOnInit(): void {
    this.lessonId = this.route.snapshot.params['id'];
    this.loadUserInfo();
    this.loadLesson();
  }

  loadUserInfo(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.userRole = user.role || '';
  }

  loadLesson(): void {
    this.loading = true;
    this.academicLessonService.getLessonById(this.lessonId).subscribe({
      next: (response) => {
        this.lesson = response.data;
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'Error al cargar la lección';
        this.loading = false;
        console.error('Error loading lesson:', error);
      }
    });
  }

  approveLesson(): void {
    if (!this.approveData.feedback.trim()) {
      this.errorMessage = 'Debe proporcionar retroalimentación';
      return;
    }

    this.loading = true;
    this.academicLessonService.approveLesson(this.lessonId, this.approveData).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.lesson = response.data;
        this.showApproveModal = false;
        this.loading = false;
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Error al aprobar la lección';
        this.loading = false;
      }
    });
  }

  rejectLesson(): void {
    if (!this.rejectReason.trim()) {
      this.errorMessage = 'Debe proporcionar una razón para el rechazo';
      return;
    }

    this.loading = true;
    this.academicLessonService.rejectLesson(this.lessonId, this.rejectReason).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.lesson = response.data;
        this.showRejectModal = false;
        this.loading = false;
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Error al rechazar la lección';
        this.loading = false;
      }
    });
  }

  gradeLesson(): void {
    if (this.gradeData.grade < 0 || this.gradeData.grade > 5) {
      this.errorMessage = 'La calificación debe estar entre 0 y 5';
      return;
    }

    this.loading = true;
    this.academicLessonService.gradeLesson(this.lessonId, this.gradeData).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.lesson = response.data;
        this.showGradeModal = false;
        this.loading = false;
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Error al calificar la lección';
        this.loading = false;
      }
    });
  }

  exportToMain(): void {
    this.loading = true;
    this.academicLessonService.exportToMain(this.lessonId).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.lesson = response.data;
        this.loading = false;
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Error al exportar la lección';
        this.loading = false;
      }
    });
  }

  deleteLesson(): void {
    if (confirm('¿Está seguro de que desea eliminar esta lección?')) {
      this.loading = true;
      this.academicLessonService.deleteLesson(this.lessonId).subscribe({
        next: (response) => {
          this.successMessage = response.message;
          setTimeout(() => {
            this.router.navigate(['/academia/lessons']);
          }, 2000);
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Error al eliminar la lección';
          this.loading = false;
        }
      });
    }
  }

  editLesson(): void {
    this.router.navigate(['/academia/lessons', this.lessonId, 'edit']);
  }

  // Métodos para abrir/cerrar modales
  openApproveModal(): void {
    this.showApproveModal = true;
    this.approveData = { feedback: '', grade: 0 };
  }

  closeApproveModal(): void {
    this.showApproveModal = false;
  }

  openRejectModal(): void {
    this.showRejectModal = true;
    this.rejectReason = '';
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
  }

  openGradeModal(): void {
    this.showGradeModal = true;
    this.gradeData = { grade: 0, feedback: '' };
  }

  closeGradeModal(): void {
    this.showGradeModal = false;
  }

  // Métodos helper para verificar permisos
  canEdit(): boolean {
    return this.userRole === 'student' && this.lesson?.status === 'draft';
  }

  canDelete(): boolean {
    return this.userRole === 'student' && ['draft', 'proposed'].includes(this.lesson?.status || '');
  }

  canApprove(): boolean {
    return this.userRole === 'teacher' && this.lesson?.status === 'proposed';
  }

  canGrade(): boolean {
    return this.userRole === 'teacher' && this.lesson?.status === 'completed';
  }

  canExport(): boolean {
    return this.userRole === 'teacher' && this.lesson?.status === 'graded' && !this.lesson?.isExported;
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

  getDifficultyLabel(difficulty: string): string {
    const difficultyLabels: { [key: string]: string } = {
      'Fácil': 'Fácil',
      'Moderado': 'Moderado',
      'Difícil': 'Difícil'
    };
    return difficultyLabels[difficulty] || difficulty;
  }

  getDifficultyBadgeClass(difficulty: string): string {
    const difficultyClasses: { [key: string]: string } = {
      'Fácil': 'badge-success',
      'Moderado': 'badge-warning',
      'Difícil': 'badge-danger'
    };
    return difficultyClasses[difficulty] || 'badge-secondary';
  }

  getDurationLabel(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minutos`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours} hora${hours > 1 ? 's' : ''}`;
      } else {
        return `${hours} hora${hours > 1 ? 's' : ''} ${remainingMinutes} minutos`;
      }
    }
  }
}

