import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicLesson, UserRef } from '../../../models/academic-lesson.model';

@Component({
  selector: 'app-lesson-conversations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lesson-conversations.component.html',
  styleUrls: ['./lesson-conversations.component.css']
})
export class LessonConversationsComponent {
  @Input() lesson: AcademicLesson | null = null;
  @Input() loading = false;
  @Input() canEdit = false;
  @Input() canChat = false;
  @Input() currentConversationId: string = '';
  @Output() currentConversationIdChange = new EventEmitter<string>();
  @Output() createConversation = new EventEmitter<string>();
  @Output() sendMessage = new EventEmitter<{ conversationId: string; content: string }>();
  @Output() editMessage = new EventEmitter<{ conversationId: string; messageId: string; content: string }>();
  @Output() deleteMessage = new EventEmitter<{ conversationId: string; messageId: string }>();
  // Notificar al padre si el usuario está escribiendo, para ajustar el polling
  @Output() typingChange = new EventEmitter<boolean>();

  // Opcionalmente recibimos un resolvedor de nombres desde el padre
  @Input() displayUserName: (author: string | UserRef | null | undefined) => string = () => 'Usuario';
  @Input() userPictureUrl: (author: string | UserRef | null | undefined) => string = () => '';

  showNewConversationForm = false;
  newConversationTitle = '';
  chatMessage = '';
  editingMessageId: string = '';
  editingContent: string = '';

  onCreateConversation(): void {
    const title = (this.newConversationTitle || '').trim();
    if (!title) return;
    this.createConversation.emit(title);
    this.newConversationTitle = '';
    this.showNewConversationForm = false;
  }

  onSendMessage(): void {
    const content = (this.chatMessage || '').trim();
    if (!content || !this.currentConversationId) return;
    this.sendMessage.emit({ conversationId: this.currentConversationId, content });
    this.chatMessage = '';
    this.typingChange.emit(false);
  }

  // Capturar actividad de escritura en el textarea
  onTyping(value: string): void {
    this.chatMessage = value;
    this.typingChange.emit(!!value && value.trim().length > 0);
  }

  isEditable(msg: any): boolean {
    if (!msg) return false;
    const createdAt = new Date(msg.timestamp || msg.createdAt || new Date());
    return Date.now() - createdAt.getTime() <= 30 * 60 * 1000; // 30 minutos
  }

  startEdit(msg: any): void {
    if (!this.isEditable(msg)) return;
    this.editingMessageId = msg._id;
    this.editingContent = msg.content;
  }

  cancelEdit(): void {
    this.editingMessageId = '';
    this.editingContent = '';
  }

  confirmEdit(): void {
    const content = (this.editingContent || '').trim();
    if (!content || !this.currentConversationId || !this.editingMessageId) return;
    this.editMessage.emit({ conversationId: this.currentConversationId, messageId: this.editingMessageId, content });
    this.cancelEdit();
  }

  confirmDelete(msg: any): void {
    if (!this.isEditable(msg)) return;
    if (!this.currentConversationId) return;
    this.deleteMessage.emit({ conversationId: this.currentConversationId, messageId: msg._id });
  }

  getCurrentConversation(): any {
    if (!this.lesson || !this.lesson.conversations || !this.currentConversationId) return null;
    return this.lesson.conversations.find(c => c._id === this.currentConversationId);
  }
}


