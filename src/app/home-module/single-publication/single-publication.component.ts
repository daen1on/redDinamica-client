import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { UserService } from 'src/app/services/user.service';
import { PublicationService } from 'src/app/services/publication.service';
import { GLOBAL } from 'src/app/services/GLOBAL';

@Component({
  selector: 'app-single-publication',
  templateUrl: './single-publication.component.html',
  styleUrls: ['./single-publication.component.css'],
  standalone: false
})
export class SinglePublicationComponent implements OnInit, OnDestroy {
  public publication: any = null;
  public identity: any;
  public loading: boolean = true;
  public error: string = '';
  public url: string;
  private unsubscribe$ = new Subject<void>();

  constructor(
    private _route: ActivatedRoute,
    private _router: Router,
    private _userService: UserService,
    private _publicationService: PublicationService
  ) {
    this.identity = this._userService.getIdentity();
    this.url = GLOBAL.url;
  }

  ngOnInit(): void {
    // Obtener el ID de la publicación desde la ruta
    this._route.params.pipe(
      takeUntil(this.unsubscribe$)
    ).subscribe(params => {
      const publicationId = params['id'];
      if (publicationId) {
        this.loadPublication(publicationId);
      } else {
        this.error = 'ID de publicación no válido';
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  private loadPublication(publicationId: string): void {
    const token = this._userService.getToken();
    
    if (!token) {
      this._router.navigate(['/login']);
      return;
    }

    this._publicationService.getPublication(token, publicationId, 10, 5)
      .pipe(
        takeUntil(this.unsubscribe$),
        catchError(error => {
          console.error('Error loading publication:', error);
          this.error = 'No se pudo cargar la publicación. Es posible que haya sido eliminada.';
          this.loading = false;
          return of(null);
        })
      )
      .subscribe({
        next: (response) => {
          if (response && response.publication) {
            this.publication = response.publication;
            // Incluir información de paginación en la publicación
            if (response.pagination) {
              this.publication.pagination = response.pagination;
            }
            this.loading = false;
            
            // Auto-scroll a comentarios si viene desde notificación de comentario
            this._route.queryParams.pipe(
              takeUntil(this.unsubscribe$)
            ).subscribe(queryParams => {
              if (queryParams['highlight'] === 'comment') {
                setTimeout(() => {
                  this.scrollToComments();
                }, 500);
              }
            });
          } else {
            this.error = 'Publicación no encontrada';
            this.loading = false;
          }
        },
        error: (error) => {
          console.error('Error in publication subscription:', error);
          this.error = 'Error al cargar la publicación';
          this.loading = false;
        }
      });
  }

  private scrollToComments(): void {
    const commentsElement = document.querySelector('.comments-section') || 
                           document.querySelector('#comments-form-' + this.publication._id);
    
    if (commentsElement) {
      commentsElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }

  onDeletePublication(publicationId: string): void {
    if (!publicationId) {
      this.onError('ID de publicación inválido');
      return;
    }

    const token = this._userService.getToken();
    if (!token) {
      this._router.navigate(['/login']);
      return;
    }

    this.loading = true;
    this._publicationService.removePost(token, publicationId)
      .pipe(
        takeUntil(this.unsubscribe$),
        catchError(error => {
          console.error('Error deleting publication:', error);
          this.loading = false;
          this.onError('No se pudo eliminar la publicación. Inténtalo nuevamente.');
          return of(null);
        })
      )
      .subscribe(response => {
        // Independientemente del payload, si el request no falló, navegamos
        this.loading = false;
        this._router.navigate(['/inicio'], {
          queryParams: { message: 'Publicación eliminada exitosamente' }
        });
      });
  }

  onDeleteComment(commentId: string): void {
    // Refrescar la publicación para mostrar cambios
    if (this.publication && this.publication._id) {
      this.loadPublication(this.publication._id);
    }
  }

  onError(message: string): void {
    this.error = message;
    // Limpiar error después de unos segundos
    setTimeout(() => {
      this.error = '';
    }, 5000);
  }

  goBackToFeed(): void {
    this._router.navigate(['/inicio']);
  }
} 