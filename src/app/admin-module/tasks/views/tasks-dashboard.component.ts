import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OnInit } from '@angular/core';
import { AdminTasksService, TasksSummary } from '../../services/admin-tasks.service';

@Component({
  selector: 'admin-tasks-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
  <div class="container">
    <h3>Gestión académica y tareas</h3>
    <div class="row g-3 my-2">
      <div class="col-12 col-md-6 col-lg-3" *ngFor="let card of cards">
        <div class="card h-100">
          <div class="card-body d-flex flex-column justify-content-between">
            <div>
              <h5 class="card-title">{{card.title}}</h5>
              <p class="card-text display-6">{{card.count}}</p>
            </div>
            <a [routerLink]="[card.link]" class="btn btn-primary mt-2">Ir</a>
          </div>
        </div>
      </div>
    </div>
  </div>
  `
})
export class TasksDashboardComponent implements OnInit {
  cards = [
    { title: 'Convocatorias por abrir', count: 0, link: '/admin/tareas/pendientes' },
    { title: 'Sugerencias de lecciones', count: 0, link: '/admin/tareas/pendientes' },
    { title: 'Recursos por aprobar', count: 0, link: '/admin/tareas/pendientes' },
  ];

  constructor(private tasksService: AdminTasksService) {}

  ngOnInit(): void {
    this.tasksService.getSummary().subscribe({
      next: (s: TasksSummary) => {
        this.cards = [
          { title: 'Convocatorias por abrir', count: s.convocatoriasPorAbrir, link: '/admin/tareas/pendientes' },
          { title: 'Sugerencias de lecciones', count: s.sugerenciasPorHacer, link: '/admin/tareas/pendientes' },
          { title: 'Recursos por aprobar', count: s.recursosPorAprobar, link: '/admin/tareas/pendientes' },
        ];
      },
      error: () => {
        // Silenciar errores, mantener 0s
      }
    });
  }
}


