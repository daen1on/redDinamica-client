import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GLOBAL } from '../../../../services/GLOBAL';
import { AcademicGroupService } from '../../../services/academic-group.service';

@Component({
  selector: 'app-group-discussion',
  templateUrl: './group-discussion.component.html',
  styleUrls: ['./group-discussion.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class GroupDiscussionComponent implements OnInit {
  @Input() groupId: string = '';
  @Input() userRole: string = 'student';
  @Input() currentUserId: string = '';
  @Input() canPostInForum: boolean = false;
  @Input() teacherId: any = '';

  url: string = GLOBAL.url;
  
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
  deletingMessageId: string | null = null;

  constructor(
    private academicGroupService: AcademicGroupService
  ) { }

  ngOnInit(): void {
    this.loadDiscussionThreads();
  }

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
    const message = (this.selectedThread.messages || []).find((m: any) => String(m._id) === String(messageId));
    if (!message) return;
    if (!this.isOwnMessage(message)) {
      alert('Solo puedes eliminar tus propios mensajes');
      return;
    }
    if (!confirm('¿Eliminar este mensaje?')) return;
    this.deletingMessageId = messageId;
    this.academicGroupService.deleteMessageFromThread(this.groupId, this.selectedThread._id, messageId).subscribe({
      next: () => {
        this.deletingMessageId = null;
        this.selectThread(this.selectedThread);
      },
      error: () => {
        this.deletingMessageId = null;
        alert('Error al eliminar el mensaje');
      }
    });
  }

  isOwnMessage(message: any): boolean {
    const authorId = typeof message?.author === 'object' ? message.author?._id : message?.author;
    return String(authorId || '') === String(this.currentUserId || '');
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

  private getGroupTeacherId(): string {
    const t: any = this.teacherId;
    if (!t) return '';
    if (typeof t === 'object' && t._id) return String(t._id);
    return String(t);
  }

  isGroupTeacher(): boolean {
    return this.getGroupTeacherId() === String(this.currentUserId || '');
  }
}

