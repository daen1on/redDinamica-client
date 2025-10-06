import { Component, OnInit } from '@angular/core';
import { ADMIN_MENU } from './services/adminMenu';
import { AdminTasksService, TasksSummary } from './services/admin-tasks.service';
import { UserService } from '../services/user.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
    selector: 'admin',
    templateUrl: './admin.component.html',
    styleUrls: ['./admin.component.css'],
    standalone: false
})
export class AdminComponent implements OnInit {
  public title: String = 'Administración';
  public menuOptions;
  public isMenuCollapsed: boolean = true;

  public tasksBadge: number = 0;

  constructor(private _userService: UserService, private _tasks: AdminTasksService, private _router: Router, private _route: ActivatedRoute) {
    this.menuOptions = ADMIN_MENU;
  }

  ngOnInit(): void {
    const identity = this._userService.getIdentity();
    const role = identity?.role;
    if(role === 'lesson_manager'){
      // Filtrar para mostrar solo Lecciones, Repositorio, Académico y Tareas
      this.menuOptions = ADMIN_MENU.filter((opt:any) => ['lessons','resources','academic','tasks'].includes(opt.id));

      // Evitar cargar rutas de nuevos usuarios para lesson_manager
      const currentUrl = this._router.url || '';
      const isAdminRoot = /\/admin\/?$/.test(currentUrl);
      const isNewUsersRoute = currentUrl.includes('/admin/usuarios-nuevos');
      if(isAdminRoot || isNewUsersRoute){
        this._router.navigate(['/admin/lecciones']);
      }
    }

    // Cargar badge de tareas pendientes
    this._tasks.getSummary().subscribe({
      next: (s: TasksSummary) => {
        this.tasksBadge = (s.convocatoriasPorAbrir || 0) + (s.sugerenciasPorHacer || 0) + (s.recursosPorAprobar || 0) + (s.leccionesPorMover || 0);
        // Inyectar badge en la opción del menú
        this.menuOptions = this.menuOptions.map((opt:any) => {
          if(opt.id === 'tasks'){
            return { ...opt, spanContent: `Gestión académica y tareas${this.tasksBadge>0? ' ('+this.tasksBadge+')':''}` };
          }
          return opt;
        });
      }
    });
  }

  toggleMenu(): void {
    this.isMenuCollapsed = !this.isMenuCollapsed;
  }
}
