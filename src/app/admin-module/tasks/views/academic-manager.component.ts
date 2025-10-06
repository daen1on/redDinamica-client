import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OnInit } from '@angular/core';
import { AdminTasksService } from '../../services/admin-tasks.service';

@Component({
  selector: 'admin-academic-manager',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="container">
    <h3>RedDinámica Académica</h3>
    <p>Lecciones listas para mover a RedDinámica.</p>
    <div class="table-responsive">
      <table class="table table-striped">
        <thead>
          <tr>
            <th>Título</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let l of lecciones">
            <td>{{l.title}}</td>
            <td>
              <button class="btn btn-sm btn-primary" (click)="mover(l._id)">Mover a RedDinámica</button>
            </td>
          </tr>
          <tr *ngIf="lecciones.length===0">
            <td colspan="2">Sin registros</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  `
})
export class AcademicManagerComponent implements OnInit {
  lecciones: any[] = [];

  constructor(private tasks: AdminTasksService) {}

  ngOnInit(): void {
    this.tasks.listLeccionesAcademicas().subscribe({ next: (res:any) => this.lecciones = res.items || [], error: () => this.lecciones = [] });
  }

  mover(id: string): void {
    if(!confirm('¿Mover esta lección a RedDinámica?')) return;
    this.tasks.moverLeccionAcademica(id).subscribe({ next: () => this.ngOnInit() });
  }
}


