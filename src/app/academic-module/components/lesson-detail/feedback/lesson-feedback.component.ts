import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicLesson } from '../../../models/academic-lesson.model';

@Component({
  selector: 'app-lesson-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lesson-feedback.component.html'
})
export class LessonFeedbackComponent {
  @Input() lesson: AcademicLesson | null = null;
  @Input() loading = false;
  @Input() canAddFeedback = false;
  @Input() teacherFeedback = '';
  @Input() teacherCommentType: 'feedback' | 'suggestion' | 'approval' | 'correction' = 'feedback';
  @Input() currentUserId: string = '';
  @Output() teacherFeedbackChange = new EventEmitter<string>();
  @Output() teacherCommentTypeChange = new EventEmitter<'feedback' | 'suggestion' | 'approval' | 'correction'>();
  @Output() addComment = new EventEmitter<void>();
  @Output() deleteComment = new EventEmitter<string>();

  getCommentTypeBadge(type: string): string {
    const badges: { [key: string]: string } = {
      'feedback': 'bg-info',
      'suggestion': 'bg-warning',
      'approval': 'bg-success',
      'correction': 'bg-danger'
    };
    return badges[type] || 'bg-secondary';
  }
  getAuthorName(author: any): string {
    // Verificamos si el autor es un string
    if (typeof author === 'string') {
      return author;
    }
    // Si es un objeto, devolvemos su propiedad name
    if (author && author.name) {
      return author.name;
    }
    // Como último recurso, si es algo inesperado
    return 'Autor desconocido';
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
  canDelete(comment: any): boolean {
    try {
      const authorId = typeof comment?.author === 'string' ? String(comment.author) : String(comment?.author?._id || comment?.author?.id || '');
      return !!authorId && !!this.currentUserId && authorId === this.currentUserId;
    } catch { return false; }
  }
}


