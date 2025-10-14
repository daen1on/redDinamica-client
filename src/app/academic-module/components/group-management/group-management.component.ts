import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AcademicGroupService } from '../../services/academic-group.service';
import { AcademicGroup } from '../../models/academic-group.model';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-group-management',
  templateUrl: './group-management.component.html',
  styleUrls: ['./group-management.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class GroupManagementComponent implements OnInit {
  groups: AcademicGroup[] = [];
  loading = false;
  error = '';
  searchTerm = '';
  filterLevel = '';
  filterGrade = '';
  // Cache local de nombres de docentes por ID para evitar múltiples peticiones
  private teacherNameMap: { [userId: string]: string } = {};

  constructor(
    private academicGroupService: AcademicGroupService,
    private router: Router,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.loadGroups();
  }

  loadGroups(): void {
    this.loading = true;
    const role = (this.userService.getIdentity()?.role || '').toString().toLowerCase();
    const isAdmin = role === 'admin' || role === 'delegated_admin';
    const isLessonManager = role === 'lesson_manager';

    const source$ = (isAdmin || isLessonManager)
      ? this.academicGroupService.getAllGroups(true)
      : this.academicGroupService.getTeacherGroups();

    source$.subscribe({
      next: (response) => {
        // Normalizar y enriquecer los grupos
        const rawGroups: any[] = response?.data || [];
        this.groups = rawGroups.map((g: any) => {
          // Normalizar teacher: puede venir como string (ObjectId) o como objeto
          const teacherObj = g?.teacher;
          const teacherId = teacherObj && typeof teacherObj === 'object' ? (teacherObj._id || '') : (teacherObj || '');
          const teacherName = teacherObj && typeof teacherObj === 'object'
            ? [teacherObj.name, teacherObj.surname].filter(Boolean).join(' ').trim()
            : undefined;

          // Calcular lessonsCount si no viene
          const lessonsCount = typeof g?.lessonsCount === 'number'
            ? g.lessonsCount
            : (Array.isArray(g?.lessons) ? g.lessons.length : 0);

          const normalized = {
            ...g,
            teacher: teacherId,
            lessonsCount,
            teacherName
          } as AcademicGroup & { teacherName?: string };

          // Sembrar cache si ya tenemos el nombre
          if (teacherId && teacherName && !this.teacherNameMap[teacherId]) {
            this.teacherNameMap[teacherId] = teacherName;
          }

          return normalized;
        });

        // Prefetch de nombres de docentes faltantes
        this.prefetchTeacherNames();

        this.loading = false;
      },
      error: (error) => {
        this.error = 'Error al cargar los grupos';
        this.loading = false;
        console.error('Error loading groups:', error);
      }
    });
  }

  createNewGroup(): void {
    this.router.navigate(['/academia/groups/create']);
  }

  viewGroupDetails(groupId: string): void {
    this.router.navigate(['/academia/groups', groupId]);
  }

  editGroup(group: AcademicGroup): void {
    // Redirigir al detalle del grupo; la edición se gestiona desde allí
    this.router.navigate(['/academia/groups', group._id], { queryParams: { editMode: 'true' } });
  }

  deleteGroup(groupId: string): void {
    if (confirm('¿Estás seguro de que quieres eliminar este grupo? Esta acción no se puede deshacer.')) {
      this.academicGroupService.deleteGroup(groupId).subscribe({
        next: () => {
          this.loadGroups();
        },
        error: (error) => {
          this.error = 'Error al eliminar el grupo';
          console.error('Error deleting group:', error);
        }
      });
    }
  }

  getFilteredGroups(): AcademicGroup[] {
    return this.groups.filter(group => {
      const matchesSearch = !this.searchTerm || 
        group.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        group.description.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesLevel = !this.filterLevel || group.academicLevel === this.filterLevel;
      const matchesGrade = !this.filterGrade || group.grade === this.filterGrade;
      
      return matchesSearch && matchesLevel && matchesGrade;
    });
  }

  getStudentCount(group: AcademicGroup): number {
    return group.students ? group.students.length : 0;
  }

  getAcademicLevelLabel(level: string): string {
    return level === 'Colegio' ? 'Colegio' : 'Universidad';
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterLevel = '';
    this.filterGrade = '';
  }

  // Devuelve el nombre del docente para mostrar en la vista
  getTeacherDisplayName(teacher: any): string {
    if (!teacher) { return '—'; }
    const teacherId = typeof teacher === 'object' ? (teacher._id || '') : teacher;
    if (teacherId && this.teacherNameMap[teacherId]) {
      return this.teacherNameMap[teacherId];
    }
    // Si vino como objeto y tiene nombre, usarlo mientras carga desde API
    if (typeof teacher === 'object') {
      const fallback = [teacher.name, teacher.surname].filter(Boolean).join(' ').trim();
      return fallback || '—';
    }
    return '—';
  }

  // Prefetch de nombres de docentes ausentes en cache
  private prefetchTeacherNames(): void {
    const missingIds = Array.from(new Set(
      (this.groups || [])
        .map((g: any) => (g?.teacher && typeof g.teacher !== 'object' ? g.teacher : (g?.teacher?._id || '')))
        .filter((id: string) => !!id && !this.teacherNameMap[id])
    ));

    missingIds.forEach((id: string) => {
      this.userService.getUser(id).subscribe({
        next: (res: any) => {
          const name = res?.user ? [res.user.name, res.user.surname].filter(Boolean).join(' ').trim() : '';
          this.teacherNameMap[id] = name || 'Usuario';
        },
        error: () => {
          this.teacherNameMap[id] = 'Usuario';
        }
      });
    });
  }
}
