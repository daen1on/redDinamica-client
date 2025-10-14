import { Component, OnInit, Output, EventEmitter } from '@angular/core';
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
  showPreviewModal = false;
  previewLesson: any = null;

  // Emitir el count de lecciones al componente padre
  @Output() lessonsCountChange = new EventEmitter<number>();

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
        console.log('📌 [FeaturedLessons] lessons cargadas:', this.lessons);
        // Emitir el count al padre
        this.lessonsCountChange.emit(this.lessons.length);
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Error al cargar lecciones académicas';
        this.lessonsCountChange.emit(0);
        this.loading = false;
      }
    });
  }

  moverARedDinamica(lessonId: string): void {
    // Buscar datos de la lección seleccionada para previsualización
    const found = this.lessons.find(l => l._id === lessonId) || null;
    this.previewLesson = found;
    console.log('👁️ [FeaturedLessons] previewLesson:', this.previewLesson);
    this.selectedLessonId = lessonId;
    this.showPreviewModal = true;
  }

  confirmarMovimiento(): void {
    if (!this.selectedLessonId) return;
    this.loading = true;
    this.adminTasks.moverLeccionAcademica(this.selectedLessonId).subscribe({
      next: () => {
        console.log('✅ [FeaturedLessons] Publicada en RedDinámica:', this.selectedLessonId);
        this.showConfirmModal = false;
        this.showPreviewModal = false;
        this.selectedLessonId = null;
        this.loadLessons();
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'No se pudo mover la lección';
        this.loading = false;
        this.showConfirmModal = false;
        this.showPreviewModal = false;
        this.selectedLessonId = null;
      }
    });
  }

  cancelarMovimiento(): void {
    this.showConfirmModal = false;
    this.showPreviewModal = false;
    this.selectedLessonId = null;
  }
}


