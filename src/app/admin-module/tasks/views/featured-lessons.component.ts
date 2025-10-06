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

  constructor(private adminTasks: AdminTasksService, private academicLessons: AcademicLessonService) {}

  ngOnInit(): void {
    this.loadLessons();
  }

  loadLessons(): void {
    this.loading = true;
    // Reutilizamos el servicio de tareas admin para listar lecciones académicas
    this.adminTasks.listLeccionesAcademicas().subscribe({
      next: (res: any) => {
        this.lessons = res?.data || [];
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
    if(!confirm('¿Mover esta lección a la RedDinámica principal?')) return;
    this.adminTasks.moverLeccionAcademica(lessonId).subscribe({
      next: () => this.loadLessons(),
      error: (err) => {
        console.error(err);
        this.errorMessage = 'No se pudo mover la lección';
      }
    });
  }
}


