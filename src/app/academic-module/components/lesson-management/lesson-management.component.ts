import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AcademicLessonService } from '../../services/academic-lesson.service';
import { AcademicGroupService } from '../../services/academic-group.service';
import { AcademicLesson, UserRef } from '../../models/academic-lesson.model';
import { AcademicGroup } from '../../models/academic-group.model';
import { UserService } from '../../../services/user.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-lesson-management',
  templateUrl: './lesson-management.component.html',
  styleUrls: ['./lesson-management.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class LessonManagementComponent implements OnInit {
  lessons: AcademicLesson[] = [];
  filteredLessons: AcademicLesson[] = [];
  teacherGroups: AcademicGroup[] = [];
  loading = false;
  errorMessage = '';
  userRole = '';
  private currentUserId: string = '';

  private userCache: { [userId: string]: UserRef } = {};
  private requestedUserIds = new Set<string>();

  // Filtros
  searchTerm = '';
  filterStatus = '';
  filterGroup = '';

  constructor(
    private academicLessonService: AcademicLessonService,
    private academicGroupService: AcademicGroupService,
    private router: Router,
    private _userService: UserService
  ) { }

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadData();
  }

  loadUserInfo(): void {
    const raw = localStorage.getItem('user') || localStorage.getItem('identity') || '{}';
    try {
      const user = JSON.parse(raw);
      this.userRole = user.role || '';
      this.currentUserId = user._id || user.id || user.uid || '';
    } catch {
      this.userRole = '';
      this.currentUserId = '';
    }
  }

  loadData(): void {
    this.loading = true;
    
    // Ejecutar en paralelo: grupos del profesor, mis lecciones y lecciones de grupos donde soy profesor
    forkJoin({
      teacherGroups: this.academicGroupService.getTeacherGroups(),
      myLessons: this.academicLessonService.getMyLessons(),
      teacherLessons: this.academicLessonService.getTeacherLessons()
    }).subscribe({
      next: (result) => {
        // Cargar grupos donde el usuario es teacher por pertenencia al grupo (no por rol global)
        if (result.teacherGroups?.status === 'success') {
          this.teacherGroups = result.teacherGroups.data || [];
        } else {
          this.teacherGroups = [];
        }

        // Unir lecciones: propias + como docente del grupo
        const own = (result.myLessons?.status === 'success') ? (result.myLessons.data || []) : [];
        const teaching = (result.teacherLessons?.status === 'success') ? (result.teacherLessons.data || []) : [];
        const mapById: { [id: string]: AcademicLesson } = {};
        for (const l of [...own, ...teaching]) {
          const id = (l as any)?._id || '';
          if (id && !mapById[id]) {
            mapById[id] = l;
          }
        }
        this.lessons = Object.values(mapById);

        this.enrichLessonsAuthors(this.lessons);
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error loading lessons/groups:', error);
        this.errorMessage = 'Error al cargar las lecciones';
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredLessons = this.lessons.filter(lesson => {
      const matchesSearch = !this.searchTerm || 
        lesson.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        lesson.resume.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesStatus = !this.filterStatus || lesson.status === this.filterStatus;
      const lessonGroupId = this.getIdFromRef((lesson as any)?.academicGroup);
      const matchesGroup = !this.filterGroup || lessonGroupId === this.filterGroup;
      
      return matchesSearch && matchesStatus && matchesGroup;
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterStatus = '';
    this.filterGroup = '';
    this.applyFilters();
  }

  getFilteredLessons(): AcademicLesson[] {
    return this.filteredLessons;
  }

  createNewLesson(): void {
    this.router.navigate(['/academia/lessons/create']);
  }

  viewLessonDetails(lessonId: string): void {
    this.router.navigate(['/academia/lessons', lessonId]);
  }

  editLesson(lesson: AcademicLesson): void {
    this.router.navigate(['/academia/lessons', lesson._id, 'edit']);
  }

  deleteLesson(lessonId: string): void {
    if (confirm('¿Estás seguro de que quieres eliminar esta lección?')) {
      this.academicLessonService.deleteLesson(lessonId).subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.loadData(); // Recargar datos
          }
        },
        error: (error) => {
          console.error('Error deleting lesson:', error);
          this.errorMessage = 'Error al eliminar la lección';
        }
      });
    }
  }

  approveLesson(lessonId: string): void {
    this.academicLessonService.approveLesson(lessonId, { feedback: 'Lección aprobada' }).subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.loadData(); // Recargar datos
        }
      },
      error: (error) => {
        console.error('Error approving lesson:', error);
        this.errorMessage = 'Error al aprobar la lección';
      }
    });
  }

  rejectLesson(lessonId: string): void {
    this.academicLessonService.rejectLesson(lessonId, 'Lección rechazada').subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.loadData(); // Recargar datos
        }
      },
      error: (error) => {
        console.error('Error rejecting lesson:', error);
        this.errorMessage = 'Error al rechazar la lección';
      }
    });
  }

  gradeLesson(lessonId: string): void {
    // Implementar lógica de calificación
    console.log('Grading lesson:', lessonId);
  }

  requestExport(lessonId: string): void {
    this.academicLessonService.requestExport(lessonId).subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.loadData();
        }
      },
      error: (error) => {
        console.error('Error requesting export:', error);
        this.errorMessage = 'Error al solicitar la exportación de la lección';
      }
    });
  }

  // Métodos de permisos
  canEdit(lesson: AcademicLesson): boolean {
    const currentUserId = this.getCurrentUserId();
    if (!currentUserId) return false;
    if (!lesson || !lesson.author) return false;
    return typeof lesson.author === 'string'
      ? lesson.author === currentUserId
      : lesson.author._id === currentUserId;
  }

  canDelete(lesson: AcademicLesson): boolean {
    const currentUserId = this.getCurrentUserId();
    if (!currentUserId) return false;
    if (!lesson || !lesson.author) return false;
    return typeof lesson.author === 'string'
      ? lesson.author === currentUserId
      : lesson.author._id === currentUserId;
  }

  canApprove(lesson: AcademicLesson): boolean {
    const teacherId = this.getIdFromRef((lesson as any)?.academicGroup?.teacher);
    return !!teacherId && teacherId === this.currentUserId && lesson.status === 'proposed';
  }

  canGrade(lesson: AcademicLesson): boolean {
    const teacherId = this.getIdFromRef((lesson as any)?.academicGroup?.teacher);
    return !!teacherId && teacherId === this.currentUserId && lesson.status === 'completed';
  }

  canRequestExport(lesson: AcademicLesson): boolean {
    const teacherId = this.getIdFromRef((lesson as any)?.academicGroup?.teacher);
    return !!teacherId && teacherId === this.currentUserId && 
           lesson.status === 'graded' && 
           !(lesson as any)?.isExported && 
           (lesson as any)?.state !== 'ready_for_migration';
  }

  hasTeacherAction(lesson: AcademicLesson): boolean {
    return this.canApprove(lesson) || this.canGrade(lesson) || this.canRequestExport(lesson);
  }

  // Métodos de utilidad
  getCurrentUserId(): string {
    return this.currentUserId || '';
  }

  private getIdFromRef(ref: any): string {
    if (!ref) return '';
    if (typeof ref === 'string') return String(ref);
    if (typeof ref === 'object') {
      if (ref._id || ref.id) return String(ref._id || ref.id);
      if (ref.user && (ref.user._id || ref.user.id)) return String(ref.user._id || ref.user.id);
    }
    return '';
  }

  // Mostrar nombre del usuario a partir de string o UserRef
  displayUserName(author: string | UserRef | null | undefined): string {
    if (!author) return 'Usuario';
    if (typeof author === 'string') {
      const cached = this.userCache[author];
      if (cached) {
        const email = cached.email ? ` <${cached.email}>` : '';
        return `${cached.name || 'Usuario'}${email}`;
      }
      return 'Usuario';
    }
    const name = author.name || 'Usuario';
    const email = author.email ? ` <${author.email}>` : '';
    return `${name}${email}`;
  }

  private enrichLessonsAuthors(lessons: AcademicLesson[]): void {
    if (!Array.isArray(lessons)) return;
    for (const lesson of lessons) {
      const author = lesson?.author as string | UserRef | undefined;
      if (!author) continue;
      if (typeof author === 'string') {
        const userId = author;
        const cached = this.userCache[userId];
        if (cached) {
          lesson.author = cached;
          continue;
        }
        if (this.requestedUserIds.has(userId)) continue;
        this.requestedUserIds.add(userId);
        this._userService.getUser(userId).subscribe({
          next: (response: any) => {
            const user = response?.user;
            if (!user) return;
            const fullName = (user.name && user.surname)
              ? `${user.name} ${user.surname}`
              : (user.name || user.surname || user.nick || 'Usuario');
            const userRef: UserRef = {
              _id: user._id,
              name: fullName,
              email: user.email
            };
            this.userCache[userId] = userRef;
            // actualizar esta lección
            lesson.author = userRef;
          },
          error: () => {
            // silencioso; dejamos 'Usuario' como fallback
          }
        });
      }
    }
  }

  displayGroupName(group: any): string {
    if (!group) return 'Grupo';
    if (typeof group === 'string') return group;
    return group.name || 'Grupo';
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'draft': 'draft',
      'proposed': 'proposed',
      'approved': 'approved',
      'rejected': 'rejected',
      'in_development': 'in_development',
      'completed': 'completed',
      'graded': 'graded'
    };
    return colors[status] || 'draft';
  }

  getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      'draft': 'Borrador',
      'proposed': 'Propuesta',
      'approved': 'Aprobada',
      'in_development': 'En desarrollo',
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

  getLevelLabel(level: string): string {
    const levelLabels: { [key: string]: string } = {
      'Colegio': 'Colegio',
      'Universidad': 'Universidad'
    };
    return levelLabels[level] || level;
  }
}
