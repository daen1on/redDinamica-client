import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AcademicLessonService } from '../../services/academic-lesson.service';
import { AcademicLesson, LessonFile, UserRef } from '../../models/academic-lesson.model';
import { LessonConversationsComponent } from './conversations/lesson-conversations.component';
import { LessonFilesComponent } from './files/lesson-files.component';
import { LessonTeamComponent } from './team/lesson-team.component';
import { LessonFeedbackComponent } from './feedback/lesson-feedback.component';
import { LessonRatingComponent } from './rating/lesson-rating.component';

@Component({
  selector: 'app-lesson-detail',
  templateUrl: './lesson-detail.component.html',
  styleUrls: ['./lesson-detail.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LessonConversationsComponent, LessonFilesComponent, LessonTeamComponent, LessonFeedbackComponent, LessonRatingComponent]
})
export class LessonDetailComponent implements OnInit, OnDestroy {
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
  inviteStudentId: string = '';
  inviteMessage: string = 'Te invito a colaborar en esta lección académica. ¡Únete al equipo!';
  groupStudents: Array<{ _id: string, name: string, surname?: string, email?: string }> = [];
  chatMessage: string = '';
  uploading = false;
  selectedFile: File | null = null;
  resourceDescription: string = '';
  resourceCategory: 'document' | 'image' | 'video' | 'audio' | 'link' | 'other' = 'document';
  teacherFeedback: string = '';
  teacherCommentType: 'feedback' | 'suggestion' | 'approval' | 'correction' = 'feedback';
  
  // Conversaciones
  currentConversationId: string = '';
  newConversationTitle: string = '';
  showNewConversationForm: boolean = false;
  // Gestionar enfoque de pestañas tras recargas de datos
  private pendingFocusTab: 'info' | 'chat' | 'files' | 'team' | 'feedback' | null = null;
  // Polling de chat/conversaciones
  private chatPollingHandle: any = null;
  private isUserTyping = false;

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
    this.startChatPolling();
  }

  ngOnDestroy(): void {
    this.stopChatPolling();
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

  // Inicia un polling suave que refresca mensajes/conversaciones sin bloquear la UI
  private startChatPolling(): void {
    this.stopChatPolling();
    const getInterval = () => (this.isUserTyping ? 3000 : 5000);
    const tick = () => {
      try {
        if (!this.lessonId) return;
        this.refreshLessonSilently();
      } catch {}
      // reprogramar dinámicamente según estado de escritura
      this.chatPollingHandle = setTimeout(tick, getInterval());
    };
    // primera programación
    this.chatPollingHandle = setTimeout(tick, getInterval());
  }

  private stopChatPolling(): void {
    if (this.chatPollingHandle) { try { clearTimeout(this.chatPollingHandle); } catch {} }
    this.chatPollingHandle = null;
  }

  // Igual que loadLesson pero sin togglear loading ni otros estados visuales
  private refreshLessonSilently(): void {
    this.academicLessonService.getLessonById(this.lessonId).subscribe({
      next: (response) => {
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

        if (!this.lesson) {
          this.lesson = { ...(response.data as any), chatMessages: mappedChat } as AcademicLesson;
        } else {
          // Actualizar solo colecciones necesarias
          (this.lesson as any).chatMessages = mappedChat;
          Object.assign(this.lesson, response.data as any);
        }

        const backendConversations: any[] = Array.isArray((response.data as any)?.conversations)
          ? ((response.data as any).conversations as any[])
          : [];

        const generalConversation = {
          _id: 'default',
          title: 'Conversación General',
          participants: [],
          messages: (this.lesson as any).chatMessages || [],
          createdAt: (this.lesson as any).createdAt
        } as any;

        this.lesson.conversations = [
          generalConversation,
          ...backendConversations.filter((c: any) => c && c._id !== 'default')
        ];

        // Mantener seleccionada la conversación si existe
        const exists = this.currentConversationId
          ? this.lesson.conversations.some(c => (c as any)._id === this.currentConversationId)
          : false;
        if (!exists && this.lesson.conversations.length > 0) {
          this.currentConversationId = (this.lesson.conversations[0] as any)._id || '';
        }

        setTimeout(() => this.scrollMessagesToBottom(), 0);
      },
      error: () => {}
    });
  }

  // Cambia el ritmo del polling cuando el usuario está escribiendo
  onTypingChange(isTyping: boolean): void {
    this.isUserTyping = isTyping;
    // Reiniciar el temporizador para aplicar el nuevo intervalo inmediatamente
    this.startChatPolling();
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

        // Construir lista de conversaciones asegurando la "Conversación General" siempre presente
        const backendConversations: any[] = Array.isArray((response.data as any)?.conversations)
          ? ((response.data as any).conversations as any[])
          : [];

        const generalConversation = {
          _id: 'default',
          title: 'Conversación General',
          participants: [],
          messages: this.lesson.chatMessages || [],
          createdAt: this.lesson.createdAt
        } as any;

        this.lesson.conversations = [
          generalConversation,
          ...backendConversations.filter((c: any) => c && c._id !== 'default')
        ];

        // Mantener conversación seleccionada si existe; si no, seleccionar la primera
        const exists = this.currentConversationId
          ? this.lesson.conversations.some(c => (c as any)._id === this.currentConversationId)
          : false;
        if (!exists && this.lesson.conversations.length > 0) {
          this.currentConversationId = (this.lesson.conversations[0] as any)._id || '';
        }
        
        // Precargar estudiantes actuales del grupo para selector de invitación
        try {
          const group: any = (this.lesson as any).academicGroup;
          console.log('🔍 [loadLesson] academicGroup completo:', group);
          const students: any[] = Array.isArray(group?.students) ? group.students : [];
          console.log('🔍 [loadLesson] students array crudo:', students);
          this.groupStudents = students.map((s: any) => ({ 
            _id: String(s._id || s), 
            name: s.name || s.fullname || s.username || s.email || 'Estudiante',
            surname: s.surname || s.lastname || '',
            email: s.email || ''
          }));
          console.log('🔍 [loadLesson] groupStudents mapeados:', this.groupStudents);
        } catch (error) {
          console.error('❌ [loadLesson] Error al cargar estudiantes del grupo:', error);
        }
        // Actualizar el rol contextual en base a la lección/grupo
        this.userRole = this.computeContextRole();
        this.loading = false;
        // Autoscroll al final de la lista de mensajes
        setTimeout(() => this.scrollMessagesToBottom(), 0);
        // Reenfocar pestaña si está pendiente (evita que regrese a Información)
        if (this.pendingFocusTab) {
          const tabId = `${this.pendingFocusTab}-tab`;
          setTimeout(() => {
            const el = document.getElementById(tabId) as HTMLButtonElement | null;
            if (el) { try { el.click(); } catch {} }
            this.pendingFocusTab = null;
          }, 0);
        }
      },
      error: (error) => {
        this.errorMessage = 'Error al cargar la lección';
        this.loading = false;
        console.error('Error loading lesson:', error);
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


      this.router.navigate(['/academia/lessons', this.lesson._id, 'edit']);
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

  // Aprobar lección (profesor)
  approveLesson(): void {
    if (!this.lesson || !this.approveData.feedback?.trim()) {
      this.errorMessage = 'Debes proporcionar comentarios de retroalimentación al aprobar';
      return;
    }

    this.loading = true;
    this.academicLessonService.approveLesson(this.lessonId, {
      feedback: this.approveData.feedback,
      grade: this.approveData.grade
    }).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Lección aprobada exitosamente';
        this.closeApproveModal();
        this.loadLesson();
        this.loading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al aprobar la lección';
        this.loading = false;
      }
    });
  }

  // Rechazar lección (profesor)
  rejectLesson(): void {
    if (!this.lesson || !this.rejectReason?.trim()) {
      this.errorMessage = 'Debes proporcionar un motivo para rechazar la lección';
      return;
    }

    this.loading = true;
    this.academicLessonService.rejectLesson(this.lessonId, this.rejectReason).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Lección rechazada';
        this.closeRejectModal();
        this.loadLesson();
        this.loading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al rechazar la lección';
        this.loading = false;
      }
    });
  }

  // Calificar lección (profesor)
  gradeLesson(): void {
    if (!this.lesson) return;

    if (this.gradeData.grade < 0 || this.gradeData.grade > 5) {
      this.errorMessage = 'La calificación debe estar entre 0 y 5';
      return;
    }

    if (!this.gradeData.feedback?.trim()) {
      this.errorMessage = 'Debes proporcionar retroalimentación con la calificación';
      return;
    }

    this.loading = true;
    this.academicLessonService.gradeLesson(this.lessonId, {
      grade: this.gradeData.grade,
      feedback: this.gradeData.feedback
    }).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Lección calificada exitosamente';
        this.closeGradeModal();
        this.loadLesson();
        this.loading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al calificar la lección';
        this.loading = false;
      }
    });
  }

  // Solicitar exportación de lección a RedDinámica principal (profesor)
  exportLesson(): void {
    if (!this.lesson) return;

    if (!confirm('¿Estás seguro de solicitar la exportación de esta lección a RedDinámica principal? Los administradores revisarán y aprobarán la solicitud.')) {
      return;
    }

    this.loading = true;
    this.academicLessonService.requestExport(this.lessonId).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Solicitud de exportación enviada. Los administradores revisarán tu lección.';
        this.loadLesson();
        this.loading = false;
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al solicitar la exportación';
        this.loading = false;
      }
    });
  }

  // Métodos helper para verificar permisos
  canEdit(): boolean {
    if (!this.lesson) return false;
    // Solo el líder puede editar (excepto lecciones completadas o calificadas)
    const leaderId = this.getIdFromRef((this.lesson as any)?.leader);
    const isLeader = leaderId && leaderId === this.currentUserId;
    return isLeader && !(this.lesson.status === 'completed' || this.lesson.status === 'graded');
  }

  canDelete(): boolean {
    if (!this.lesson) return false;
    const isAuthor = this.isCurrentUserAuthor();
    const isStudent = this.isCurrentUserInGroupStudents();
    return isAuthor && isStudent && ['draft', 'proposed'].includes(this.lesson.status || '');
  }

  canApprove(): boolean {
    // Solo el docente del grupo puede aprobar/rechazar si el estado es 'proposed'
    if (!this.lesson) return false;
    const isTeacher = this.getIdFromRef((this.lesson as any)?.academicGroup?.teacher) === this.currentUserId;
    return isTeacher && this.lesson?.status === 'proposed';
  }

  canGrade(): boolean {
    if (!this.lesson) return false;
    const isTeacher = this.getIdFromRef((this.lesson as any)?.academicGroup?.teacher) === this.currentUserId;
    return isTeacher && this.lesson?.status === 'completed';
  }

  canExport(): boolean {
    if (!this.lesson) return false;
    const isTeacher = this.getIdFromRef((this.lesson as any)?.academicGroup?.teacher) === this.currentUserId;
    // Mostrar el botón solo si es teacher, está graded, NO está exportada y NO está en proceso (ready_for_migration)
    return isTeacher && 
           this.lesson?.status === 'graded' && 
           !this.lesson?.isExported && 
           this.lesson?.state !== 'ready_for_migration';
  }

  getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      'draft': 'Borrador',
      'proposed': 'Propuesta',
      'approved': 'Aprobada',
      'rejected': 'Rechazada',
      'in_development': 'En Desarrollo',
      'completed': 'Completada',
      'graded': 'Calificada',
      'ready_for_migration': 'Lista para Migración'
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
      'graded': 'badge-success',
      'ready_for_migration': 'badge-success'
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
    if (!this.lesson || !this.currentUserId) return false;
    const authorId = this.getIdFromRef(this.lesson.author);
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
    const name = author.name || 'Usuario';
    const email = author.email ? ` <${author.email}>` : '';
    return `${name}${email}`;
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

  // Métodos para la barra de progreso
  getProgressPercentage(): number {
    if (!this.lesson) return 0;
    const progressMap: { [key: string]: number } = {
      'draft': 15,
      'proposed': 30,
      'in_development': 50,
      'approved': 65,
      'completed': 85,
      'graded': 100,
      'rejected': 30 // Se mantiene en proposed
    };
    return progressMap[this.lesson.status || 'draft'] || 0;
  }

  getProgressStages(): Array<{ label: string; key: string; completed: boolean; active: boolean }> {
    if (!this.lesson) return [];
    const status = this.lesson.status || 'draft';
    const stages = [
      { label: 'Borrador', key: 'draft' },
      { label: 'Propuesta', key: 'proposed' },
      { label: 'En Desarrollo', key: 'in_development' },
      { label: 'Completada', key: 'completed' },
      { label: 'Calificada', key: 'graded' }
    ];

    const statusOrder = ['draft', 'proposed', 'in_development', 'approved', 'completed', 'graded'];
    const currentIndex = statusOrder.indexOf(status);

    return stages.map((stage, index) => {
      const stageIndex = statusOrder.indexOf(stage.key);
      return {
        ...stage,
        completed: stageIndex < currentIndex,
        active: stageIndex === currentIndex || (status === 'approved' && stage.key === 'in_development')
      };
    });
  }

  // Nueva funcionalidad: Invitaciones a compañeros del mismo grupo
  inviteCollaborator(): void {
    if (!this.lesson) return;
    if (!this.inviteStudentId) {
      this.errorMessage = 'Seleccione un estudiante del grupo.';
      return;
    }
    
    const payload = {
      lessonId: this.lesson._id,
      userId: this.inviteStudentId,
      message: this.inviteMessage
    };
    
    this.loading = true;
    this.academicLessonService.inviteCollaborator(payload).subscribe({
      next: (res) => {
        console.log('✅ [inviteCollaborator] Respuesta exitosa:', res);
        this.successMessage = res.message || 'Invitación enviada';
        this.inviteStudentId = '';
        this.inviteMessage = '';
        this.loadLesson();
        this.loading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        console.error('❌ [inviteCollaborator] Error completo:', err);
        console.error('❌ [inviteCollaborator] Error response:', err.error);
        console.error('❌ [inviteCollaborator] Error status:', err.status);
        this.errorMessage = err.error?.message || err.message || 'Error al invitar colaborador';
        this.loading = false;
      }
    });
  }

  
  sendChatMessage(): void {
    if (!this.lesson || !this.currentConversationId) return;
    const content = (this.chatMessage || '').trim();
    if (!content) return;
    this.loading = true;
    // Mantener la pestaña de conversación activa después de recargar los datos
    this.pendingFocusTab = 'chat';
    // Enviar al chat general o a la conversación seleccionada según corresponda
    const request$ = this.currentConversationId === 'default'
      ? this.academicLessonService.sendChatMessage({ lessonId: this.lesson._id, content, type: 'text' })
      : this.academicLessonService.sendMessageToConversation(this.lesson._id, this.currentConversationId, content);

    request$.subscribe({
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

  // Adaptadores para subcomponentes
  onCreateConversation(title: string): void {
    this.newConversationTitle = title;
    this.createConversation();
  }

  onSendMessage(e: { conversationId: string; content: string }): void {
    this.currentConversationId = e.conversationId;
    this.chatMessage = e.content;
    this.sendChatMessage();
  }

  userPictureUrl = (author: string | UserRef | null | undefined): string => {
    try {
      const a: any = author as any;
      if (a && a.picture) {
        // Usar la URL base del backend
        return `${(window as any)?.API_BASE_URL || 'http://localhost:3800/api/'}get-image-user/${a.picture}`;
      }
      return '';
    } catch { return ''; }
  }

  // Editar mensaje desde subcomponente
  onEditMessage(e: { conversationId: string; messageId: string; content: string }): void {
    if (!this.lesson) return;
    // No soportamos edición en chat general
    if (e.conversationId === 'default') return;
    this.loading = true;
    this.academicLessonService.updateConversationMessage(this.lesson._id, e.conversationId, e.messageId, e.content).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Mensaje actualizado';
        this.loadLesson();
        this.loading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'No se pudo editar el mensaje';
        this.loading = false;
      }
    });
  }

  // Eliminar mensaje desde subcomponente
  onDeleteMessage(e: { conversationId: string; messageId: string }): void {
    if (!this.lesson) return;
    // No soportamos eliminación en chat general
    if (e.conversationId === 'default') return;
    if (!confirm('¿Eliminar este mensaje?')) return;
    this.loading = true;
    this.academicLessonService.deleteConversationMessage(this.lesson._id, e.conversationId, e.messageId).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Mensaje eliminado';
        this.loadLesson();
        this.loading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'No se pudo eliminar el mensaje';
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

  // Solo miembros del equipo de desarrollo, líder, autor o docente pueden ver pestañas privadas
  canSeePrivateTabs(): boolean {
    if (!this.lesson || !this.currentUserId) return false;
    const leaderId = this.getIdFromRef((this.lesson as any)?.leader);
    const isLeader = leaderId && leaderId === this.currentUserId;
    const isAuthor = this.isCurrentUserAuthor();
    const group: any = this.lesson?.academicGroup as any;
    const teacherId = this.getIdFromRef(group?.teacher);
    const isTeacher = teacherId && teacherId === this.currentUserId;
    const members: any[] = Array.isArray((this.lesson as any)?.development_group) ? (this.lesson as any).development_group : [];
    const memberIds = members.map((m: any) => this.getIdFromRef(m?.user)).filter((v: string) => !!v);
    const isDevMember = memberIds.includes(this.currentUserId);
    return isLeader || isAuthor || isTeacher || isDevMember;
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

  // Descargar archivo: abrir en nueva pestaña/ventana usando la URL absoluta si existe,
  // o construyéndola con la base del backend y el path almacenado en el archivo
  onDownloadFile(file: LessonFile): void {
    if (!file) return;
    const base = (window as any)?.API_BASE_URL || 'http://localhost:3800/';
    // Si el backend ya entrega url absoluta en el modelo, usarla
    const absoluteUrl = (file as any).url
      ? String((file as any).url)
      : `${base.replace(/\/$/, '/')}${String(file.path).replace(/^\//, '')}`;
    try { window.open(absoluteUrl, '_blank'); } catch {}
  }

  // Eliminar archivo: quitar del array en memoria y hacer update (PUT)
  onDeleteFile(file: LessonFile): void {
    if (!this.lesson || !file) return;
    if (!confirm('¿Eliminar este archivo de la lección?')) return;
    const currentFiles = Array.isArray(this.lesson.files) ? this.lesson.files : [];
    const filtered = currentFiles.filter(f => (f._id && file._id) ? f._id !== file._id : f.path !== file.path);
    const updatePayload: any = {
      // Mantener campos opcionales inexistentes; solo sobrescribimos files
      files: filtered
    };
    this.loading = true;
    this.academicLessonService.updateLesson(this.lesson._id, updatePayload).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Archivo eliminado';
        this.loadLesson();
        this.loading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'No se pudo eliminar el archivo';
        this.loading = false;
      }
    });
  }

  // Nueva funcionalidad: Comentarios del docente sobre la lección
  addTeacherComment(): void {
    if (!this.lesson) return;
    const rawContent = this.teacherFeedback ?? '';
    if (!rawContent.trim()) return;
    this.loading = true;
    // Mantener la pestaña de feedback activa tras recargar
    this.pendingFocusTab = 'feedback';
    this.academicLessonService.addTeacherComment(this.lesson._id, rawContent, this.teacherCommentType).subscribe({
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

  onEditTeacherComment(e: { commentId: string; content: string }): void {
    if (!this.lesson) return;
    const rawContent = e?.content ?? '';
    if (!rawContent.trim()) return;
    this.loading = true;
    // Mantener la pestaña de feedback activa tras recargar
    this.pendingFocusTab = 'feedback';
    this.academicLessonService.updateTeacherComment(this.lesson._id, e.commentId, rawContent).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Comentario actualizado';
        this.loadLesson();
        this.loading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al actualizar comentario';
        this.loading = false;
      }
    });
  }

  // Eliminar comentario del docente (solo autor del comentario)
  onDeleteTeacherComment(commentId: string): void {
    if (!this.lesson || !commentId) return;
    if (!confirm('¿Eliminar este comentario?')) return;
    this.loading = true;
    // Mantener la pestaña de feedback activa tras recargar
    this.pendingFocusTab = 'feedback';
    this.academicLessonService.deleteTeacherComment(this.lesson._id, commentId).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Comentario eliminado';
        this.loadLesson();
        this.loading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al eliminar comentario';
        this.loading = false;
      }
    });
  }

  // Verificar si puede agregar retroalimentación (docente o líder/creador)
  canAddFeedback(): boolean {
    if (!this.lesson || !this.currentUserId) return false;
    const isTeacher = this.getIdFromRef((this.lesson as any)?.academicGroup?.teacher) === this.currentUserId;
    const isLeader = this.getIdFromRef((this.lesson as any)?.leader) === this.currentUserId;
    const isAuthor = this.isCurrentUserAuthor();
    return isTeacher || isLeader || isAuthor;
  }

  // Método para retirarse de la lección (miembros del equipo de desarrollo)
  leaveLesson(): void {
    if (!this.lesson || !this.currentUserId) return;
    if (!confirm('¿Estás seguro de que deseas retirarte de esta lección?')) return;
    
    this.loading = true;
    // Llamar al backend para retirar al usuario del development_group
    this.academicLessonService.leaveLesson(this.lessonId).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Te has retirado de la lección';
        setTimeout(() => {
          this.router.navigate(['/academia/lessons']);
        }, 2000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al retirarse de la lección';
        this.loading = false;
      }
    });
  }

  // Verificar si puede retirarse (miembros que no son líderes)
  canLeaveLesson(): boolean {
    if (!this.lesson || !this.currentUserId) return false;
    const leaderId = this.getIdFromRef((this.lesson as any)?.leader);
    const isLeader = leaderId && leaderId === this.currentUserId;
    
    // No puede retirarse si es el líder
    if (isLeader) return false;
    
    // Verificar si está en el equipo de desarrollo
    const members: any[] = Array.isArray(this.lesson?.development_group) ? (this.lesson as any).development_group : [];
    const memberIds = members.map((m: any) => this.getIdFromRef(m?.user)).filter((v: string) => !!v);
    return memberIds.includes(this.currentUserId);
  }

  // Obtener conversación actual
  getCurrentConversation(): any {
    if (!this.lesson || !this.lesson.conversations || !this.currentConversationId) return null;
    return this.lesson.conversations.find(c => c._id === this.currentConversationId);
  }

  // Crear nueva conversación (solo líder)
  createConversation(): void {
    if (!this.lesson) return;
    const title = (this.newConversationTitle || '').trim();
    if (!title) return;
    
    this.loading = true;
    this.academicLessonService.createConversation(this.lesson._id, title).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Conversación creada';
        this.newConversationTitle = '';
        this.showNewConversationForm = false;
        // Si el backend devuelve el ID de la conversación creada, seleccionarlo
        const createdId = (res as any)?.data?.conversationId;
        // Queremos volver y mantener la pestaña de chat
        this.pendingFocusTab = 'chat';
        this.loadLesson();
        if (createdId) {
          // Esperar a que la lección recargue y luego seleccionar
          setTimeout(() => { this.currentConversationId = createdId; }, 0);
        }
        this.loading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al crear conversación';
        this.loading = false;
      }
    });
  }
}

