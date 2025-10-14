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
import { GroupStudentsComponent } from './students/group-students.component';
import { GroupResourcesComponent } from './resources/group-resources.component';
import { GroupDiscussionComponent } from './discussion/group-discussion.component';

@Component({
  selector: 'app-group-detail',
  templateUrl: './group-detail.component.html',
  styleUrls: ['./group-detail.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, GroupStudentsComponent, GroupResourcesComponent, GroupDiscussionComponent]
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
  url: string = GLOBAL.url;

  // Modo edición
  editMode = false;
  startInEditMode = false;
  editedGroup: any = {};
  validGrades: string[] = [];
  savingGroup = false;

  // Recursos del grupo
  groupResources: any[] = [];
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

  // ===== Recursos del grupo =====
  loadGroupResources(): void {
    if (!this.groupId) return;
    this.academicGroupService.getGroupResources(this.groupId).subscribe({
      next: (res) => this.groupResources = res.data || [],
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

  // Callback para cuando los estudiantes cambian
  onStudentsUpdated(): void {
    this.loadGroupStudents();
  }

  // Callback para cuando los recursos cambian
  onResourcesUpdated(): void {
    this.loadGroupResources();
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

  // Helpers de template
  getAuthorName(lesson: AcademicLesson): string {
    const a: any = (lesson && (lesson as any).author) || null;
    if (!a) return 'Autor';
    return typeof a === 'string' ? a : (a.name || 'Autor');
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
