import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { UntypedFormGroup, UntypedFormControl, Validators, FormBuilder } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { takeUntil, catchError, tap, switchMap } from 'rxjs/operators';
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
export class PublicationCardComponent implements OnInit, OnDestroy, OnChanges {
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['publication'] && changes['publication'].currentValue) {
      this.enrichPublicationUserData();
    }
  }

  ngOnInit(): void {
    // Verificar y enriquecer datos del usuario si es necesario
    this.enrichPublicationUserData();
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  private enrichPublicationUserData() {
    // Inicializar likesCount si no existe
    if (!this.publication.likesCount) {
      this.publication.likesCount = this.publication.likes ? this.publication.likes.length : 0;
    }
    
    // Inicializar likesCount para comentarios
    if (this.publication.comments && Array.isArray(this.publication.comments)) {
      this.publication.comments.forEach(comment => {
        if (!comment.likesCount) {
          comment.likesCount = comment.likes ? comment.likes.length : 0;
        }
      });
    }
    
    // Si publication.user es solo un string (ID), necesitamos obtener los datos completos
    if (this.publication && typeof this.publication.user === 'string') {
      this._userService.getUser(this.publication.user).pipe(
        takeUntil(this.unsubscribe$)
      ).subscribe({
        next: (response) => {
          if (response && response.user) {
            this.publication.user = response.user;
          } else {
            console.error(' Failed to get user data');
          }
        },
        error: (error) => {
          console.error(' Error fetching user data:', error);
        }
      });
    }
  }

  createCommentForm() {
    this.commentForm = this.fb.group({
      text: ['', Validators.required]
    });
  }

  // Sistema de likes para publicaciones
  hasUserLikedPublication(publication: any): boolean {
    if (!publication || !this.identity || !this.identity._id) {
      return false;
    }
    
    // Verificar si existe el array de likes
    if (!publication.likes || !Array.isArray(publication.likes)) {
      return false;
    }
    
    // Convertir ambos a string para comparar (por si hay diferencia de tipos)
    const userId = String(this.identity._id);
    
    const hasLiked = publication.likes.some(likeId => {
      // Manejar tanto objetos (con _id) como strings
      let likeIdString;
      if (typeof likeId === 'object' && likeId._id) {
        likeIdString = String(likeId._id);
      } else {
        likeIdString = String(likeId);
      }
      
      return likeIdString === userId;
    });
    
    return hasLiked;
  }

  toggleLikePublication(publicationId: string) {
    const token = this._userService.getToken();
    if (!token) {
      this.onError.emit('Debes iniciar sesión para dar me gusta.');
      return;
    }

    this._publicationService.toggleLikePublication(token, publicationId)
      .pipe(
        takeUntil(this.unsubscribe$),
        catchError(error => {
          console.error('Error toggling publication like:', error);
          this.onError.emit('Error al procesar el me gusta. Inténtalo de nuevo.');
          return of(null);
        })
      ).subscribe({
        next: (response) => {
          if (response && response.action) {
            const isLiked = response.action === 'liked';
            const userId = String(this.identity._id);
            
            // Inicializar arrays si no existen
            if (!this.publication.likes) {
              this.publication.likes = [];
            }
            
            // Lógica mejorada: manejar objetos y strings
            if (isLiked) {
              // El backend dice que se agregó like
              // Verificar si ya existe usando la función que maneja objetos
              if (!this.hasUserLikedPublication(this.publication)) {
                this.publication.likes.push(this.identity._id);
              }
            } else {
              // El backend dice que se quitó like
              // Filtrar tanto objetos como strings
              this.publication.likes = this.publication.likes.filter(likeId => {
                let likeIdString;
                if (typeof likeId === 'object' && likeId._id) {
                  likeIdString = String(likeId._id);
                } else {
                  likeIdString = String(likeId);
                }
                return likeIdString !== userId;
              });
            }
            
            // Actualizar contador
            this.publication.likesCount = this.publication.likes.length;
          } else {
            console.error('Invalid response:', response);
          }
        },
        error: (error) => {
          console.error('Error in like subscription:', error);
        }
      });
  }

  // Sistema de likes para comentarios
  hasUserLikedComment(comment: any): boolean {
    if (!comment || !this.identity || !this.identity._id) {
      return false;
    }
    
    // Verificar si existe el array de likes
    if (!comment.likes || !Array.isArray(comment.likes)) {
      return false;
    }
    
    // Convertir ambos a string para comparar (manejar objetos y strings)
    const userId = String(this.identity._id);
    return comment.likes.some(likeId => {
      if (typeof likeId === 'object' && likeId._id) {
        return String(likeId._id) === userId;
      } else {
        return String(likeId) === userId;
      }
    });
  }

  toggleLikeComment(commentId: string) {
    const token = this._userService.getToken();
    if (!token) {
      this.onError.emit('Debes iniciar sesión para dar me gusta.');
      return;
    }

    this._commentService.toggleLikeComment(token, commentId)
      .pipe(
        takeUntil(this.unsubscribe$),
        catchError(error => {
          console.error('Error toggling comment like:', error);
          this.onError.emit('Error al procesar el me gusta del comentario. Inténtalo de nuevo.');
          return of(null);
        })
      ).subscribe({
        next: (response) => {
          if (response && response.action) {
            this.updateCommentLikeStatus(commentId, response.action === 'liked');
          } else {
            console.error('Invalid comment like response:', response);
          }
        },
        error: (error) => {
          console.error('Error in comment like subscription:', error);
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
    // Inicializar arrays si no existen
    if (!comment.likes) {
      comment.likes = [];
    }
    
    const userId = String(this.identity._id);
    
    if (isLiked) {
      // Agregar like solo si no existe (verificar objetos y strings)
      const alreadyLiked = comment.likes.some(likeId => {
        if (typeof likeId === 'object' && likeId._id) {
          return String(likeId._id) === userId;
        } else {
          return String(likeId) === userId;
        }
      });
      
      if (!alreadyLiked) {
        comment.likes.push(this.identity._id);
      }
    } else {
      // Quitar like (filtrar objetos y strings)
      comment.likes = comment.likes.filter(likeId => {
        let likeIdString;
        if (typeof likeId === 'object' && likeId._id) {
          likeIdString = String(likeId._id);
        } else {
          likeIdString = String(likeId);
        }
        return likeIdString !== userId;
      });
    }
    
    // Actualizar contador
    comment.likesCount = comment.likes.length;
  }

  // Comentarios
  setFocusPublication(publicationId: string) {
    this.focusPublication = publicationId;
  }

  onCommentSubmit(publicationId: string) {
    const commentToAdd = new Comment(this.commentForm.value.text, this.identity._id);

    this._commentService.addComment(this._userService.getToken(), commentToAdd).pipe(
      takeUntil(this.unsubscribe$),
      switchMap(response => {
        if (!response.comment || !response.comment._id) {
          throw new Error('Failed to add the comment');
        }
        
        // Vincular el comentario a la publicación en el backend
        return this._publicationService.updatePublicationComments(
          this._userService.getToken(), 
          publicationId, 
          response.comment
        ).pipe(
          tap(updateResponse => {
            if (updateResponse && updateResponse.publication) {
              // Agregar la información completa del usuario al comentario
              const enrichedComment = {
                ...response.comment,
                user: {
                  _id: this.identity._id,
                  name: this.identity.name,
                  surname: this.identity.surname,
                  picture: this.identity.picture
                }
              };
              
              // Agregar el comentario enriquecido a la publicación
              if (!this.publication.comments) {
                this.publication.comments = [];
              }
              this.publication.comments.push(enrichedComment);
              this.commentForm.reset();
              this.focusPublication = '';
              
              console.log('Comment successfully linked to publication');
            } else {
              throw new Error('Failed to link comment to publication');
            }
          })
        );
      }),
      catchError(error => {
        console.error(error);
        this.onError.emit('Error al enviar el comentario. Inténtalo de nuevo.');
        return throwError(() => new Error('Failed to submit the comment'));
      })
    ).subscribe({
      next: () => console.log('Comment submitted and linked successfully'),
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
