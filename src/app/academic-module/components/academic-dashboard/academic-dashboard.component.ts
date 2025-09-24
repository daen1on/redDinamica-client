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

  loadUserInfo(): void {
    // Obtener información del usuario desde localStorage o servicio de autenticación
    const storedUserRaw = localStorage.getItem('user') || localStorage.getItem('identity') || '{}';
    const user = JSON.parse(storedUserRaw);
    
    const rawRole = (user.role || user.rol || user.userRole || '').toString().toLowerCase();
    // Normalizar posibles variantes de rol
    let normalizedRole = rawRole;
    if (normalizedRole === 'facilitador' || normalizedRole === 'facilitator') normalizedRole = 'expert';
    if (normalizedRole === 'docente') normalizedRole = 'teacher';

    this.userRole = normalizedRole || '';
    this.isStudent = !!(user.isStudent || normalizedRole === 'student');
    this.isTeacher = normalizedRole === 'teacher' || normalizedRole === 'admin' || normalizedRole === 'expert' || (user.teachingGroups?.length > 0);

    // Redirigir automáticamente solo para estudiantes e invitados
    // Los docentes, facilitadores y admins pueden ser también estudiantes, 
    // por lo que necesitan ver el dashboard de selección de roles
    if (this.userRole === 'student' || this.userRole === 'invitado') {
      this.router.navigate(['/academia/student']);
    } else {
      // Mostrar el dashboard con opciones de selección de rol
    }
  }

  // Método para verificar si el usuario puede acceder al panel de docente
  canAccessTeacherPanel(): boolean {
    // Verificar usando el estado actual y un fallback directo a localStorage por si aún no se inicializó
    const hasTeacherRole = this.userRole === 'teacher' || this.userRole === 'admin' || this.userRole === 'expert';
    if (hasTeacherRole) return true;
    const fallbackRaw = localStorage.getItem('user') || localStorage.getItem('identity') || '{}';
    const fallbackUser = JSON.parse(fallbackRaw);
    const fallbackRoleRaw = (fallbackUser.role || fallbackUser.rol || fallbackUser.userRole || '').toString().toLowerCase();
    let fallbackRole = fallbackRoleRaw;
    if (fallbackRole === 'facilitador' || fallbackRole === 'facilitator') fallbackRole = 'expert';
    if (fallbackRole === 'docente') fallbackRole = 'teacher';
    const fallbackHasAccess = fallbackRole === 'teacher' || fallbackRole === 'admin' || fallbackRole === 'expert';
    return fallbackHasAccess;
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
