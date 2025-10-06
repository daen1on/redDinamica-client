import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AcademicGroupService } from '../../services/academic-group.service';
import { AcademicLessonService } from '../../services/academic-lesson.service';
import { AcademicGroup } from '../../models/academic-group.model';
import { AcademicLesson } from '../../models/academic-lesson.model';
import { UserService } from '../../../services/user.service';
import { GLOBAL } from '../../../services/global';

@Component({
  selector: 'app-group-detail',
  templateUrl: './group-detail.component.html',
  styleUrls: ['./group-detail.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class GroupDetailComponent implements OnInit {
  group: AcademicGroup | null = null;
  lessons: AcademicLesson[] = [];
  students: any[] = [];
  loading = false;
  error = '';
  groupId = '';
  userRole = 'student'; // 'student' | 'teacher'
  currentUserId: string = '';
  currentUserRole: string = '';
  newStudentEmail: string = '';
  allUsers: any[] = [];
  filteredUsers: any[] = [];
  searchTerm: string = '';
  showSuggestions = false;
  selectedUser: any | null = null;
  url: string = GLOBAL.url;

  // Modo edición
  editMode = false;
  editedGroup: any = {};
  validGrades: string[] = [];
  savingGroup = false;

  // Discusión
  discussion: any[] = [];
  newDiscussionText: string = '';
  loadingDiscussion = false;
  addingMessage = false;

  // Recursos del grupo
  groupResources: any[] = [];
  addingResource = false;
  selectedResourceId: string = '';
  resourcesSearchTerm: string = '';
  allVisibleResources: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private academicGroupService: AcademicGroupService,
    private academicLessonService: AcademicLessonService,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.groupId = this.route.snapshot.paramMap.get('id') || '';
    this.determineUserRole();
    this.loadGroupDetails();
    this.loadGroupLessons();
    // Cargar estudiantes solo para docentes/facilitadores/admin
    if (this.userRole === 'teacher') {
      this.loadGroupStudents();
    }
    this.loadDiscussion();
    this.loadGroupResources();
  }

  determineUserRole(): void {
    try {
      const raw = localStorage.getItem('identity') || localStorage.getItem('user') || '{}';
      const identity = JSON.parse(raw);
      this.currentUserId = identity?._id || '';
      const rawRole: string = (identity?.role || '').toString().toLowerCase();
      // Normalizar
      this.currentUserRole = rawRole === 'facilitator' ? 'expert' : rawRole;
      // Roles con privilegios de docente
      if (['teacher', 'admin', 'delegated_admin', 'lesson_manager', 'expert'].includes(this.currentUserRole)) {
        this.userRole = 'teacher';
      } else {
        this.userRole = 'student';
      }
    } catch {
      this.userRole = 'student';
    }
  }

  loadGroupDetails(): void {
    if (!this.groupId) {
      this.error = 'ID de grupo no válido';
      return;
    }

    this.loading = true;
    this.academicGroupService.getGroupById(this.groupId).subscribe({
      next: (response) => {
        this.group = response.data;
        // Si el usuario actual es el docente del grupo, elevar privilegios
        if (this.group && this.currentUserId && (this.group.teacher?.toString?.() === this.currentUserId)) {
          this.userRole = 'teacher';
          this.loadAllUsers();
          // Al elevar privilegios, cargar lista de estudiantes
          this.loadGroupStudents();
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Error al cargar los detalles del grupo';
        this.loading = false;
        console.error('Error loading group details:', error);
      }
    });
  }

  loadGroupLessons(): void {
    if (!this.groupId) return;

    this.academicLessonService.getGroupLessons(this.groupId).subscribe({
      next: (response) => {
        this.lessons = response.data || [];
      },
      error: (error) => {
        console.error('Error loading group lessons:', error);
      }
    });
  }

  // ===== Discusión =====
  loadDiscussion(): void {
    if (!this.groupId) return;
    this.loadingDiscussion = true;
    this.academicGroupService.getDiscussion(this.groupId).subscribe({
      next: (res) => {
        this.discussion = res.data || [];
        this.loadingDiscussion = false;
      },
      error: () => {
        this.loadingDiscussion = false;
      }
    });
  }

  canPostDiscussion(): boolean {
    if (!this.group) return false;
    const isTeacher = this.userRole === 'teacher';
    const isStudentInGroup = (this.group.students || []).some((id: any) => (id?.toString?.() || id) === this.currentUserId);
    return isTeacher || isStudentInGroup;
  }

  addDiscussion(): void {
    const content = (this.newDiscussionText || '').trim();
    if (!content) return;
    if (!this.canPostDiscussion()) return;
    this.addingMessage = true;
    this.academicGroupService.addDiscussionMessage(this.groupId, content).subscribe({
      next: (res) => {
        this.discussion = res.data || [];
        this.newDiscussionText = '';
        this.addingMessage = false;
      },
      error: () => {
        this.addingMessage = false;
      }
    });
  }

  deleteDiscussionMessage(messageId: string): void {
    if (!confirm('¿Eliminar este mensaje?')) return;
    this.academicGroupService.deleteDiscussionMessage(this.groupId, messageId).subscribe({
      next: () => this.loadDiscussion(),
      error: () => {}
    });
  }

  // ===== Recursos del grupo =====
  loadGroupResources(): void {
    if (!this.groupId) return;
    this.academicGroupService.getGroupResources(this.groupId).subscribe({
      next: (res) => this.groupResources = res.data || [],
      error: () => {}
    });
  }

  addResourceToGroup(): void {
    const id = (this.selectedResourceId || '').trim();
    if (!id) return;
    this.addingResource = true;
    this.academicGroupService.addGroupResource(this.groupId, id).subscribe({
      next: (res) => {
        this.groupResources = res.data || [];
        this.selectedResourceId = '';
        this.addingResource = false;
      },
      error: () => { this.addingResource = false; }
    });
  }

  removeResourceFromGroup(resourceId: string): void {
    if (!confirm('¿Remover este recurso del grupo?')) return;
    this.academicGroupService.removeGroupResource(this.groupId, resourceId).subscribe({
      next: () => this.loadGroupResources(),
      error: () => {}
    });
  }

  loadGroupStudents(): void {
    if (!this.groupId) return;

    this.academicGroupService.getGroupStudents(this.groupId).subscribe({
      next: (response) => {
        this.students = response.data || [];
      },
      error: (error) => {
        console.error('Error loading group students:', error);
      }
    });
  }

  editGroup(): void {
    // Activar modo edición inline
    this.editMode = true;
    this.editedGroup = { ...this.group };
    if (this.editedGroup.academicLevel) {
      this.loadValidGrades(this.editedGroup.academicLevel);
    }
  }

  loadValidGrades(academicLevel: string): void {
    this.academicGroupService.getValidGrades(academicLevel).subscribe({
      next: (response) => {
        this.validGrades = response.data;
      },
      error: (error) => {
        console.error('Error al cargar grados válidos:', error);
      }
    });
  }

  saveGroup(): void {
    if (!this.editedGroup.name || !this.editedGroup.description || !this.editedGroup.academicLevel || !this.editedGroup.grade) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }
    this.savingGroup = true;
    this.academicGroupService.updateGroup(this.groupId, this.editedGroup).subscribe({
      next: () => {
        this.loadGroupDetails();
        this.editMode = false;
        this.savingGroup = false;
        alert('Grupo actualizado exitosamente');
      },
      error: (error) => {
        console.error('Error al actualizar grupo:', error);
        alert(error.error?.message || 'Error al actualizar el grupo');
        this.savingGroup = false;
      }
    });
  }

  cancelEdit(): void {
    this.editMode = false;
    this.editedGroup = {};
  }

  deleteGroup(): void {
    if (confirm('¿Estás seguro de que quieres eliminar este grupo? Esta acción no se puede deshacer.')) {
      this.academicGroupService.deleteGroup(this.groupId).subscribe({
        next: () => {
          this.router.navigate(['/academia/groups']);
        },
        error: (error) => {
          this.error = 'Error al eliminar el grupo';
          console.error('Error deleting group:', error);
        }
      });
    }
  }

  inviteStudentByEmail(): void {
    const email = (this.newStudentEmail || '').trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      alert('Ingresa un correo válido');
      return;
    }
    this.academicGroupService.inviteStudentByEmail(this.groupId, email).subscribe({
      next: () => {
        this.loadGroupStudents();
        this.newStudentEmail = '';
        this.selectedUser = null;
        this.filteredUsers = [];
        this.showSuggestions = false;
        alert('Estudiante agregado/invitado');
      },
      error: (error) => {
        console.error('Error invitando/agregando estudiante:', error);
        alert(error.error?.message || 'No se pudo agregar/invitar al estudiante');
      }
    });
  }

  // Helpers de template
  getAuthorName(lesson: AcademicLesson): string {
    const a: any = (lesson && (lesson as any).author) || null;
    if (!a) return 'Autor';
    return typeof a === 'string' ? a : (a.name || 'Autor');
  }

  // --- Typeahead helpers ---
  loadAllUsers(): void {
    // Cargar una primera página mínima (opcional). Se usará búsqueda incremental.
    this.allUsers = [];
  }

  onSearchTermChange(): void {
    this.selectedUser = null;
    const term = (this.newStudentEmail || '').toLowerCase().trim();
    if (!term) {
      this.filteredUsers = [];
      this.showSuggestions = false;
      return;
    }
    // Buscar al servidor (typeahead)
    this.userService.searchUsers(term, 8).subscribe({
      next: (res: any) => {
        const list = (res?.users || []).map((u: any) => ({
          _id: u._id,
          name: `${u.name || ''} ${u.surname || ''}`.trim(),
          email: u.email,
          role: u.role,
          picture: u.picture
        }));
        const alreadyIds = new Set((this.students || []).map((s: any) => s._id || s.id));
        this.filteredUsers = list.filter(u => !alreadyIds.has(u._id));
        this.showSuggestions = this.filteredUsers.length > 0;
      },
      error: () => {
        this.filteredUsers = [];
        this.showSuggestions = false;
      }
    });
  }

  selectUserToAdd(user: any): void {
    this.selectedUser = user;
    this.newStudentEmail = `${user.name} <${user.email}>`;
    this.filteredUsers = [];
    this.showSuggestions = false;
  }

  addOrInvite(): void {
    // Si hay usuario seleccionado, agregarlo
    if (this.selectedUser?._id) {
      this.academicGroupService.addStudentToGroup(this.groupId, this.selectedUser._id).subscribe({
        next: () => {
          this.loadGroupStudents();
          this.newStudentEmail = '';
          this.selectedUser = null;
          this.filteredUsers = [];
          this.showSuggestions = false;
          alert('Estudiante agregado exitosamente');
        },
        error: (error) => {
          console.error('Error agregando estudiante:', error);
          alert(error.error?.message || 'No se pudo agregar al estudiante');
        }
      });
      return;
    }
    // Si no hay seleccionado, intentar invitar por correo
    this.inviteStudentByEmail();
  }

  removeStudent(studentId: string): void {
    if (confirm('¿Estás seguro de que quieres remover a este estudiante del grupo?')) {
      this.academicGroupService.removeStudentFromGroup(this.groupId, studentId).subscribe({
        next: () => {
          this.loadGroupStudents();
        },
        error: (error) => {
          this.error = 'Error al remover el estudiante';
          console.error('Error removing student:', error);
        }
      });
    }
  }

  viewLesson(lessonId: string): void {
    this.router.navigate(['/academia/lessons', lessonId]);
  }

  createLesson(): void {
    // Navegar al componente de crear lección con el ID del grupo como parámetro de consulta
    this.router.navigate(['/academia/lessons/create'], {
      queryParams: { groupId: this.groupId }
    });
  }

  getAcademicLevelLabel(level: string): string {
    return level === 'Colegio' ? 'Colegio' : 'Universidad';
  }

  getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      'draft': 'Borrador',
      'proposed': 'Propuesta',
      'approved': 'Aprobada',
      'rejected': 'Rechazada',
      'in_development': 'En Desarrollo',
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
      'in_development': 'badge-info',
      'completed': 'badge-primary',
      'graded': 'badge-success'
    };
    return statusClasses[status] || 'badge-secondary';
  }

  canEditGroup(): boolean {
    return this.userRole === 'teacher' || ['admin', 'delegated_admin', 'lesson_manager'].includes(this.currentUserRole);
  }

  canDeleteGroup(): boolean {
    return this.userRole === 'teacher' || ['admin', 'delegated_admin', 'lesson_manager'].includes(this.currentUserRole);
  }

  canAddStudents(): boolean {
    return this.userRole === 'teacher' || ['admin', 'delegated_admin', 'lesson_manager'].includes(this.currentUserRole);
  }

  canRemoveStudents(): boolean {
    return this.userRole === 'teacher' || ['admin', 'delegated_admin', 'lesson_manager'].includes(this.currentUserRole);
  }

  canCreateLesson(): boolean {
    // Tanto estudiantes como docentes pueden crear lecciones
    // Los estudiantes necesitan permisos del grupo, los docentes siempre pueden
    if (this.userRole === 'teacher' || ['admin', 'delegated_admin', 'lesson_manager'].includes(this.currentUserRole)) {
      return true;
    }
    console.log(this.group?.permissions?.studentsCanCreateLessons);
    // Para estudiantes, verificar permisos del grupo
    return this.group?.permissions?.studentsCanCreateLessons === true;
  }
}
