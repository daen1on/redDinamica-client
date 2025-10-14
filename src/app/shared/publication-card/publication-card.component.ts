import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, AfterViewInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormControl, Validators, FormBuilder } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, of, throwError, interval, timer } from 'rxjs';
import { takeUntil, catchError, tap, switchMap, startWith, filter, debounceTime } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MomentModule } from 'ngx-moment';
import { LinkyModule } from 'ngx-linky';

import { UserService } from 'src/app/services/user.service';
import { PublicationService } from 'src/app/services/publication.service';
import { CommentService } from 'src/app/services/comment.service';
import { ViewportDetectionService } from 'src/app/services/viewport-detection.service';
import { GdprRestrictionsService } from 'src/app/services/gdpr-restrictions.service';
import { GLOBAL } from 'src/app/services/GLOBAL';
import { Comment } from 'src/app/models/comment.model';

@Component({
  selector: 'app-publication-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MomentModule, LinkyModule],
  templateUrl: './publication-card.component.html',
  styleUrls: ['./publication-card.component.css']
})
export class PublicationCardComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  @Input() publication: any;
  @Input() identity: any;
  @Input() showDeleteButton: boolean = true;
  @Input() enableRealTimeUpdates: boolean = true;
  
  @Output() onDelete = new EventEmitter<string>();
  @Output() onDeleteComment = new EventEmitter<string>();
  @Output() onError = new EventEmitter<string>();
  @Output() onNewComment = new EventEmitter<any>();

  public url: string;
  public commentForm: UntypedFormGroup;
  public replyForm: UntypedFormGroup;
  public focusPublication: string = '';
  public showReplyForm: { [key: string]: boolean } = {};
  public loadingReplies: { [key: string]: boolean } = {};
  public replyingTo: { [key: string]: any } = {}; // Usuario al que se está respondiendo
  public hasNewComments: boolean = false;
  public lastCommentCount: number = 0;
  private unsubscribe$ = new Subject<void>();
  private pollTimer$ = new Subject<void>();
  private isPollingActive: boolean = false;
  private pollingSubscription: any = null;
  private isInViewport: boolean = false;
  private viewportObserverActive: boolean = false;

  // Paginación de comentarios
  public commentsPagination = {
    currentPage: 1,
    hasMore: false,
    loading: false,
    totalComments: 0
  };

  // Paginación de respuestas por comentario
  public repliesPagination: { [commentId: string]: { currentPage: number, hasMore: boolean, loading: boolean, totalReplies: number } } = {};

  // Control de contenido expandido para publicaciones largas
  public isContentExpanded: boolean = false;
  public readonly MAX_CONTENT_LENGTH: number = 300; // Caracteres máximos antes de mostrar "Ver más"

  // Control de truncado/expansión para comentarios y respuestas
  public expandedComments: { [commentId: string]: boolean } = {};
  public expandedReplies: { [replyId: string]: boolean } = {};
  public readonly MAX_COMMENT_DISPLAY_LENGTH: number = 150; // Límite visual para mostrar botón
  public readonly MAX_INPUT_LENGTH: number = 2000; // Límite de caracteres para inputs

  constructor(
    private _userService: UserService,
    private _publicationService: PublicationService,
    private _commentService: CommentService,
    private _router: Router,
    private fb: FormBuilder,
    private elementRef: ElementRef,
    private viewportService: ViewportDetectionService,
    public gdprRestrictions: GdprRestrictionsService
  ) {
    this.url = GLOBAL.url;
    this.createForms();
  }
  
  // Método para verificar si el usuario puede comentar (GDPR)
  canUserComment(): boolean {
    return this.gdprRestrictions.canComment();
  }

  ngOnInit(): void {
    this.enrichPublicationUserData();
    this.initializeLastCommentCount();
    this.startRealTimePolling();
  }

  ngOnDestroy(): void {
    this.isPollingActive = false;
    
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
    
    this.pollTimer$.next();
    this.pollTimer$.complete();
    
    // Limpiar viewport observation
    if (this.viewportObserverActive && this.publication && this.publication._id) {
      const element = this.elementRef.nativeElement;
      if (element) {
        this.viewportService.unobserveElement(element, this.publication._id);
      }
    }
    
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['publication']) {
      this.enrichPublicationUserData();
      this.initializeLastCommentCount();
      this.checkAndInitializePagination();
    }
  }

  private checkAndInitializePagination(): void {
    // Si la publicación viene con información de paginación del backend
    if (this.publication && this.publication.pagination) {
      this.initializeCommentsPagination(
        this.publication.pagination.totalComments,
        this.publication.pagination.loadedComments
      );
    } else if (this.publication && this.publication.comments) {
      // Fallback: Si hay exactamente 10 comentarios, asumir que hay más
      const commentsLength = this.publication.comments.length;
      const hasMore = commentsLength === 10;
      const totalEstimated = hasMore ? commentsLength + 10 : commentsLength;
      
      this.commentsPagination = {
        currentPage: 1,
        hasMore: hasMore,
        loading: false,
        totalComments: totalEstimated
      };
      
    } else {
      // Publicación sin comentarios
      this.commentsPagination = {
        currentPage: 1,
        hasMore: false,
        loading: false,
        totalComments: 0
      };
    }
  }

  ngAfterViewInit(): void {
    // Inicializar detección de viewport solo si está habilitado el tiempo real
    if (this.enableRealTimeUpdates && this.publication && this.publication._id) {
      this.initializeViewportDetection();
    }
  }

  private initializeLastCommentCount() {
    this.lastCommentCount = this.getTotalCommentsCount();
  }

  private initializeViewportDetection(): void {
    if (!this.publication || !this.publication._id) {
      return;
    }

    const publicationId = this.publication._id;
    
    // Observar el elemento de la publicación
    setTimeout(() => {
      const element = this.elementRef.nativeElement;
      if (element) {
        this.viewportService.observeElement(element, publicationId);
        this.viewportObserverActive = true;

        // Suscribirse a cambios de visibilidad con debounce para evitar múltiples triggers
        this.viewportService.visibilityChanges$
          .pipe(
            takeUntil(this.unsubscribe$),
            debounceTime(300), // Esperar 300ms antes de procesar cambios
            filter(visibilityMap => visibilityMap.has(publicationId))
          )
          .subscribe(visibilityMap => {
            const item = visibilityMap.get(publicationId);
            if (item) {
              const wasInViewport = this.isInViewport;
              this.isInViewport = item.isVisible;

              // Solo actuar si hay cambio de estado
              if (wasInViewport !== this.isInViewport) {
                if (this.isInViewport) {
                  console.log(`Publication ${publicationId} entered viewport - starting polling`);
                  this.startRealTimePolling();
                } else {
                  console.log(`Publication ${publicationId} left viewport - pausing polling`);
                  this.pauseRealTimeUpdates();
                }
              }
            }
          });
      }
    }, 100); // Pequeño delay para asegurar que el DOM esté listo
  }

  private startRealTimePolling() {
    if (!this.enableRealTimeUpdates || this.isPollingActive) {
      return;
    }

    // Si tenemos viewport detection activo, solo hacer polling si está visible
    if (this.viewportObserverActive && !this.isInViewport) {
      console.log('Skipping polling - publication not in viewport');
      return;
    }

    this.isPollingActive = true;
    
    // Polling cada 30 segundos
    this.pollingSubscription = timer(30000, 30000)
      .pipe(
        takeUntil(this.pollTimer$),
        takeUntil(this.unsubscribe$),
        switchMap(() => {
          // Verificar si el componente aún está activo
          if (!this.isPollingActive) {
            return of(null);
          }
          return this.fetchUpdatedComments();
        }),
        catchError(error => {
          console.error('Error in real-time polling:', error);
          // No detener el polling por un error único
          return of(null);
        })
      )
      .subscribe({
        next: (response) => {
          if (response && this.isPollingActive) {
            this.processUpdatedComments(response);
          }
        },
        error: (error) => {
          console.error('Polling subscription error:', error);
          this.isPollingActive = false;
        },
        complete: () => {
          this.isPollingActive = false;
        }
      });
  }

  private fetchUpdatedComments() {
    const token = this._userService.getToken();
    if (!token || !this.publication._id || !this.isPollingActive) {
      return of(null);
    }

    // Si tenemos viewport detection activo, verificar visibilidad antes de hacer request
    if (this.viewportObserverActive && !this.isInViewport) {
      console.log('Skipping fetch - publication not visible');
      return of(null);
    }

    return this._publicationService.getPublication(token, this.publication._id).pipe(
      catchError(error => {
        console.error('Error fetching updated comments:', error);
        return of(null);
      })
    );
  }

  private processUpdatedComments(publicationData: any) {
    if (!publicationData || !publicationData.publication) {
      return;
    }

    const updatedPublication = publicationData.publication;
    const currentCommentCount = this.getTotalCommentsCount();
    const newCommentCount = this.getTotalCommentsCountFromData(updatedPublication);

    if (newCommentCount > currentCommentCount) {
      // Hay nuevos comentarios
      this.hasNewComments = true;
      this.lastCommentCount = newCommentCount;
      
      // Emitir evento para notificar componente padre
      this.onNewComment.emit({
        publicationId: this.publication._id,
        newCommentsCount: newCommentCount - currentCommentCount
      });

      // Actualizar comentarios gradualmente para evitar saltos bruscos
      this.updateCommentsGradually(updatedPublication.comments);
    } else if (newCommentCount < currentCommentCount) {
      // Se eliminaron comentarios
      this.publication.comments = updatedPublication.comments;
      this.lastCommentCount = newCommentCount;
    }

    // Actualizar likes y otros datos
    this.updateLikesAndCounts(updatedPublication);
  }

  private updateCommentsGradually(newComments: any[]) {
    if (!newComments || newComments.length === 0) {
      return;
    }

    // Solo actualizar si no hay formularios de respuesta activos
    const hasActiveReplyForms = Object.values(this.showReplyForm).some(active => active);
    if (hasActiveReplyForms) {
      console.log('Skipping comment update - reply forms are active');
      return;
    }

    // Actualizar comentarios manteniendo las respuestas locales recientes
    this.publication.comments = [...newComments];
    
    // Mostrar animación sutil para comentarios nuevos
    setTimeout(() => {
      this.hasNewComments = false;
    }, 3000);
  }

  private updateLikesAndCounts(updatedPublication: any) {
    if (updatedPublication.likes) {
      this.publication.likes = updatedPublication.likes;
    }
    if (updatedPublication.likesCount !== undefined) {
      this.publication.likesCount = updatedPublication.likesCount;
    }
  }

  private getTotalCommentsCount(): number {
    if (!this.publication.comments) {
      return 0;
    }
    
    let count = this.publication.comments.length;
    
    for (const comment of this.publication.comments) {
      count += this.getTotalRepliesCount(comment);
    }
    
    return count;
  }

  private getTotalCommentsCountFromData(publication: any): number {
    if (!publication.comments) {
      return 0;
    }
    
    let count = publication.comments.length;
    
    for (const comment of publication.comments) {
      count += this.getTotalRepliesCount(comment);
    }
    
    return count;
  }

  // Método para pausar/reanudar polling
  pauseRealTimeUpdates() {
    this.isPollingActive = false;
    this.pollTimer$.next();
    
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  resumeRealTimeUpdates() {
    if (this.isPollingActive) {
      return; // Ya está activo
    }
    
    this.pollTimer$ = new Subject<void>();
    this.startRealTimePolling();
  }

  // Método para forzar actualización manual
  forceUpdateComments() {
    console.log('Force update requested. Polling active:', this.isPollingActive);
    
    // Para actualizaciones manuales, permitir incluso si polling no está activo
    // pero verificar que tenemos datos válidos
    if (!this.publication || !this.publication._id) {
      console.log('No publication ID available for force update');
      return;
    }

    const token = this._userService.getToken();
    if (!token) {
      console.log('No token available for force update');
      return;
    }

    // Obtener datos actualizados directamente
    this._publicationService.getPublication(token, this.publication._id)
      .pipe(
        takeUntil(this.unsubscribe$),
        catchError(error => {
          console.error('Error forcing comment update:', error);
          this.onError.emit('Error al actualizar comentarios');
          return of(null);
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Force update response:', response);
          // Solo procesar si la respuesta es válida
          if (response && response.publication && response.publication.comments) {
            this.processUpdatedComments(response);
            console.log('Comments updated successfully');
          } else {
            console.log('Invalid response, preserving current comments');
            if (!response) {
              this.onError.emit('No se pudo obtener la información actualizada');
            }
          }
        },
        error: (error) => {
          console.error('Force update failed:', error);
          this.onError.emit('Error al actualizar comentarios');
        }
      });
  }

  private enrichPublicationUserData() {
    // Inicializar likesCount si no existe
    if (!this.publication.likesCount) {
      this.publication.likesCount = this.publication.likes ? this.publication.likes.length : 0;
    }
    
    // Inicializar likesCount para comentarios y verificar datos de usuario
    if (this.publication.comments && Array.isArray(this.publication.comments)) {
      this.publication.comments.forEach(comment => {
        if (comment) {
          // Inicializar likes si no existen
          if (!comment.likesCount) {
            comment.likesCount = comment.likes ? comment.likes.length : 0;
          }
          
          // Verificar que el comentario tenga datos de usuario
          if (!comment.user || typeof comment.user === 'string') {
            // Si user es un string (ID) o no existe, obtener datos completos
            if (typeof comment.user === 'string') {
              this.loadUserDataForComment(comment, comment.user);
            } else {
              // Asignar usuario por defecto si no hay datos
              comment.user = {
                _id: null,
                name: 'Usuario',
                surname: 'no disponible',
                picture: null
              };
            }
          }
          
          // Procesar respuestas anidadas
          if (comment.replies && Array.isArray(comment.replies)) {
            comment.replies.forEach(reply => {
              if (reply) {
                if (!reply.likesCount) {
                  reply.likesCount = reply.likes ? reply.likes.length : 0;
                }
                
                // Verificar datos de usuario en respuestas
                if (!reply.user || typeof reply.user === 'string') {
                  if (typeof reply.user === 'string') {
                    this.loadUserDataForComment(reply, reply.user);
                  } else {
                    reply.user = {
                      _id: null,
                      name: 'Usuario',
                      surname: 'no disponible',
                      picture: null
                    };
                  }
                }
              }
            });
          }
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
            console.error('Failed to get user data for publication');
            // Asignar usuario por defecto
            this.publication.user = {
              _id: this.publication.user,
              name: 'Usuario',
              surname: 'no disponible',
              picture: null
            };
          }
        },
        error: (error) => {
          console.error('Error fetching publication user data:', error);
          // Asignar usuario por defecto en caso de error
          this.publication.user = {
            _id: this.publication.user,
            name: 'Usuario',
            surname: 'no disponible',
            picture: null
          };
        }
      });
    }
  }

  private loadUserDataForComment(comment: any, userId: string) {
    this._userService.getUser(userId).pipe(
      takeUntil(this.unsubscribe$)
    ).subscribe({
      next: (response) => {
        if (response && response.user) {
          comment.user = response.user;
        } else {
          console.error('Failed to get user data for comment');
          comment.user = {
            _id: userId,
            name: 'Usuario',
            surname: 'no disponible',
            picture: null
          };
        }
      },
      error: (error) => {
        console.error('Error fetching comment user data:', error);
        comment.user = {
          _id: userId,
          name: 'Usuario',
          surname: 'no disponible',
          picture: null
        };
      }
    });
  }

  createForms() {
    this.commentForm = this.fb.group({
      text: ['', [Validators.required, Validators.maxLength(this.MAX_INPUT_LENGTH)]]
    });
    this.replyForm = this.fb.group({
      text: ['', [Validators.required, Validators.maxLength(this.MAX_INPUT_LENGTH)]]
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
      if (!likeId) return false;
      
      if (typeof likeId === 'object' && likeId._id) {
        return String(likeId._id) === userId;
      } else {
        return String(likeId) === userId;
      }
    });
  }

  toggleLikeComment(commentId: string) {
    if (!commentId) {
      return;
    }
    
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
    if (!this.publication || !this.publication.comments || !commentId) {
      return;
    }
    
    const comment = this.publication.comments.find(c => c && c._id === commentId);
    if (comment) {
      this.updateSingleCommentLike(comment, isLiked);
    } else {
      // Buscar en respuestas anidadas
      for (const mainComment of this.publication.comments) {
        if (mainComment && mainComment.replies && Array.isArray(mainComment.replies)) {
          const reply = mainComment.replies.find(r => r && r._id === commentId);
          if (reply) {
            this.updateSingleCommentLike(reply, isLiked);
            break;
          }
        }
      }
    }
  }

  private updateSingleCommentLike(comment: any, isLiked: boolean) {
    if (!comment || !this.identity || !this.identity._id) {
      return;
    }
    
    // Inicializar arrays si no existen
    if (!comment.likes) {
      comment.likes = [];
    }
    
    const userId = String(this.identity._id);
    
    if (isLiked) {
      // Agregar like solo si no existe (verificar objetos y strings)
      const alreadyLiked = comment.likes.some(likeId => {
        if (!likeId) return false;
        
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
        if (!likeId) return false;
        
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
    if (!this.commentForm.valid || !publicationId || !this.identity) {
      return;
    }
    
    // Protección GDPR: Verificar que el usuario esté activado
    if (!this.canUserComment()) {
      this.onError.emit('Tu cuenta aún no ha sido activada. No puedes comentar hasta que un administrador apruebe tu cuenta (protección de datos GDPR).');
      return;
    }

    const commentToAdd = new Comment(this.commentForm.value.text, this.identity._id, publicationId);

    this._commentService.addComment(this._userService.getToken(), commentToAdd).pipe(
      takeUntil(this.unsubscribe$),
      switchMap(response => {
        if (!response || !response.comment || !response.comment._id) {
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
              // Verificar que identity tenga los datos necesarios
              const userInfo = {
                _id: this.identity._id || null,
                name: this.identity.name || 'Usuario',
                surname: this.identity.surname || 'Anónimo',
                picture: this.identity.picture || null
              };
              
              // Agregar la información completa del usuario al comentario
              const enrichedComment = {
                ...response.comment,
                user: userInfo,
                likes: [],
                likesCount: 0,
                replies: []
              };
              
              // Inicializar array de comentarios si no existe
              if (!this.publication.comments) {
                this.publication.comments = [];
              }
              
              // Agregar el comentario enriquecido a la publicación
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
        console.error('Comment submission error:', error);
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

  // Métodos para respuestas anidadas
  toggleReplyForm(commentId: string) {
    this.showReplyForm[commentId] = !this.showReplyForm[commentId];
    
    if (this.showReplyForm[commentId]) {
      // Encontrar el comentario/respuesta al que se está respondiendo
      const targetComment = this.findCommentById(commentId);
      if (targetComment && targetComment.user && targetComment.user.name && targetComment.user.surname) {
        // Guardar información del usuario al que se responde
        this.replyingTo[commentId] = targetComment.user;
        
        // Determinar si estamos respondiendo a un comentario principal o a una respuesta
        const rootComment = this.findRootComment(targetComment);
        const isReplyingToMainComment = !rootComment; // Si no hay root, es un comentario principal
        
        let mention = '';
        if (isReplyingToMainComment) {
          // Respondiendo a comentario principal
          mention = `@${targetComment.user.name} ${targetComment.user.surname} `;
        } else {
          // Respondiendo a una respuesta - agregar contexto del hilo
          mention = `@${targetComment.user.name} ${targetComment.user.surname} `;
        }
        
        // Prellenar el formulario con la mención
        this.replyForm.patchValue({
          text: mention
        });
        
        // Hacer focus después de la mención
        setTimeout(() => {
          const textarea = document.querySelector(`#reply-textarea-${commentId}`) as HTMLTextAreaElement;
          if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(mention.length, mention.length);
          }
        }, 100);
      } else {
        // Si no hay información de usuario, solo limpiar el formulario
        this.replyForm.patchValue({
          text: ''
        });
      }
    } else {
      // Limpiar formulario cuando se cierra
      this.replyForm.reset();
      this.replyingTo[commentId] = null;
    }
  }

  // Método mejorado para responder desde cualquier nivel hacia el comentario principal
  replyToComment(commentId: string) {
    const targetComment = this.findCommentById(commentId);
    if (!targetComment) return;

    // Encontrar el comentario raíz
    const rootComment = this.findRootComment(targetComment) || targetComment;
    
    // Activar formulario en el comentario raíz
    this.showReplyForm[rootComment._id] = true;
    
    // Establecer la mención del usuario al que se está respondiendo
    if (targetComment.user && targetComment.user.name && targetComment.user.surname) {
      this.replyingTo[rootComment._id] = targetComment.user;
      
      const mention = `@${targetComment.user.name} ${targetComment.user.surname} `;
      this.replyForm.patchValue({
        text: mention
      });
      
      // Hacer focus en el formulario del comentario raíz
      setTimeout(() => {
        const textarea = document.querySelector(`#reply-textarea-${rootComment._id}`) as HTMLTextAreaElement;
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(mention.length, mention.length);
        }
      }, 100);
    }
  }

  onReplySubmit(commentId: string, publicationId: string) {
    if (!this.replyForm.valid) {
      return;
    }
    
    // Protección GDPR: Verificar que el usuario esté activado
    if (!this.canUserComment()) {
      this.onError.emit('Tu cuenta aún no ha sido activada. No puedes responder comentarios hasta que un administrador apruebe tu cuenta (protección de datos GDPR).');
      return;
    }

    // Pausar el polling temporalmente para evitar conflictos
    this.pauseRealTimeUpdates();

    const replyText = this.replyForm.value.text;
    const mentionedUser = this.replyingTo[commentId];

    // Encontrar el comentario al que se está respondiendo
    const targetComment = this.findCommentById(commentId);
    if (!targetComment) {
      this.onError.emit('No se pudo encontrar el comentario.');
      this.resumeRealTimeUpdates();
      return;
    }

    // Determinar el comentario raíz (padre) al que se debe agregar la respuesta
    // Si estamos respondiendo a un comentario principal (nivel 1), se agrega ahí
    // Si estamos respondiendo a una respuesta (nivel 2+), se agrega al comentario raíz
    const rootComment = this.findRootComment(targetComment);
    
    const replyData = {
      text: replyText,
      publication: publicationId,
      mentionedUser: mentionedUser && mentionedUser._id ? mentionedUser._id : null
    };

    // Usar el ID del comentario raíz como parentId para mantener máximo 2 niveles
    const parentId = rootComment ? rootComment._id : commentId;

    this._commentService.addReply(this._userService.getToken(), parentId, replyData)
      .pipe(
        takeUntil(this.unsubscribe$),
        catchError(error => {
          console.error('Error adding reply:', error);
          this.onError.emit('Error al enviar la respuesta. Inténtalo de nuevo.');
          this.resumeRealTimeUpdates();
          return of(null); // Retorna un observable, no throwError
        })
      )
      .subscribe({
        next: (response) => {
          if (response && response.reply) {
            // Agregar la respuesta al comentario raíz
            const parentComment = rootComment || targetComment;
            if (parentComment) {
              if (!parentComment.replies) {
                parentComment.replies = [];
              }
              
              // Agregar información de mención a la respuesta
              const enrichedReply = {
                ...response.reply,
                mentionedUser: mentionedUser,
                user: response.reply.user || {
                  _id: this.identity._id,
                  name: this.identity.name,
                  surname: this.identity.surname,
                  picture: this.identity.picture
                },
                likes: [],
                likesCount: 0,
                replies: []
              };
              
              parentComment.replies.push(enrichedReply);
              
              // Limpiar formulario y ocultar
              this.replyForm.reset();
              this.showReplyForm[commentId] = false;
              this.replyingTo[commentId] = null;
              
              console.log('Reply added successfully to root comment');
            }
          }
          
          // Reanudar polling después de 2 segundos
          setTimeout(() => {
            this.resumeRealTimeUpdates();
          }, 2000);
        },
        error: (error) => {
          console.error('Reply submission failed:', error);
          this.resumeRealTimeUpdates();
        }
      });
  }

  // Método para encontrar el comentario raíz (nivel 1)
  private findRootComment(targetComment: any): any {
    if (!this.publication || !this.publication.comments || !targetComment) {
      return null;
    }

    // Si el comentario objetivo está en el nivel principal, es el comentario raíz
    const mainComment = this.publication.comments.find(c => c && c._id === targetComment._id);
    if (mainComment) {
      return mainComment; // Es un comentario principal
    }

    // Si no está en el nivel principal, buscar qué comentario principal lo contiene
    for (const comment of this.publication.comments) {
      if (comment && comment.replies && Array.isArray(comment.replies)) {
        const foundReply = this.findReplyById(comment.replies, targetComment._id);
        if (foundReply) {
          return comment; // Retornar el comentario principal que contiene esta respuesta
        }
      }
    }

    return null;
  }

  private findCommentById(commentId: string): any {
    if (!this.publication || !this.publication.comments || !commentId) {
      return null;
    }
    
    // Buscar en comentarios principales primero
    for (const comment of this.publication.comments) {
      if (comment && comment._id === commentId) {
        return comment;
      }
    }
    
    // Buscar en respuestas
    for (const comment of this.publication.comments) {
      if (comment && comment.replies && Array.isArray(comment.replies)) {
        const found = this.findReplyById(comment.replies, commentId);
        if (found) {
          return found;
        }
      }
    }
    
    return null;
  }

  private findReplyById(replies: any[], replyId: string): any {
    if (!replies || !Array.isArray(replies) || !replyId) {
      return null;
    }
    
    for (const reply of replies) {
      if (reply && reply._id === replyId) {
        return reply;
      }
      // No buscar recursivamente más profundo - solo 2 niveles máximo
    }
    
    return null;
  }

  // Método para contar respuestas totales
  getTotalRepliesCount(comment: any): number {
    if (!comment || !comment.replies || !Array.isArray(comment.replies)) {
      return 0;
    }
    
    let count = comment.replies.length;
    
    // Contar respuestas anidadas recursivamente
    for (const reply of comment.replies) {
      if (reply) {
        count += this.getTotalRepliesCount(reply);
      }
    }
    
    return count;
  }

  // Método para cancelar respuesta
  cancelReply(commentId: string) {
    this.showReplyForm[commentId] = false;
    this.replyForm.reset();
    this.replyingTo[commentId] = null;
  }

  // Solicitar eliminación (emitir al padre y que abra su modal global)
  requestDelete() {
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

  // Método para extraer menciones del texto
  extractMentions(text: string): string[] {
    if (!text || typeof text !== 'string') {
      return [];
    }
    const mentionRegex = /@([A-Za-zÀ-ÿ\s]+)/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map(match => match.substring(1).trim()) : [];
  }

  // Métodos para manejar contenido expandible
  shouldShowExpandButton(): boolean {
    return this.publication?.text && this.publication.text.length > this.MAX_CONTENT_LENGTH;
  }

  getDisplayContent(): string {
    if (!this.publication?.text) return '';
    
    if (this.isContentExpanded || this.publication.text.length <= this.MAX_CONTENT_LENGTH) {
      return this.publication.text;
    }
    
    return this.publication.text.substring(0, this.MAX_CONTENT_LENGTH) + '...';
  }

  toggleContentExpansion(): void {
    this.isContentExpanded = !this.isContentExpanded;
  }

  // Método para formatear texto con menciones como hiperenlaces
  formatTextWithMentions(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    //console.log('Formatting text with mentions:', text);
    
    // Regex mejorado para capturar solo nombre y apellido (máximo 2 palabras después de @)
    const mentionRegex = /@([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?)\b/g;
    
    const result = text.replace(mentionRegex, (match, mentionName) => {
      const trimmedName = mentionName.trim();
    //  console.log('Found mention:', trimmedName);
      
      // Buscar el usuario mencionado en los comentarios para obtener su ID
      const mentionedUser = this.findUserByName(trimmedName);
    //  console.log('Mentioned user found:', mentionedUser);
      
      if (mentionedUser && mentionedUser._id) {
        // Crear hiperenlace al perfil del usuario que abre en nueva pestaña
        const link = `<a href="/perfil/${mentionedUser._id}" target="_blank" class="mention-link" title="Ver perfil de ${trimmedName}">@${trimmedName}</a>`;
        //console.log('Created link:', link);
        return link;
      } else {
        // Si no se encuentra el usuario, crear enlace genérico pero funcional
        // Esto es temporal hasta que implementemos búsqueda global de usuarios
       // console.log('User not found, showing styled mention that could be clickable');
        return `<span class="mention-unknown" style="color: #007bff; font-weight: 600; background-color: #e8f4f8; padding: 2px 6px; border-radius: 4px; cursor: help;" title="Usuario mencionado: ${trimmedName}">@${trimmedName}</span>`;
      }
    });
    
    //console.log('Final result:', result);
    return result;
  }

  // =============================
  // Truncado/expansión Comentarios
  // =============================
  shouldShowCommentExpand(comment: any): boolean {
    return !!(comment && comment.text && comment.text.length > this.MAX_COMMENT_DISPLAY_LENGTH);
  }

  getDisplayCommentText(comment: any): string {
    if (!comment || !comment.text) return '';
    const isExpanded = this.expandedComments[comment._id];
    if (isExpanded || comment.text.length <= this.MAX_COMMENT_DISPLAY_LENGTH) {
      return comment.text;
    }
    return comment.text.substring(0, this.MAX_COMMENT_DISPLAY_LENGTH) + '...';
  }

  toggleCommentExpansion(commentId: string): void {
    this.expandedComments[commentId] = !this.expandedComments[commentId];
  }

  // ==========================
  // Truncado/expansión Respuestas
  // ==========================
  shouldShowReplyExpand(reply: any): boolean {
    return !!(reply && reply.text && reply.text.length > this.MAX_COMMENT_DISPLAY_LENGTH);
  }

  getDisplayReplyText(reply: any): string {
    if (!reply || !reply.text) return '';
    const isExpanded = this.expandedReplies[reply._id];
    if (isExpanded || reply.text.length <= this.MAX_COMMENT_DISPLAY_LENGTH) {
      return reply.text;
    }
    return reply.text.substring(0, this.MAX_COMMENT_DISPLAY_LENGTH) + '...';
  }

  toggleReplyExpansion(replyId: string): void {
    this.expandedReplies[replyId] = !this.expandedReplies[replyId];
  }

  // Método auxiliar para buscar usuario por nombre completo
  private findUserByName(fullName: string): any {
    
    if (!fullName || !this.publication) {
      return null;
    }
    
    const nameParts = fullName.toLowerCase().split(' ').filter(part => part.length > 0);
    
    // Buscar también en el autor de la publicación
    if (this.publication.user && this.matchesUserName(this.publication.user, nameParts)) {
      return this.publication.user;
    }
    
    // Buscar en comentarios principales
    if (this.publication.comments && Array.isArray(this.publication.comments)) {
      for (const comment of this.publication.comments) {
        if (comment && comment.user && this.matchesUserName(comment.user, nameParts)) {
        //  console.log('Found in comment user:', comment.user);
          return comment.user;
        }
        
        // Buscar en respuestas anidadas
        if (comment.replies && Array.isArray(comment.replies)) {
          for (const reply of comment.replies) {
            if (reply && reply.user && this.matchesUserName(reply.user, nameParts)) {
            //  console.log('Found in reply user:', reply.user);
              return reply.user;
            }
          }
        }
      }
    }
    
    //console.log('User not found anywhere');
    return null;
  }

  // Método auxiliar para verificar si un usuario coincide con el nombre buscado
  private matchesUserName(user: any, nameParts: string[]): boolean {
    if (!user || !user.name || !user.surname) {
      return false;
    }
    
    const userName = user.name.toLowerCase().trim();
    const userSurname = user.surname.toLowerCase().trim();
    
    
    if (nameParts.length === 1) {
      // Solo una palabra - puede ser nombre o apellido
      return userName === nameParts[0] || userSurname === nameParts[0];
    } else if (nameParts.length === 2) {
      // Dos palabras - verificar nombre+apellido en cualquier orden
      const [first, second] = nameParts;
      return (userName === first && userSurname === second) ||
             (userName === second && userSurname === first);
    }
    
    return false;
  }

  loadReplies(commentId: string): void {
    // Since replies are already loaded with the comment, just ensure they're visible
    // This method exists to satisfy the template binding
  }

  loadMoreComments(): void {
    if (this.commentsPagination.loading || !this.commentsPagination.hasMore) {
      return;
    }

    this.commentsPagination.loading = true;
    this.commentsPagination.currentPage++;

    this._publicationService.loadMoreComments(
      this._userService.getToken(),
      this.publication._id,
      this.commentsPagination.currentPage,
      10
    ).pipe(
      takeUntil(this.unsubscribe$),
      catchError(error => {
        console.error('Error loading more comments:', error);
        this.commentsPagination.loading = false;
        this.commentsPagination.currentPage--;
        return of(null);
      })
    ).subscribe(response => {
      if (response && response.comments) {
        // Agregar nuevos comentarios al final de la lista
        if (!this.publication.comments) {
          this.publication.comments = [];
        }
        
        this.publication.comments.push(...response.comments);
        
        // Actualizar paginación
        this.commentsPagination.hasMore = response.pagination.hasMore;
        this.commentsPagination.totalComments = response.pagination.totalComments;

        // Inicializar paginación de respuestas para nuevos comentarios
        response.comments.forEach(comment => {
          if (comment.totalReplies > 5) {
            this.repliesPagination[comment._id] = {
              currentPage: 1,
              hasMore: true,
              loading: false,
              totalReplies: comment.totalReplies
            };
          }
        });
      }
      this.commentsPagination.loading = false;
    });
  }

  loadMoreReplies(commentId: string): void {
    if (!this.repliesPagination[commentId]) {
      this.repliesPagination[commentId] = {
        currentPage: 1,
        hasMore: true,
        loading: false,
        totalReplies: 0
      };
    }

    const pagination = this.repliesPagination[commentId];
    if (pagination.loading || !pagination.hasMore) {
      return;
    }

    pagination.loading = true;
    pagination.currentPage++;

    this._publicationService.loadMoreReplies(
      this._userService.getToken(),
      commentId,
      pagination.currentPage,
      5
    ).pipe(
      takeUntil(this.unsubscribe$),
      catchError(error => {
        console.error('Error loading more replies:', error);
        pagination.loading = false;
        pagination.currentPage--;
        return of(null);
      })
    ).subscribe(response => {
      if (response && response.replies) {
        // Encontrar el comentario y agregar nuevas respuestas
        const comment = this.findCommentById(commentId);
        if (comment) {
          if (!comment.replies) {
            comment.replies = [];
          }
          comment.replies.push(...response.replies);
          
          // Actualizar paginación
          pagination.hasMore = response.pagination.hasMore;
          pagination.totalReplies = response.pagination.totalReplies;
        }
      }
      pagination.loading = false;
    });
  }

  initializeCommentsPagination(totalComments: number, loadedComments: number): void {
    this.commentsPagination = {
      currentPage: 1,
      hasMore: loadedComments < totalComments,
      loading: false,
      totalComments: totalComments
    };

    console.log('✅ Paginación inicializada:', {
      publicationId: this.publication._id,
      totalComments,
      loadedComments,
      hasMore: this.commentsPagination.hasMore
    });

    // Inicializar paginación de respuestas para cada comentario
    if (this.publication.comments) {
      this.publication.comments.forEach(comment => {
        if (comment.totalReplies && comment.totalReplies > 5) {
          this.repliesPagination[comment._id] = {
            currentPage: 1,
            hasMore: true,
            loading: false,
            totalReplies: comment.totalReplies
          };
        }
      });
    }
  }
}
