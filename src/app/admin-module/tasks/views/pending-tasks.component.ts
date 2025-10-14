import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { OnInit } from '@angular/core';
import { AdminTasksService } from '../../services/admin-tasks.service';
import { FeaturedLessonsComponent } from './featured-lessons.component';
import { UserService } from '../../../services/user.service';
import { LessonService } from '../../../services/lesson.service';

@Component({
  selector: 'admin-pending-tasks',
  standalone: true,
  imports: [CommonModule, RouterModule, FeaturedLessonsComponent],
  templateUrl: './pending-tasks.component.html',
  styleUrls: ['./pending-tasks.component.css']
})
export class PendingTasksComponent implements OnInit {
  activeTab: string = 'convocatorias';
  convocatorias: any[] = [];
  convocatoriasAbiertas: any[] = [];
  recursos: any[] = [];
  sugerencias: any[] = [];
  // Count de lecciones académicas listas para exportar (recibido del componente hijo)
  featuredLessonsCount = 0;

  constructor(
    private tasks: AdminTasksService,
    private userService: UserService,
    private lessonService: LessonService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Verificar si hay un parámetro 'tab' en la URL para abrir una pestaña específica
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
    });

    // Cargar todas las pestañas al inicio para mostrar los badges de notificación
    this.reloadConvocatorias();
    this.reloadConvocatoriasAbiertas();
    this.reloadSugerencias();
    this.reloadRecursos();
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.loadActiveTabData();
  }

  loadActiveTabData(): void {
    switch (this.activeTab) {
      case 'convocatorias':
        this.reloadConvocatorias();
        this.reloadConvocatoriasAbiertas();
        break;
      case 'sugerencias':
        this.reloadSugerencias();
        break;
      case 'recursos':
        this.reloadRecursos();
        break;
    }
  }

  reloadConvocatorias(): void {
    this.tasks.listConvocatorias().subscribe({ 
      next: (res: any) => {
        this.convocatorias = res.lessons || [];
        this.normalizeLessons(this.convocatorias);
      }, 
      error: () => this.convocatorias = [] 
    });
  }

  reloadConvocatoriasAbiertas(): void {
    this.tasks.listConvocatoriasAbiertas().subscribe({
      next: (res: any) => {
        this.convocatoriasAbiertas = (res.items || res.lessons) || [];
        this.normalizeLessons(this.convocatoriasAbiertas);
      },
      error: () => this.convocatoriasAbiertas = []
    });
  }

  reloadRecursos(): void {
    this.tasks.listRecursosPendientes().subscribe({ 
      next: (res: any) => this.recursos = res.resources || [], 
      error: () => this.recursos = [] 
    });
    console.log(this.recursos);

  }

  reloadSugerencias(): void {
    this.tasks.listSugerencias().subscribe({ 
      next: (res: any) => this.sugerencias = res.lessons || [], 
      error: () => this.sugerencias = [] 
    });
  }

  aprobar(id: string): void {
    if (confirm('¿Estás seguro de que quieres aprobar este recurso?')) {
      this.tasks.aprobarRecurso(id).subscribe({ 
        next: () => {
          alert('Recurso aprobado exitosamente');
          this.reloadRecursos();
        },
        error: (err) => {
          alert('Error al aprobar el recurso: ' + (err.error?.message || 'Error desconocido'));
        }
      });
    }
  }

  rechazar(id: string): void {
    const motivo = prompt('Por favor, introduce el motivo del rechazo:');
    if (motivo !== null && motivo.trim() !== '') {
      this.tasks.rechazarRecurso(id, motivo.trim()).subscribe({ 
        next: () => {
          alert('Recurso rechazado exitosamente');
          this.reloadRecursos();
        },
        error: (err) => {
          alert('Error al rechazar el recurso: ' + (err.error?.message || 'Error desconocido'));
        }
      });
    }
  }

  // Helpers
  private normalizeLessons(list: any[]): void {
    if (!Array.isArray(list)) return;
    const token = this.userService.getToken() || '';

    list.forEach((lesson: any) => {
      // Enriquecer líder si viene como ObjectId o sin nombre
      const leaderId = typeof lesson?.leader === 'string' ? lesson.leader : lesson?.leader?._id;
      if (leaderId && (!lesson.leader || !lesson.leader.name)) {
        this.userService.getUser(leaderId).subscribe({
          next: (resp: any) => {
            if (resp && resp.user) {
              lesson.leader = {
                _id: resp.user._id,
                name: resp.user.name,
                surname: resp.user.surname,
                email: resp.user.email
              };
            }
          },
          error: () => {}
        });
      }

      // Asegurar versión presente
      if (lesson.version === undefined || lesson.version === null) {
        this.lessonService.getLesson(token, lesson._id).subscribe({
          next: (resp: any) => {
            const l = resp?.lesson;
            if (l) {
              if (l.version !== undefined) {
                lesson.version = l.version;
              }
              if (!lesson.leader && l.leader) {
                lesson.leader = l.leader;
              }
            }
          },
          error: () => {}
        });
      }
    });
  }

  getInterestedCount(item: any): number {
    return (item && item.call && Array.isArray(item.call.interested)) ? item.call.interested.length : 0;
  }

  onFeaturedLessonsCountChange(count: number): void {
    this.featuredLessonsCount = count;
  }
}


