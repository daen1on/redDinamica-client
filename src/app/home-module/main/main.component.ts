import { Component } from '@angular/core';
import { UserService } from 'src/app/services/user.service';
import { UntypedFormGroup, UntypedFormControl, Validators } from '@angular/forms';
import { FormBuilder } from '@angular/forms';

import { Router, ActivatedRoute } from '@angular/router';

import { PublicationService } from 'src/app/services/publication.service';
import { UploadService } from 'src/app/services/upload.service';
import { CommentService } from 'src/app/services/comment.service';

import { GLOBAL } from 'src/app/services/global';
import { Publication } from 'src/app/models/publication.model';
import { Comment } from 'src/app/models/comment.model';
import { MAX_FILE_SIZE } from 'src/app/services/DATA';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { takeUntil, catchError, switchMap, tap, finalize } from 'rxjs/operators';



@Component({
    selector: 'main',
    templateUrl: './main.component.html',
    styleUrls: ['./main.component.css'],
    standalone: false
})
export class MainComponent {
    public title: string;
    public identity;
    public token;
    public url;

    public publication;
    public publications = [];

    public postForm;
    public status;
    public submitted = false;

    // Pagination
    public page; // Actual page
    public pages; // Number of pages
    public total; // Total of records
    public prevPage;
    public nextPage;
    public itemsPerPage;
    public noMore = false;

    public MAX_FILE_SIZE = MAX_FILE_SIZE;
    public maxSize = MAX_FILE_SIZE * 1024 * 1024;
    public maxSizeError = false;

    // Comments
    public commentForm;
    public comment;
    public loading = true;
    private unsubscribe$ = new Subject<void>();

    barWidth: string =  "0%";

    constructor(
        private _userService: UserService,
        private _publicationService: PublicationService,
        private _commentService: CommentService,
        private _uploadService: UploadService,
        private _route: ActivatedRoute,
        private _router: Router,
        private fb: FormBuilder
    ) {
        this.title = 'Bienvenidos a';
        this.identity = this._userService.getIdentity();
        this.token = this._userService.getToken();
        this.url = GLOBAL.url;

        this.filesToUpload = [];

        this.createForm();

        this.page = 1;

        this.getPublications(this.page);

        // Suscribirse a cambios en la ruta para manejar navegación desde notificaciones
        this.handleNavigationFromNotifications();
    }

    // Método para manejar navegación desde notificaciones
    private handleNavigationFromNotifications(): void {
        // Manejar fragments (publication-123)
        this._route.fragment.pipe(
            takeUntil(this.unsubscribe$)
        ).subscribe(fragment => {
            if (fragment && fragment.startsWith('publication-')) {
                const publicationId = fragment.replace('publication-', '');
                console.log('Scrolling to publication:', publicationId);
                
                // Esperar a que las publicaciones se carguen y luego hacer scroll
                setTimeout(() => {
                    this.scrollToPublication(publicationId);
                }, 1000);
            }
        });

        // Manejar query params para highlight
        this._route.queryParams.pipe(
            takeUntil(this.unsubscribe$)
        ).subscribe(params => {
            if (params['highlight']) {
                console.log('Highlighting element type:', params['highlight']);
                // Aquí puedes agregar lógica adicional para destacar elementos
            }
        });
    }

    // Método para hacer scroll a una publicación específica
    private scrollToPublication(publicationId: string): void {
        // Buscar el elemento de la publicación
        const publicationElement = document.querySelector(`#publication-${publicationId}`) ||
                                 document.querySelector(`[data-publication-id="${publicationId}"]`);
        
        if (publicationElement) {
            // Hacer scroll suave al elemento
            publicationElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start',
                inline: 'nearest'
            });
            
            // Agregar efecto de highlight temporal
            publicationElement.classList.add('highlight-notification');
            setTimeout(() => {
                publicationElement.classList.remove('highlight-notification');
            }, 3000);
            
            console.log('Scrolled to publication:', publicationId);
        } else {
            console.log('Publication element not found, trying to load more publications');
            // Si no se encuentra, intentar cargar más publicaciones
            this.loadPublicationById(publicationId);
        }
    }

    // Método para cargar una publicación específica si no está visible
    private loadPublicationById(publicationId: string): void {
        // Este método podría implementarse para buscar una publicación específica
        // Por ahora, simplemente cargamos más publicaciones
        if (!this.noMore && this.page < this.pages) {
            this.viewMore();
            // Reintentar scroll después de cargar
            setTimeout(() => {
                this.scrollToPublication(publicationId);
            }, 500);
        }
    }

    // Get controls form
    get f() { return this.postForm.controls; }

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }
    onChanges(): void {
        this.postForm.get('textPost').valueChanges.pipe(
            takeUntil(this.unsubscribe$) // Unsubscribe when unsubscribe$ emits
        ).subscribe(val => {
            if (val) {
                this.status = null;
                this.submitted = false;
            }
        });
    }
    

    createForm() {
        this.postForm = this.fb.group({
            textPost: [''],
            filePost: ['']
        });
    
        this.commentForm = this.fb.group({
            text: ['', Validators.required]
        });
    }
      getPublications(page: number, add = false): void {
    this._publicationService.getPublications(this.token, page, 10, 5).pipe(
      takeUntil(this.unsubscribe$),
      catchError(error => {
        console.error('Error loading publications:', error);
        this.noMore = true;
        this.loading = false;
        return of(null);
      }),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: response => {
        if (!response) return;

        if (response.publications && response.publications.length > 0) {
          // Agregar las nuevas publicaciones al array existente
          this.publications = this.publications.concat(response.publications);
          this.page = page;

          // Si las publicaciones devueltas son menos que el límite, no hay más
          if (response.publications.length < 10) {
            this.noMore = true;
          }
        } else {
          this.noMore = true;
        }
      },
      error: error => {
        console.error('Error en suscripción:', error);
        this.noMore = true;
      }
    });
    }

    
    setUpload() {
        this.status = null;
        this.submitted = false;
    }

    public filesToUpload: Array<File>;
    fileChangeEvent(fileInput: any) {
        this.filesToUpload = <Array<File>>fileInput.target.files;
     
    }


    public formError = false;
    public typeError = false;
    onSubmit() {
        this.submitted = true;
        this.status = null;

        // Validate not null text or file
        if (!this.postForm.value.textPost && this.filesToUpload.length <= 0) {
            this.formError = true;
            return;
        } 

        if (this.filesToUpload[0]) {
            // Validate file type
            if (!['image/jpeg', 'image/gif', 'image/png'].includes(this.filesToUpload[0].type)) {
                this.typeError = true;
                return;
            } 

            // Validate file size
            if (this.filesToUpload[0].size > this.maxSize ) {
                this.maxSizeError = true;
                return;
            }
        }
         // Resetting error states for subsequent submissions
        this.formError = false;
        this.typeError = false;
        this.maxSizeError = false;

        const publication = new Publication(
            this.postForm.value.textPost,
            this.identity._id
        );
        this._publicationService.addPost(this.token, publication).pipe(
            switchMap(response => {
                if (!response.publication) {
                    throw new Error('Publication failed');
                }
                this.status = 'success';
                // Only attempt to upload the file if there is one and the publication was successful
                if (this.filesToUpload.length > 0) {
                    return this._uploadService.makeFileRequest(
                        `${this.url}upload-file-post/${response.publication._id}`,
                        [],
                        this.filesToUpload,
                        this.token,
                        'image'
                    ).pipe(
                        tap((event: HttpEvent<any>) => {
                            switch (event.type) {
                                case HttpEventType.UploadProgress:
                                    this.status = 'warning';
                                    this.barWidth = `${Math.round(100 * event.loaded / event.total)}%`;
                                    break;
                                case HttpEventType.Response:
                                    console.log('File successfully uploaded!', event.body);
                                    this.barWidth = '0%';
                                    this.status = 'success';

                                    break;
                            }
                        }),
                        catchError(error => {
                            console.error(error);
                            this.status = 'error';
                            this.barWidth = '0%';
                            return throwError(() => new Error('File upload failed'));
                        })
                    );
                }
                return of(response); // If no file to upload, just return the response
            }),
            catchError(error => {
                console.error(error);
                this.status = 'error';
                return throwError(() => new Error('Publication or file upload failed'));
            }),
            finalize(() => {
                this.submitted = false;
                this.postForm.reset();
                this.getPublications(this.page);
                setTimeout(() => this.status = null, 5000);
            })
        ).subscribe();
        
        
    }

    public tempPublicationId;
    setDelete(publicationId) {
        this.tempPublicationId = publicationId;
        // Abrir modal de confirmación
        const modalElement = document.getElementById('delete');
        if (modalElement) {
            const modal = new (window as any).bootstrap.Modal(modalElement);
            modal.show();
        }
    }
    
    public errorMessage: string = '';
    public errorMessageTimeout: any = null;

    deletePost() {
        this._publicationService.removePost(this.token, this.tempPublicationId).pipe(
            takeUntil(this.unsubscribe$),
            tap(response => {
                if (!response.publication) {
                    throw new Error('Failed to delete the publication');
                }
                // Remover publicación del arreglo local para reflejarlo en UI sin recargar
                this.removePublicationFromList(response.publication._id || this.tempPublicationId);
                this.tempPublicationId = null;
                this.clearErrorMessage();
            }),
            catchError(error => {
                console.error(error);
                this.setErrorMessage('Failed to delete the publication. Please try again.');
                return throwError(() => new Error('Failed to delete the publication'));
            })
        ).subscribe({
            error: (error) => {
                console.error('Deletion failed', error);
            }
        });
    }

    // Eliminar publicación por id del arreglo local
    private removePublicationFromList(publicationId: string): void {
        if (!publicationId || !Array.isArray(this.publications)) {
            return;
        }
        const index = this.publications.findIndex((p: any) => p && p._id === publicationId);
        if (index !== -1) {
            this.publications.splice(index, 1);
        }
    }
    
    setErrorMessage(message: string) {
        if (this.errorMessageTimeout) {
            clearTimeout(this.errorMessageTimeout);
        }
        this.errorMessage = message;
        this.errorMessageTimeout = setTimeout(() => {
            this.errorMessage = '';
            this.errorMessageTimeout = null;
        }, 5000);
    }
    
    clearErrorMessage() {
        this.errorMessage = '';
        if (this.errorMessageTimeout) {
            clearTimeout(this.errorMessageTimeout);
            this.errorMessageTimeout = null;
        }
    }
    
    public tempCommentId;
    setDeleteComment(commentId) {
        this.tempCommentId = commentId;
        // Abrir modal de confirmación
        const modalElement = document.getElementById('deleteComment');
        if (modalElement) {
            const modal = new (window as any).bootstrap.Modal(modalElement);
            modal.show();
        }
    }

    deleteComment() {
        this._commentService.removeComment(this.token, this.tempCommentId).pipe(
            takeUntil(this.unsubscribe$),
            tap(response => {
                if (!response.comment) {
                    throw new Error('Failed to delete the comment');
                }
                // Eliminar del arreglo local para reflejarlo en UI sin recargar
                this.removeCommentFromPublications(this.tempCommentId);
                this.tempCommentId = null;
            }),
            catchError(error => {
                console.error(error);
                this.setErrorMessage('Failed to delete the comment. Please try again.');
                return throwError(() => new Error('Failed to delete the comment'));
            })
        ).subscribe({
            next: () => {
                console.log('Comment deleted successfully');
            },
            error: (error) => {
                console.error('Deletion of comment failed', error);
            }
        });
    }

    // Eliminar un comentario/respuesta por id dentro de las publicaciones cargadas
    private removeCommentFromPublications(commentId: string): void {
        if (!commentId || !Array.isArray(this.publications)) {
            return;
        }
        for (const publication of this.publications) {
            if (publication?.comments && Array.isArray(publication.comments)) {
                const removed = this.removeCommentFromList(publication.comments, commentId);
                if (removed) {
                    break;
                }
            }
        }
    }

    // Borrado recursivo en lista de comentarios y sus respuestas
    private removeCommentFromList(comments: any[], commentId: string): boolean {
        if (!Array.isArray(comments) || !commentId) {
            return false;
        }

        const index = comments.findIndex((c: any) => c && c._id === commentId);
        if (index !== -1) {
            comments.splice(index, 1);
            return true;
        }

        for (const comment of comments) {
            if (comment?.replies && Array.isArray(comment.replies)) {
                const removed = this.removeCommentFromList(comment.replies, commentId);
                if (removed) {
                    return true;
                }
            }
        }

        return false;
    }

    viewMore() {
        // Verificar que no se hayan acabado las publicaciones antes de hacer la solicitud
        if (this.noMore || this.page >= this.pages) {
            console.log('No more publications to load');
            return;
        }
        
        this.page += 1;

        // Pre-establecer noMore si ya llegamos al límite antes de la solicitud
        if (this.page >= this.pages) {
            this.noMore = true;
        }

        this.getPublications(this.page, true);
    }

    newLines(text) {
        let innerHtml = '';

        if (text) {
            text.split('\n').forEach(paragraph => {
                innerHtml += `<p>${paragraph}</p>`
            });
        }

        return innerHtml;
    }

    // Método de utilidad para detectar si no hay más publicaciones
    private checkNoMorePublications(currentPage: number, totalPages: number, publicationsReceived: number, itemsPerPage: number): boolean {
        // Múltiples condiciones para detectar el final de la paginación
        const reachedLastPage = currentPage >= totalPages;
        const noPublicationsReceived = publicationsReceived === 0;
        const lessThanExpected = currentPage > 1 && publicationsReceived < itemsPerPage;
        const exceedsTotal = totalPages > 0 && currentPage > totalPages;
        
        return reachedLastPage || noPublicationsReceived || lessThanExpected || exceedsTotal;
    }

    // Método para resetear paginación (útil al cambiar filtros o actualizar)
    public resetPagination(): void {
        this.page = 1;
        this.noMore = false;
        this.publications = [];
        this.total = 0;
        this.pages = 0;
    }
}
