import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormControl, Validators, FormBuilder } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { takeUntil, catchError, tap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MomentModule } from 'ngx-moment';
import { LinkyModule } from 'ngx-linky';

import { UserService } from 'src/app/services/user.service';
import { PublicationService } from 'src/app/services/publication.service';
import { CommentService } from 'src/app/services/comment.service';
import { GLOBAL } from 'src/app/services/global';
import { Comment } from 'src/app/models/comment.model';

@Component({
  selector: 'app-publication-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MomentModule, LinkyModule],
  templateUrl: './publication-card.component.html',
  styleUrls: ['./publication-card.component.css']
})
export class PublicationCardComponent implements OnInit {
  @Input() publication: any;
  @Input() identity: any;
  @Input() showDeleteButton: boolean = true;
  
  @Output() onDelete = new EventEmitter<string>();
  @Output() onDeleteComment = new EventEmitter<string>();
  @Output() onError = new EventEmitter<string>();

  public url: string;
  public commentForm: UntypedFormGroup;
  public focusPublication: string = '';
  private unsubscribe$ = new Subject<void>();

  constructor(
    private _userService: UserService,
    private _publicationService: PublicationService,
    private _commentService: CommentService,
    private _router: Router,
    private fb: FormBuilder
  ) {
    this.url = GLOBAL.url;
    this.createCommentForm();
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  createCommentForm() {
    this.commentForm = this.fb.group({
      text: ['', Validators.required]
    });
  }

  // Sistema de likes para publicaciones
  hasUserLikedPublication(publication: any): boolean {
    return publication.likes && publication.likes.includes(this.identity._id);
  }

  toggleLikePublication(publicationId: string) {
    this._publicationService.toggleLikePublication(this._userService.getToken(), publicationId)
      .pipe(
        takeUntil(this.unsubscribe$),
        catchError(error => {
          console.error('Error toggling publication like:', error);
          this.onError.emit('Error al procesar el me gusta. Inténtalo de nuevo.');
          return of(null);
        })
      ).subscribe({
        next: (response) => {
          if (response && response.success) {
            const isLiked = response.action === 'liked';
            if (isLiked) {
              // Agregar like
              if (!this.publication.likes) this.publication.likes = [];
              if (!this.publication.likes.includes(this.identity._id)) {
                this.publication.likes.push(this.identity._id);
                this.publication.likesCount = (this.publication.likesCount || 0) + 1;
              }
            } else {
              // Quitar like
              if (this.publication.likes) {
                this.publication.likes = this.publication.likes.filter(id => id !== this.identity._id);
                this.publication.likesCount = Math.max(0, (this.publication.likesCount || 0) - 1);
              }
            }
          }
        },
        error: (error) => {
          console.error('Error in subscription:', error);
        }
      });
  }

  // Sistema de likes para comentarios
  hasUserLikedComment(comment: any): boolean {
    return comment.likes && comment.likes.includes(this.identity._id);
  }

  toggleLikeComment(commentId: string) {
    this._commentService.toggleLikeComment(this._userService.getToken(), commentId)
      .pipe(
        takeUntil(this.unsubscribe$),
        catchError(error => {
          console.error('Error toggling comment like:', error);
          this.onError.emit('Error al procesar el me gusta del comentario. Inténtalo de nuevo.');
          return of(null);
        })
      ).subscribe({
        next: (response) => {
          if (response && response.success) {
            this.updateCommentLikeStatus(commentId, response.action === 'liked');
          }
        },
        error: (error) => {
          console.error('Error in subscription:', error);
        }
      });
  }

  private updateCommentLikeStatus(commentId: string, isLiked: boolean) {
    if (this.publication.comments) {
      const comment = this.publication.comments.find(c => c._id === commentId);
      if (comment) {
        this.updateSingleCommentLike(comment, isLiked);
      }
    }
  }

  private updateSingleCommentLike(comment: any, isLiked: boolean) {
    if (isLiked) {
      // Agregar like
      if (!comment.likes) comment.likes = [];
      if (!comment.likes.includes(this.identity._id)) {
        comment.likes.push(this.identity._id);
        comment.likesCount = (comment.likesCount || 0) + 1;
      }
    } else {
      // Quitar like
      if (comment.likes) {
        comment.likes = comment.likes.filter(id => id !== this.identity._id);
        comment.likesCount = Math.max(0, (comment.likesCount || 0) - 1);
      }
    }
  }

  // Comentarios
  setFocusPublication(publicationId: string) {
    this.focusPublication = publicationId;
  }

  onCommentSubmit(publicationId: string) {
    const commentToAdd = new Comment(this.commentForm.value.text, this.identity._id);

    this._commentService.addComment(this._userService.getToken(), commentToAdd).pipe(
      takeUntil(this.unsubscribe$),
      tap(response => {
        if (!response.comment || !response.comment._id) {
          throw new Error('Failed to add the comment');
        }
        // Agregar el comentario directamente a la publicación
        if (!this.publication.comments) {
          this.publication.comments = [];
        }
        this.publication.comments.push(response.comment);
        this.commentForm.reset();
      }),
      catchError(error => {
        console.error(error);
        this.onError.emit('Error al enviar el comentario. Inténtalo de nuevo.');
        return throwError(() => new Error('Failed to submit the comment'));
      })
    ).subscribe({
      next: () => console.log('Comment submitted successfully'),
      error: (error) => console.error('Comment submission failed', error)
    });
  }

  // Método para hacer scroll a comentarios y activar formulario
  scrollToComments(publicationId: string) {
    this.setFocusPublication(publicationId);
    
    setTimeout(() => {
      const commentElement = document.querySelector(`#comments-form-${publicationId}`);
      if (commentElement) {
        commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const textarea = commentElement.querySelector('textarea');
        if (textarea) {
          textarea.focus();
        }
      }
    }, 100);
  }

  // Eliminar publicación
  deletePublication() {
    this.onDelete.emit(this.publication._id);
  }

  // Eliminar comentario
  deleteComment(commentId: string) {
    this.onDeleteComment.emit(commentId);
  }

  // Utilidades
  newLines(text: string) {
    let innerHtml = '';
    if (text) {
      text.split('\n').forEach(paragraph => {
        innerHtml += `<p>${paragraph}</p>`;
      });
    }
    return innerHtml;
  }
}
