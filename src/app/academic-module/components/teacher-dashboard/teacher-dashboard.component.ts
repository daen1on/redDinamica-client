import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AcademicGroupService } from '../../services/academic-group.service';
import { AcademicLessonService } from '../../services/academic-lesson.service';
import { AcademicGroup } from '../../models/academic-group.model';
import { AcademicLesson } from '../../models/academic-lesson.model';

@Component({
  selector: 'app-teacher-dashboard',
  templateUrl: './teacher-dashboard.component.html',
  styleUrls: ['./teacher-dashboard.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class TeacherDashboardComponent implements OnInit {
  groups: AcademicGroup[] = [];
  lessons: AcademicLesson[] = [];
  recentLessons: AcademicLesson[] = [];
  loading = false;
  errorMessage = '';

  // Estadísticas
  totalGroups = 0;
  totalStudents = 0;
  totalLessons = 0;
  lessonsByStatus: { [key: string]: number } = {};
  averageGrade = 0;
  totalGradedLessons = 0;

  constructor(
    private academicGroupService: AcademicGroupService,
    private academicLessonService: AcademicLessonService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Verificar si el usuario puede acceder al panel de docente
    if (!this.canAccessTeacherPanel()) {
      this.router.navigate(['/academia']);
      return;
    }
    this.loadDashboardData();
  }

  canAccessTeacherPanel(): boolean {
    const raw = localStorage.getItem('user') || localStorage.getItem('identity') || '{}';
    const user = JSON.parse(raw);
    const rolesArray: string[] = Array.isArray(user.roles) ? user.roles.map((r: any) => String(r).toLowerCase()) : [];
    let role = (user.role || user.rol || user.userRole || '').toString().toLowerCase();
    const hasAccess = role === 'teacher' || role === 'admin' || role === 'expert' || role === 'lesson_manager' 
      || rolesArray.includes('teacher') || rolesArray.includes('admin') || rolesArray.includes('expert');
    return hasAccess;
  }

  loadDashboardData(): void {
    this.loading = true;
    
    // Cargar grupos del docente
    this.academicGroupService.getTeacherGroups().subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.groups = response.data;
          this.totalGroups = this.groups.length;
          this.totalStudents = this.groups.reduce((sum, group) => sum + group.students.length, 0);
        }
      },
      error: (error) => {
        console.error('Error loading groups:', error);
        this.errorMessage = 'Error al cargar los grupos';
      }
    });

    // Cargar lecciones del docente
    this.academicLessonService.getTeacherLessons().subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.lessons = response.data;
          this.totalLessons = this.lessons.length;
          this.recentLessons = this.lessons.slice(0, 5); // Últimas 5 lecciones
          this.calculateStatistics();
        }
      },
      error: (error) => {
        console.error('Error loading lessons:', error);
        this.errorMessage = 'Error al cargar las lecciones';
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  calculateStatistics(): void {
    // Contar lecciones por estado
    this.lessonsByStatus = {};
    this.lessons.forEach(lesson => {
      const status = lesson.status;
      this.lessonsByStatus[status] = (this.lessonsByStatus[status] || 0) + 1;
    });

    // Calcular promedio de calificaciones
    const gradedLessons = this.lessons.filter(lesson => lesson.grade && lesson.grade > 0);
    this.totalGradedLessons = gradedLessons.length;
    
    if (this.totalGradedLessons > 0) {
      const totalGrade = gradedLessons.reduce((sum, lesson) => sum + (lesson.grade || 0), 0);
      this.averageGrade = Math.round((totalGrade / this.totalGradedLessons) * 100) / 100;
    } else {
      this.averageGrade = 0;
    }
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
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours}h`;
      } else {
        return `${hours}h ${remainingMinutes}min`;
      }
    }
  }

  viewGroup(group: AcademicGroup): void {
    this.router.navigate(['/academia/groups', group._id]);
  }

  viewLesson(lesson: AcademicLesson): void {
    this.router.navigate(['/academia/lessons', lesson._id]);
  }

  createGroup(): void {
    this.router.navigate(['/academia/groups/create']);
  }

  goToGroups(): void {
    this.router.navigate(['/academia/groups']);
  }

  goToLessons(): void {
    this.router.navigate(['/academia/lessons']);
  }

  // Métodos para el template
  getTotalStudents(): number {
    return this.totalStudents;
  }

  getActiveGroups(): number {
    return this.groups.filter(group => group.isActive).length;
  }

  getTotalLessons(): number {
    return this.totalLessons;
  }

  getGroupLessonsCount(group: AcademicGroup): number {
    return group.lessons ? group.lessons.length : 0;
  }

  getGroupActiveLessonsCount(group: AcademicGroup): number {
    // group.lessons es un array de IDs, no de objetos AcademicLesson
    // Por ahora retornamos 0 hasta que implementemos la lógica correcta
    return 0;
  }

  getGroupCompletedLessonsCount(group: AcademicGroup): number {
    // group.lessons es un array de IDs, no de objetos AcademicLesson
    // Por ahora retornamos 0 hasta que implementemos la lógica correcta
    return 0;
  }
}
