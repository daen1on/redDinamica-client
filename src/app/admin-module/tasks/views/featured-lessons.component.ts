import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AcademicLessonService } from '../../../academic-module/services/academic-lesson.service';
import { AdminTasksService } from '../../services/admin-tasks.service';

@Component({
  selector: 'app-featured-lessons',
  templateUrl: './featured-lessons.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class FeaturedLessonsComponent implements OnInit {
  loading = false;
  errorMessage = '';
  lessons: any[] = [];
  selectedLessonId: string | null = null;
  showConfirmModal = false;

  constructor(private adminTasks: AdminTasksService, private academicLessons: AcademicLessonService) {}

  ngOnInit(): void {
    this.loadLessons();
  }

  loadLessons(): void {
    this.loading = true;
    // Reutilizamos el servicio de tareas admin para listar lecciones académicas
    this.adminTasks.listLeccionesAcademicas().subscribe({
      next: (res: any) => {
        // API devuelve { items } según admin.routes.js
        this.lessons = res?.items || res?.data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Error al cargar lecciones académicas';
        this.loading = false;
      }
    });
  }

  moverARedDinamica(lessonId: string): void {
    // Abrir modal de confirmación
    this.selectedLessonId = lessonId;
    this.showConfirmModal = true;
  }

  confirmarMovimiento(): void {
    if (!this.selectedLessonId) return;
    this.loading = true;
    this.adminTasks.moverLeccionAcademica(this.selectedLessonId).subscribe({
      next: () => {
        this.showConfirmModal = false;
        this.selectedLessonId = null;
        this.loadLessons();
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'No se pudo mover la lección';
        this.loading = false;
        this.showConfirmModal = false;
        this.selectedLessonId = null;
      }
    });
  }

  cancelarMovimiento(): void {
    this.showConfirmModal = false;
    this.selectedLessonId = null;
  }
}


