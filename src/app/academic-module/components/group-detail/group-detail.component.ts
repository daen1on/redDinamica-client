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
import { ResourceService } from '../../../services/resource.service';
import { GLOBAL } from '../../../services/global';
import { ICON_STYLE } from '../../../services/DATA';

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
  startInEditMode = false;
  editedGroup: any = {};
  validGrades: string[] = [];
  savingGroup = false;

  // Sistema de Foro/Threads
  discussionThreads: any[] = [];
  selectedThread: any = null;
  loadingThreads = false;
  showThreadsList = true;
  
  // Crear nuevo thread
  showNewThreadModal = false;
  newThreadTitle: string = '';
  newThreadDescription: string = '';
  creatingThread = false;
  
  // Mensajes
  newMessageText: string = '';
  addingMessage = false;

  // Recursos del grupo
  groupResources: any[] = [];
  addingResource = false;
  selectedResourceId: string = '';
  resourcesSearchTerm: string = '';
  allVisibleResources: any[] = [];
  // Secuencia de búsqueda para depurar y evitar condiciones de carrera
  searchSeq: number = 0;
  
  // Modal de selección de recursos
  showResourcesModal = false;
  availableResources: any[] = [];
  selectedResourcesToAdd: any[] = [];
  loadingResources = false;
  iconResource = ICON_STYLE;
  token: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private academicGroupService: AcademicGroupService,
    private academicLessonService: AcademicLessonService,
    private userService: UserService,
    private resourceService: ResourceService
  ) { }

  ngOnInit(): void {
    this.groupId = this.route.snapshot.paramMap.get('id') || '';
    this.token = this.userService.getToken() || '';
    this.determineUserRole();
    this.startInEditMode = this.route.snapshot.queryParamMap.get('editMode') === 'true';
    this.loadGroupDetails();
    this.loadGroupLessons();
    // Cargar estudiantes solo para docentes/facilitadores/admin
    if (this.userRole === 'teacher') {
      this.loadGroupStudents();
    }
    this.loadDiscussionThreads();
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
        console.log('[GroupDetail] Grupo cargado:', {
          groupId: this.group._id,
          teacher: this.group.teacher,
          students: this.group.students,
          currentUserId: this.currentUserId,
          currentUserRole: this.currentUserRole
        });
        // Si el usuario actual es el docente del grupo, elevar privilegios
        if (this.group && this.currentUserId && (this.group.teacher?.toString?.() === this.currentUserId)) {
          this.userRole = 'teacher';
          this.loadAllUsers();
          // Al elevar privilegios, cargar lista de estudiantes
          this.loadGroupStudents();
        }
        this.loading = false;
        if (this.startInEditMode && this.canEditGroup()) {
          this.editGroup();
        }
        
        // Log de permisos de foro
        console.log('[GroupDetail] Permisos de foro:', {
          canPost: this.canPostInForum(),
          isTeacher: this.userRole === 'teacher',
          currentUserRole: this.currentUserRole
        });
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

  // ===== Sistema de Foro/Threads =====
  loadDiscussionThreads(): void {
    if (!this.groupId) return;
    this.loadingThreads = true;
    this.academicGroupService.getDiscussionThreads(this.groupId).subscribe({
      next: (res) => {
        this.discussionThreads = res.data || [];
        this.loadingThreads = false;
      },
      error: () => {
        this.loadingThreads = false;
      }
    });
  }

  canPostInForum(): boolean {
    if (!this.group || !this.currentUserId) return false;
    
    // Verificar si es el profesor del grupo
    const groupTeacher: any = this.group.teacher;
    const groupTeacherId = typeof groupTeacher === 'object' && groupTeacher?._id 
      ? groupTeacher._id 
      : groupTeacher;
    const isTeacher = groupTeacherId?.toString() === this.currentUserId;
    
    // Verificar si está en la lista de estudiantes (puede ser array de IDs u objetos poblados)
    const students: any[] = this.group.students || [];
    const isStudentInGroup = students.some((student: any) => {
      if (!student) return false;
      // Si student es un objeto poblado
      if (typeof student === 'object' && student._id) {
        return student._id.toString() === this.currentUserId;
      }
      // Si student es solo un ID
      const studentId = student.toString ? student.toString() : student;
      return studentId === this.currentUserId;
    });
    
    // Verificar si es admin o roles con privilegios especiales
    const hasSpecialPrivileges = ['admin', 'delegated_admin', 'lesson_manager'].includes(this.currentUserRole);
    
    return isTeacher || isStudentInGroup || hasSpecialPrivileges;
  }

  openNewThreadModal(): void {
    this.showNewThreadModal = true;
    this.newThreadTitle = '';
    this.newThreadDescription = '';
    document.body.style.overflow = 'hidden';
  }

  closeNewThreadModal(): void {
    this.showNewThreadModal = false;
    this.newThreadTitle = '';
    this.newThreadDescription = '';
    document.body.style.overflow = 'auto';
  }

  createNewThread(): void {
    const title = (this.newThreadTitle || '').trim();
    const description = (this.newThreadDescription || '').trim();
    if (!title) {
      alert('El título es requerido');
      return;
    }
    this.creatingThread = true;
    this.academicGroupService.createDiscussionThread(this.groupId, title, description).subscribe({
      next: (res) => {
        this.discussionThreads = res.data || [];
        this.closeNewThreadModal();
        this.creatingThread = false;
        // Abrir el thread recién creado
        if (this.discussionThreads.length > 0) {
          const newThread = this.discussionThreads.find(t => t.title === title);
          if (newThread) {
            this.selectThread(newThread);
          }
        }
      },
      error: () => {
        this.creatingThread = false;
        alert('Error al crear el thread');
      }
    });
  }

  selectThread(thread: any): void {
    this.selectedThread = null;
    this.showThreadsList = false;
    // Cargar thread completo con mensajes
    this.academicGroupService.getDiscussionThread(this.groupId, thread._id).subscribe({
      next: (res) => {
        this.selectedThread = res.data;
        this.newMessageText = '';
      },
      error: () => {
        alert('Error al cargar el thread');
        this.showThreadsList = true;
      }
    });
  }

  backToThreadsList(): void {
    this.selectedThread = null;
    this.showThreadsList = true;
    this.newMessageText = '';
    this.loadDiscussionThreads();
  }

  addMessageToSelectedThread(): void {
    if (!this.selectedThread) return;
    const content = (this.newMessageText || '').trim();
    if (!content) return;
    
    // Verificar si el thread está bloqueado
    if (this.selectedThread.isLocked && this.userRole !== 'teacher') {
      alert('Este thread está bloqueado y solo el profesor puede publicar');
      return;
    }
    
    this.addingMessage = true;
    this.academicGroupService.addMessageToThread(this.groupId, this.selectedThread._id, content).subscribe({
      next: (res) => {
        this.selectedThread = res.data;
        this.newMessageText = '';
        this.addingMessage = false;
      },
      error: () => {
        this.addingMessage = false;
        alert('Error al enviar el mensaje');
      }
    });
  }

  deleteMessage(messageId: string): void {
    if (!this.selectedThread) return;
    if (!confirm('¿Eliminar este mensaje?')) return;
    this.academicGroupService.deleteMessageFromThread(this.groupId, this.selectedThread._id, messageId).subscribe({
      next: () => {
        // Recargar thread
        this.selectThread(this.selectedThread);
      },
      error: () => {
        alert('Error al eliminar el mensaje');
      }
    });
  }

  deleteThread(threadId: string): void {
    if (!confirm('¿Eliminar este thread completo? Esta acción no se puede deshacer.')) return;
    this.academicGroupService.deleteDiscussionThread(this.groupId, threadId).subscribe({
      next: () => {
        if (this.selectedThread && this.selectedThread._id === threadId) {
          this.backToThreadsList();
        } else {
          this.loadDiscussionThreads();
        }
      },
      error: (err) => {
        alert(err.error?.message || 'Error al eliminar el thread');
      }
    });
  }

  togglePinThread(thread: any): void {
    this.academicGroupService.togglePinThread(this.groupId, thread._id).subscribe({
      next: (res) => {
        thread.isPinned = res.data.isPinned;
        this.loadDiscussionThreads();
      },
      error: () => {
        alert('Error al fijar/desfijar el thread');
      }
    });
  }

  toggleLockThread(thread: any): void {
    this.academicGroupService.toggleLockThread(this.groupId, thread._id).subscribe({
      next: (res) => {
        thread.isLocked = res.data.isLocked;
        if (this.selectedThread && this.selectedThread._id === thread._id) {
          this.selectedThread.isLocked = res.data.isLocked;
        }
      },
      error: () => {
        alert('Error al bloquear/desbloquear el thread');
      }
    });
  }

  getThreadMessagesCount(thread: any): number {
    return thread.messages ? thread.messages.length : 0;
  }

  getThreadLastUpdate(thread: any): Date {
    return new Date(thread.updatedAt || thread.createdAt);
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

  // ===== Modal de selección de recursos =====
  openResourcesModal(): void {
    this.showResourcesModal = true;
    this.selectedResourcesToAdd = [];
    this.loadAvailableResources();
    // Prevenir scroll del body
    document.body.style.overflow = 'hidden';
  }

  closeResourcesModal(): void {
    this.showResourcesModal = false;
    this.selectedResourcesToAdd = [];
    // Restaurar scroll del body
    document.body.style.overflow = 'auto';
  }

  loadAvailableResources(): void {
    this.loadingResources = true;
    this.resourceService.getAllResources(this.token, '', true).subscribe({
      next: (response) => {
        // Filtrar solo recursos aceptados y visibles
        const allRes = response.resources || [];
        // Excluir los que ya están en el grupo
        const groupIds = new Set(this.groupResources.map(r => r._id));
        this.availableResources = allRes.filter((r: any) => 
          r.accepted && r.visible && !groupIds.has(r._id)
        );
        this.loadingResources = false;
      },
      error: () => {
        this.loadingResources = false;
      }
    });
  }

  toggleResourceSelection(resource: any): void {
    const index = this.selectedResourcesToAdd.findIndex(r => r._id === resource._id);
    if (index >= 0) {
      // Ya está seleccionado, removerlo
      this.selectedResourcesToAdd.splice(index, 1);
    } else {
      // Agregar a selección
      this.selectedResourcesToAdd.push(resource);
    }
  }

  isResourceSelected(resource: any): boolean {
    return this.selectedResourcesToAdd.some(r => r._id === resource._id);
  }

  removeFromSelection(resource: any): void {
    const index = this.selectedResourcesToAdd.findIndex(r => r._id === resource._id);
    if (index >= 0) {
      this.selectedResourcesToAdd.splice(index, 1);
    }
  }

  importSelectedResources(): void {
    if (this.selectedResourcesToAdd.length === 0) {
      alert('Selecciona al menos un recurso para importar');
      return;
    }

    this.addingResource = true;
    let completed = 0;
    const total = this.selectedResourcesToAdd.length;

    this.selectedResourcesToAdd.forEach(resource => {
      this.academicGroupService.addGroupResource(this.groupId, resource._id).subscribe({
        next: () => {
          completed++;
          if (completed === total) {
            this.addingResource = false;
            this.loadGroupResources();
            this.closeResourcesModal();
            alert(`${total} recurso(s) importado(s) exitosamente`);
          }
        },
        error: () => {
          completed++;
          if (completed === total) {
            this.addingResource = false;
            this.loadGroupResources();
            this.closeResourcesModal();
            alert('Algunos recursos no pudieron ser importados');
          }
        }
      });
    });
  }

  goToUrl(url: string): void {
    if (url.includes('http://') || url.includes('https://')) {
      window.open(url, '_blank');
    } else {
      window.open(`http://${url}`, '_blank');
    }
  }

  increaseDownloads(resource: any): void {
    resource.downloads = (resource.downloads || 0) + 1;
    this.resourceService.editResource(this.token, resource).subscribe({
      next: () => this.loadGroupResources(),
      error: (err) => console.error('Error incrementando descargas:', err)
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
    // Log de entrada
    console.log('[GroupDetail] onSearchTermChange input', { raw: this.newStudentEmail });
    this.selectedUser = null;
    const term = (this.newStudentEmail || '').toLowerCase().trim();
    console.log('[GroupDetail] normalized term', { term });
    if (!term) {
      console.log('[GroupDetail] empty term -> clear suggestions');
      this.filteredUsers = [];
      this.showSuggestions = false;
      return;
    }
    // Incrementar secuencia y snapshot del término esperado
    const seq = ++this.searchSeq;
    const expectedTerm = term;
    // Limpiar UI mientras llega la respuesta
    this.filteredUsers = [];
    this.showSuggestions = false;
    console.log('[GroupDetail] search start', { seq, term: expectedTerm });
    // Buscar al servidor (typeahead)
    this.userService.searchUsers(term, 8).subscribe({
      next: (res: any) => {
        const currentTerm = (this.newStudentEmail || '').toLowerCase().trim();
        const stillCurrent = currentTerm === expectedTerm;
        const usersLen = Array.isArray(res?.users) ? res.users.length : 0;
        console.log('[GroupDetail] search response', { seq, expectedTerm, currentTerm, stillCurrent, usersLen, res });
        if (!stillCurrent) {
          console.log('[GroupDetail] stale response ignored', { seq });
          return;
        }
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
        console.log('[GroupDetail] suggestions updated', { seq, count: this.filteredUsers.length });
      },
      error: (err) => {
        const currentTerm = (this.newStudentEmail || '').toLowerCase().trim();
        const stillCurrent = currentTerm === expectedTerm;
        console.error('[GroupDetail] search error', { seq, expectedTerm, currentTerm, stillCurrent, err });
        if (!stillCurrent) return;
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
