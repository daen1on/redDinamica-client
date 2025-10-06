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
        this.groups = response.data || [];
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
    this.router.navigate(['/academia/create-group']);
  }

  viewGroupDetails(groupId: string): void {
    this.router.navigate(['/academia/groups', groupId]);
  }

  editGroup(group: AcademicGroup): void {
    // Redirigir al detalle del grupo; la edición se gestiona desde allí
    this.router.navigate(['/academia/groups', group._id]);
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
}
