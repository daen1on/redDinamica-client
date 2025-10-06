import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AcademicLessonService } from '../../services/academic-lesson.service';
import { AcademicLesson, UserRef } from '../../models/academic-lesson.model';

@Component({
  selector: 'app-lesson-detail',
  templateUrl: './lesson-detail.component.html',
  styleUrls: ['./lesson-detail.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class LessonDetailComponent implements OnInit {
  lesson: AcademicLesson | null = null;
  lessonId: string = '';
  // Rol contextual usado en la vista (derivado del grupo o del docente)
  userRole: string = '';
  // Rol proveniente de autenticación (p.ej. 'teacher')
  authUserRole: string = '';
  // Id de usuario autenticado
  currentUserId: string = '';
  loading = false;
  errorMessage = '';
  successMessage = '';

  // Variables para modales
  showApproveModal = false;
  showRejectModal = false;
  showGradeModal = false;
  approveData = { feedback: '', grade: 0 };
  rejectReason = '';
  gradeData = { grade: 0, feedback: '' };

  // Colaboración y conversación
  inviteEmail: string = '';
  inviteRole: 'member' | 'reviewer' | 'contributor' = 'member';
  inviteMessage: string = '';
  chatMessage: string = '';
  uploading = false;
  selectedFile: File | null = null;
  resourceDescription: string = '';
  resourceCategory: 'document' | 'image' | 'video' | 'audio' | 'link' | 'other' = 'document';
  teacherFeedback: string = '';
  teacherCommentType: 'feedback' | 'suggestion' | 'approval' | 'correction' = 'feedback';

  // Referencia al contenedor de mensajes para autoscroll
  @ViewChild('messagesList') messagesList?: ElementRef<HTMLDivElement>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private academicLessonService: AcademicLessonService
  ) { }

  ngOnInit(): void {
    this.lessonId = this.route.snapshot.params['id'];
    this.loadUserInfo();
    this.loadLesson();
  }

  loadUserInfo(): void {
    try {
      const raw = localStorage.getItem('user') || localStorage.getItem('identity') || '{}';
      const user = JSON.parse(raw);
      this.currentUserId = String(user._id || user.id || user.uid || '');
    } catch {
      this.currentUserId = '';
    }
  }

  loadLesson(): void {
    this.loading = true;
    this.academicLessonService.getLessonById(this.lessonId).subscribe({
      next: (response) => {
        // Mapear los mensajes del backend a chatMessages para la vista
        const data: any = response.data || {};
        const backendMessages: any[] = Array.isArray(data.messages) ? data.messages : [];
        const mappedChat = backendMessages.map((m: any) => ({
          _id: String(m._id || ''),
          content: String(m.content || ''),
          author: m.author || '',
          timestamp: m.timestamp || m.created_at || new Date().toISOString(),
          edited: !!m.edited,
          editedAt: m.editedAt,
          type: 'text'
        }));
        this.lesson = { ...(response.data as any), chatMessages: mappedChat } as AcademicLesson;
        // Actualizar el rol contextual en base a la lección/grupo
        this.userRole = this.computeContextRole();
        this.loading = false;
        // Autoscroll al final de la lista de mensajes
        setTimeout(() => this.scrollMessagesToBottom(), 0);
      },
      error: (error) => {
        this.errorMessage = 'Error al cargar la lección';
        this.loading = false;
        console.error('Error loading lesson:', error);
      }
    });
  }

  approveLesson(): void {
    if (!this.approveData.feedback.trim()) {
      this.errorMessage = 'Debe proporcionar retroalimentación';
      return;
    }

    this.loading = true;
    this.academicLessonService.approveLesson(this.lessonId, this.approveData).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.lesson = response.data;
        this.showApproveModal = false;
        this.loading = false;
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Error al aprobar la lección';
        this.loading = false;
      }
    });
  }

  rejectLesson(): void {
    if (!this.rejectReason.trim()) {
      this.errorMessage = 'Debe proporcionar una razón para el rechazo';
      return;
    }

    this.loading = true;
    this.academicLessonService.rejectLesson(this.lessonId, this.rejectReason).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.lesson = response.data;
        this.showRejectModal = false;
        this.loading = false;
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Error al rechazar la lección';
        this.loading = false;
      }
    });
  }

  gradeLesson(): void {
    if (this.gradeData.grade < 0 || this.gradeData.grade > 5) {
      this.errorMessage = 'La calificación debe estar entre 0 y 5';
      return;
    }

    this.loading = true;
    this.academicLessonService.gradeLesson(this.lessonId, this.gradeData).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.lesson = response.data;
        this.showGradeModal = false;
        this.loading = false;
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Error al calificar la lección';
        this.loading = false;
      }
    });
  }

  exportToMain(): void {
    this.loading = true;
    this.academicLessonService.exportToMain(this.lessonId).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.lesson = response.data;
        this.loading = false;
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Error al exportar la lección';
        this.loading = false;
      }
    });
  }

  deleteLesson(): void {
    if (confirm('¿Está seguro de que desea eliminar esta lección?')) {
      this.loading = true;
      this.academicLessonService.deleteLesson(this.lessonId).subscribe({
        next: (response) => {
          this.successMessage = response.message;
          setTimeout(() => {
            this.router.navigate(['/academia/lessons']);
          }, 2000);
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Error al eliminar la lección';
          this.loading = false;
        }
      });
    }
  }

  editLesson(): void {
    this.router.navigate(['/academia/lessons', this.lessonId, 'edit']);
  }

  // Métodos para abrir/cerrar modales
  openApproveModal(): void {
    this.showApproveModal = true;
    this.approveData = { feedback: '', grade: 0 };
  }

  closeApproveModal(): void {
    this.showApproveModal = false;
  }

  openRejectModal(): void {
    this.showRejectModal = true;
    this.rejectReason = '';
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
  }

  openGradeModal(): void {
    this.showGradeModal = true;
    this.gradeData = { grade: 0, feedback: '' };
  }

  closeGradeModal(): void {
    this.showGradeModal = false;
  }

  // Métodos helper para verificar permisos
  canEdit(): boolean {
    if (!this.lesson) return false;
    // Autor puede editar si es estudiante del grupo, líder o docente del grupo y la lección está en borrador
    const isAuthor = this.isCurrentUserAuthor();
    const isMemberOrTeacher = this.isCurrentUserInGroupStudents();
    return isAuthor && isMemberOrTeacher && (this.lesson.status === 'draft');
  }

  canDelete(): boolean {
    if (!this.lesson) return false;
    const isAuthor = this.isCurrentUserAuthor();
    const isStudent = this.isCurrentUserInGroupStudents();
    return isAuthor && isStudent && ['draft', 'proposed'].includes(this.lesson.status || '');
  }

  canApprove(): boolean {
    // Docente del grupo o líder pueden aprobar si el estado es 'proposed'
    if (!this.lesson) return false;
    const isTeacher = this.getIdFromRef((this.lesson as any)?.academicGroup?.teacher) === this.currentUserId;
    const isLeader = this.getIdFromRef((this.lesson as any)?.leader) === this.currentUserId;
    return (isTeacher || isLeader) && this.lesson?.status === 'proposed';
  }

  canGrade(): boolean {
    if (!this.lesson) return false;
    const isTeacher = this.getIdFromRef((this.lesson as any)?.academicGroup?.teacher) === this.currentUserId;
    return isTeacher && this.lesson?.status === 'completed';
  }

  canExport(): boolean {
    if (!this.lesson) return false;
    const isTeacher = this.getIdFromRef((this.lesson as any)?.academicGroup?.teacher) === this.currentUserId;
    return isTeacher && this.lesson?.status === 'graded' && !this.lesson?.isExported;
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
      return `${minutes} minutos`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours} hora${hours > 1 ? 's' : ''}`;
      } else {
        return `${hours} hora${hours > 1 ? 's' : ''} ${remainingMinutes} minutos`;
      }
    }
  }

  // Helpers de identificación y rol contextual
  private getIdFromRef(ref: any): string {
    if (!ref) return '';
    if (typeof ref === 'string') return String(ref);
    if (typeof ref === 'object') {
      if (ref._id || ref.id) return String(ref._id || ref.id);
      // Posibles estructuras anidadas { user: {_id} }
      if (ref.user && (ref.user._id || ref.user.id)) return String(ref.user._id || ref.user.id);
    }
    return '';
  }

  private isCurrentUserAuthor(): boolean {
    console.log('isCurrentUserAuthor', this.lesson, this.currentUserId);
    if (!this.lesson || !this.currentUserId) return false;
    const authorId = this.getIdFromRef(this.lesson.author);
    console.log('authorId', authorId, this.currentUserId);
    return authorId && authorId === this.currentUserId;
  }

  private isCurrentUserInGroupStudents(): boolean {
    if (!this.lesson || !this.currentUserId) return false;
    const group: any = this.lesson.academicGroup as any;
    const students: any[] = Array.isArray(group?.students) ? group.students : [];
    const studentIds = students.map((s: any) => this.getIdFromRef(s)).filter((v: string) => !!v);
    const isStudent = studentIds.includes(this.currentUserId);
    const teacherId = this.getIdFromRef(group?.teacher);
    const isTeacher = teacherId && teacherId === this.currentUserId;
    const leaderId = this.getIdFromRef((this.lesson as any)?.leader);
    const isLeader = leaderId && leaderId === this.currentUserId;
    // Considerar también líder y docente como miembros con permisos en edición/chat
    return isStudent || isTeacher || isLeader;
  }

  private computeContextRole(): string {
    // Docente tiene prioridad por autenticación
    if (this.authUserRole === 'teacher') return 'teacher';
    // Si el usuario pertenece como estudiante al grupo de la lección, es 'student' en este contexto
    if (this.isCurrentUserInGroupStudents()) return 'student';
    return '';
  }

  // Mostrar nombre del usuario a partir de string o UserRef
  displayUserName(author: string | UserRef | null | undefined): string {
    if (!author) return 'Usuario';
    if (typeof author === 'string') return author;
    return author.name || 'Usuario';
  }

  displayGroupName(group: any): string {
    if (!group) return 'N/A';
    if (typeof group === 'string') return group;
    return group.name || 'N/A';
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'draft': 'secondary',
      'proposed': 'warning',
      'approved': 'success',
      'rejected': 'danger',
      'in_development': 'info',
      'completed': 'primary',
      'graded': 'dark'
    };
    return colors[status] || 'secondary';
  }

  getCommentTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'feedback': 'Retroalimentación',
      'suggestion': 'Sugerencia',
      'approval': 'Aprobación',
      'correction': 'Corrección'
    };
    return labels[type] || type;
  }

  getCommentTypeBadge(type: string): string {
    const badges: { [key: string]: string } = {
      'feedback': 'bg-info',
      'suggestion': 'bg-warning',
      'approval': 'bg-success',
      'correction': 'bg-danger'
    };
    return badges[type] || 'bg-secondary';
  }

  // Nueva funcionalidad: Invitaciones a compañeros del mismo grupo
  inviteCollaborator(): void {
    if (!this.lesson) return;
    if (!this.inviteEmail) {
      this.errorMessage = 'Ingrese el correo del compañero a invitar.';
      return;
    }
    this.loading = true;
    this.academicLessonService.inviteCollaborator({
      lessonId: this.lesson._id,
      userEmail: this.inviteEmail,
      role: this.inviteRole,
      message: this.inviteMessage
    }).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Invitación enviada';
        this.inviteEmail = '';
        this.inviteMessage = '';
        this.loadLesson();
        this.loading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al invitar colaborador';
        this.loading = false;
      }
    });
  }

  // Nueva funcionalidad: Enviar mensaje al chat de la lección
  sendChatMessage(): void {
    if (!this.lesson) return;
    const content = (this.chatMessage || '').trim();
    if (!content) return;
    this.loading = true;
    this.academicLessonService.sendChatMessage({
      lessonId: this.lesson._id,
      content,
      type: 'text'
    }).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Mensaje enviado';
        this.chatMessage = '';
        this.loadLesson();
        this.loading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al enviar mensaje';
        this.loading = false;
      }
    });
  }

  // Permisos para chatear: autor, estudiante del grupo, docente del grupo o miembro del equipo de desarrollo
  canChat(): boolean {
    if (!this.lesson || !this.currentUserId) return false;
    const isAuthor = this.isCurrentUserAuthor();
    const isStudent = this.isCurrentUserInGroupStudents();
    const isTeacher = (() => {
      const group: any = this.lesson?.academicGroup as any;
      const teacherId = this.getIdFromRef(group?.teacher);
      return teacherId && teacherId === this.currentUserId;
    })();
    const isDevMember = (() => {
      const members: any[] = Array.isArray(this.lesson?.development_group) ? (this.lesson as any).development_group : [];
      const memberIds = members.map((m: any) => this.getIdFromRef(m?.user)).filter((v: string) => !!v);
      return memberIds.includes(this.currentUserId);
    })();
    return isAuthor || isStudent || isTeacher || isDevMember;
  }

  private scrollMessagesToBottom(): void {
    try {
      const el = this.messagesList?.nativeElement;
      if (el) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
    } catch {}
  }

  onFileSelected(event: any): void {
    const file = event?.target?.files?.[0];
    this.selectedFile = file || null;
  }

  // Nueva funcionalidad: Subir archivo/recurso asociado a la lección
  uploadResource(): void {
    if (!this.lesson || !this.selectedFile) return;
    this.uploading = true;
    this.academicLessonService.uploadResource({
      lessonId: this.lesson._id,
      file: this.selectedFile as any,
      description: this.resourceDescription,
      category: this.resourceCategory
    }).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Archivo subido';
        this.selectedFile = null;
        this.resourceDescription = '';
        this.loadLesson();
        this.uploading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al subir archivo';
        this.uploading = false;
      }
    });
  }

  // Nueva funcionalidad: Comentarios del docente sobre la lección
  addTeacherComment(): void {
    if (!this.lesson) return;
    const content = (this.teacherFeedback || '').trim();
    if (!content) return;
    this.loading = true;
    this.academicLessonService.addTeacherComment(this.lesson._id, content, this.teacherCommentType).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Comentario agregado';
        this.teacherFeedback = '';
        this.loadLesson();
        this.loading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al agregar comentario';
        this.loading = false;
      }
    });
  }
}

