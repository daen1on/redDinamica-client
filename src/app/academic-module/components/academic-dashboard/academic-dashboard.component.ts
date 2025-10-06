import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-academic-dashboard',
  templateUrl: './academic-dashboard.component.html',
  styleUrls: ['./academic-dashboard.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class AcademicDashboardComponent implements OnInit {
  userRole: string = '';
  isStudent: boolean = false;
  isTeacher: boolean = false;

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.loadUserInfo();
  }

  private getStoredRole(): string {
    const fallbackRaw = localStorage.getItem('user') || localStorage.getItem('identity') || '{}';
    const fallbackUser = JSON.parse(fallbackRaw);
    return (fallbackUser.role || fallbackUser.rol || fallbackUser.userRole || '').toString();
  }

  loadUserInfo(): void {
    // Obtener información del usuario desde localStorage o servicio de autenticación
    const storedUserRaw = localStorage.getItem('user') || localStorage.getItem('identity') || '{}';
    const user = JSON.parse(storedUserRaw);

    const role = (user.role || user.rol || user.userRole || '').toString();
    const roleLc = role.toLowerCase();

    this.userRole = role;
    this.isStudent = !!(user.isStudent || roleLc === 'student');
    this.isTeacher = ['teacher', 'admin', 'expert', 'lesson_manager', 'delegated_admin'].includes(roleLc) || (user.teachingGroups?.length > 0);

    // Redirigir automáticamente solo para estudiantes
    if (roleLc === 'student') {
      this.router.navigate(['/academia/student']);
    } else {
      // Mostrar el dashboard con opciones de selección de rol
    }
  }

  // Método para verificar si el usuario puede acceder al panel de docente
  canAccessTeacherPanel(): boolean {
    const effectiveRoleRaw = this.userRole || this.getStoredRole();
    const roleLc = (effectiveRoleRaw || '').toString().toLowerCase();
    if (!roleLc) return false;
    return ['teacher', 'admin', 'expert', 'lesson_manager', 'delegated_admin'].includes(roleLc);
  }

  // Método para manejar el acceso al panel de docente
  handleTeacherPanelAccess(): void {
    if (this.canAccessTeacherPanel()) {
      this.router.navigate(['/academia/teacher']);
    } else {
      // Solo redirigir a estudiantes o invitados al panel de estudiante
      this.router.navigate(['/academia/student']);
    }
  }

  switchToMainRedDinamica(): void {
    this.router.navigate(['/inicio']);
  }

  switchToAcademicMode(): void {
    this.router.navigate(['/academia']);
  }
}
