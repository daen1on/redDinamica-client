import { Component } from '@angular/core';
import { UserService } from 'src/app/services/user.service';
import { UntypedFormGroup, UntypedFormControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { PublicationService } from 'src/app/services/publication.service';
import { UploadService } from 'src/app/services/upload.service';
import { CommentService } from 'src/app/services/comment.service';

import { GLOBAL } from 'src/app/services/global';
import { User } from 'src/app/models/user.model';
import { Publication } from 'src/app/models/publication.model';
import { Comment } from 'src/app/models/comment.model';
import { MAX_FILE_SIZE } from 'src/app/services/DATA';
import { HttpEvent, HttpEventType } from '@angular/common/http';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators'

@Component({
    selector: 'publications',
    templateUrl: './publications.component.html',
    standalone: false
})
export class PublicationsComponent {
    public title: string;
    public identity;
    public token;
    public url;
    public ownProfile = new User;

    public publication;
    public publications = [];

    public postForm;
    public status;
    public submitted;

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
    readonly deletedMsg = 'Se ha eliminado la publicación';
    readonly warningMsg = 'Se estan subiendo los archivos, por favor espera mientras finaliza y evita cerrar esta ventana.';
    
    // Comments
    public commentForm;
    public comment;
    public replyForm; // Formulario para respuestas
    public showReplyForm: {[commentId: string]: boolean} = {}; // Control de visibilidad de formularios de respuesta
    barWidth: string = "0%";
    private unsubscribe$: Subject<void> = new Subject<void>();


    constructor(
        private _userService: UserService,
        private _publicationService: PublicationService,
        private _commentService: CommentService,
        private _uploadService: UploadService,
        private _route: ActivatedRoute,
        private _router: Router
    ) {

        this.identity = this._userService.getIdentity();
        this.token = this._userService.getToken();
        this.url = GLOBAL.url;

        this.filesToUpload = [];

        this.postForm = new UntypedFormGroup({
            textPost: new UntypedFormControl('', [this.maxLinesValidator(100)]),
            filePost: new UntypedFormControl('')
        });

        this.submitted = false;
        this.page = 1;

        this._route.parent.params.subscribe(params => {
            let id = params['id'];
            this.ownProfile._id = id;
        });

        //this.loadPage();
       // this.getUserPublications(this.page);

        this.commentForm = new UntypedFormGroup({
            text: new UntypedFormControl('', Validators.required)
        });

        // Formulario para respuestas
        this.replyForm = new UntypedFormGroup({
            replyText: new UntypedFormControl('', Validators.required)
        });
    }

    // Get controls form
    get f() { return this.postForm.controls; }
    ngOnInit() {
        this.identity = this._userService.getIdentity(); // Ensure identity is loaded
        this._route.parent.params.pipe(
            takeUntil(this.unsubscribe$)  // Manage subscription
        ).subscribe(params => {
            const id = params['id'];
            if (id) {
                this.loadUserData(id);
                this.getUserPublications(this.page);// Call publications loading here if it doesn't depend on specific user details fetched asynchronously
            } else {
                console.error('No user ID provided in route parameters');
            }
        });

    }
    ngOnDestroy() {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }
    loadUserData(userId: string) {
        this._userService.getUser(userId)
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe({
                next: (response) => {
                    if (response.user) {
                        this.ownProfile = response.user;
                    } else {
                        console.error('Failed to fetch user data');
                        this.status = 'error';
                    }
                },
                error: (error) => {
                    console.error('Error fetching user data:', error);
                    this.status = 'error';
                }
            });
    }
    
    onChanges(): void {

        this.postForm.get('textPost').valueChanges.subscribe(val => {
            if (val) {
                this.status = null;
                this.submitted = false;
            }
        });
    }

   

    getUser(userId) {
        this._userService.getUser(userId)
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe({
                next: (response) => {
                    if (response.user) {
                        this.ownProfile = response.user;
                    } else {
                        this.status = 'error';
                        this.ownProfile = this.identity;
                    }
                },
                error: (error) => {
                    console.error('Error fetching user:', error);
                    this.status = 'error';
                    this.ownProfile = this.identity;
                    // Consider showing a user-friendly error message or redirecting
                },
                complete: () => {
                    // This is optional and is used if you need to perform actions after the observable completes
                    console.log('Completed fetching user');
                }
            });
    }
    getUserPublications(page: number, add: boolean = false) {
        let arrayA, arrayB;
    
        this._publicationService.getUserPublications(this.token, this.ownProfile._id, page).pipe(
            takeUntil(this.unsubscribe$)
        ).subscribe({
            next: (response) => {
                if (response.publications) {
                    //console.log("Full API Response:", response);

                    this.total = response.totalItems;
                    this.pages = response.totalPages;
                    this.itemsPerPage = response.itemsPerPage;
    
                    if (!add) { 
                        this.publications = response.publications;
                    } else {
                        arrayA = this.publications;
                        arrayB = response.publications;
                        this.publications = arrayA.concat(arrayB);
                    }
                    //console.log("this page is:"+this.page);
                    //console.log("this pages is"+this.pages);
                    if (this.page >= this.pages) {
                        this.noMore = true;
                       // console.log("noMore es true. \n");
                    }    
     
                    if (page > this.pages && this.pages > 0) {
                        this._router.navigate(['/perfil', this.ownProfile._id, 1]);
                    }
                } else {
                    this.status = 'error';
                }
            },
            error: (error) => {
                this.status = 'error';
                console.error('Error fetching publications:', error);
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
    
        // Validate not null text or file
        if (!this.postForm.value.textPost && this.filesToUpload.length <= 0) {
            this.formError = true;
            return;
        } else {
            this.formError = false;
        }
    
        if (this.filesToUpload[0]) {
            // Validate file type
            if (!['image/jpeg', 'image/gif', 'image/png'].includes(this.filesToUpload[0].type)) {
                this.typeError = true;
                return;
            } else {
                this.typeError = false;
            }
    
            // Validate file size
            if (this.maxSize < this.filesToUpload[0].size) {
                this.maxSizeError = true;
                return;
            } else {
                this.maxSizeError = false;
            }
        }
    
        this.publication = new Publication(this.postForm.value.textPost, this.identity._id);
    
        this._publicationService.addPost(this.token, this.publication).subscribe({
            next: (response) => {
                if (response.publication) {
                    this.page = 0;
                    if (this.filesToUpload.length > 0) {
                        // Upload post image
                        this._uploadService.makeFileRequest(
                            this.url + 'upload-file-post/' + response.publication._id,
                            [],
                            this.filesToUpload,
                            this.token,
                            'image'
                        ).subscribe({
                            next: (event: HttpEvent<any>) => {
                                switch (event.type) {
                                    case HttpEventType.UploadProgress: // If upload is in progress
                                        this.status = 'warning';
                                        this.barWidth = Math.round(event.loaded / event.total * 100).toString() + '%'; // get upload percentage
                                        break;
                                    case HttpEventType.Response: // give final response
                                        console.log('User successfully added!', event.body);
                                        this.submitted = false;
                                        this.postForm.reset();
                                        this.status = 'success';
                                        this.barWidth = '0%';
                                        
                                        this.getUserPublications(this.page);
                                        break;
                                }
                            },
                            error: (error) => {
                                this.status = 'error';
                                this.barWidth = '0%';
                                this.submitted = false;
                                console.error('Upload error:', error);
                            }
                        });
                    } else {
                        this.status = 'success';
                        this.submitted = false;
                        this.postForm.reset();
                        this.getUserPublications(this.page);
                    }
                } else {
                    this.status = 'error';
                    this.submitted = false;
                }
    
                setInterval(() => { this.status = null; }, 5000);
            },
            error: (error) => {
                console.error('Add post error:', error);
                this.status = 'error';
                this.submitted = false;
            }
        });
    }
    

    public tempPublicationId;    
    setDelete(publicationId) {
        this.tempPublicationId = publicationId;
        
    }
    
    deletePost() {
        this._publicationService.removePost(this.token, this.tempPublicationId).subscribe({
            next: (response) => {
                if (response.publication) {
                    this.tempPublicationId = null;
                    this.status = "deleted";    
                    if (response.lastValidPage !== undefined && this.page > response.lastValidPage) {
                        this.page = response.lastValidPage;
                    }
                    this.getUserPublications(this.page);
                }
            },
            error: (error) => {
                console.error('Error deleting post:', error);
                this.status = 'error';
            }
        });
    }
    
    

    public tempCommentId;    
    setDeleteComment(commentId) {
        this.tempCommentId = commentId;        
    }

    deleteComment() {
        this._commentService.removeComment(this.token, this.tempCommentId).subscribe({
            next: (response) => {
                if (response.comment) {
                    this.tempCommentId = null;
                    this.getUserPublications(this.page);
                }
            },
            error: (error) => {
                console.error('Error deleting comment:', error);
            }
        });
    }
    
    viewMore() {
        this.page += 1;
        this.getUserPublications(this.page, true);
    
    }

    // Validador personalizado para limitar líneas
    maxLinesValidator(maxLines: number) {
        return (control: any) => {
            if (!control.value) return null;
            const lines = control.value.split('\n').length;
            return lines > maxLines ? { maxLines: { actualLines: lines, maxLines: maxLines } } : null;
        };
    }

    public focusPublication
    setFocusPublication(publicationId){
        this.focusPublication = publicationId;
    }


    onCommentSubmit(publicationId) {
        this.comment = new Comment(
            this.commentForm.value.text,
            this.identity._id
        );
    
        this._commentService.addComment(this.token, this.comment).subscribe({
            next: (response) => {
                if (response.comment && response.comment._id) {
                    this._publicationService.updatePublicationComments(this.token, publicationId, response.comment).subscribe({
                        next: (response) => {
                            if (response.publication && response.publication._id) {
                                this.getUserPublications(this.page);
                                this.commentForm.reset();
                            }
                        },
                        error: (error) => {
                            console.error('Error updating publication comments:', error);
                        }
                    });
                }
            },
            error: (error) => {
                console.error('Error submitting comment:', error);
            }
        });
    }
    

    // Sistema de likes y ordenamiento
    private sortOptions: {[publicationId: string]: string} = {}; // Almacena la opción de ordenamiento por publicación
    
    hasUserLikedPublication(publication: any): boolean {
        return publication.likes && publication.likes.includes(this.identity._id);
    }
    
    toggleLikePublication(publicationId: string) {
        this._publicationService.toggleLikePublication(this.token, publicationId)
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe({
                next: (response) => {
                    if (response.message) {
                        // Actualizar el estado local de la publicación
                        const publication = this.publications.find(p => p._id === publicationId);
                        if (publication) {
                            const isLiked = response.action === 'liked';
                            if (isLiked) {
                                // Agregar like
                                if (!publication.likes) publication.likes = [];
                                if (!publication.likes.includes(this.identity._id)) {
                                    publication.likes.push(this.identity._id);
                                    publication.likesCount = (publication.likesCount || 0) + 1;
                                }
                            } else {
                                // Quitar like
                                if (publication.likes) {
                                    publication.likes = publication.likes.filter(id => id !== this.identity._id);
                                    publication.likesCount = Math.max(0, (publication.likesCount || 0) - 1);
                                }
                            }
                        }
                    }
                },
                error: (error) => {
                    console.error('Error toggling publication like:', error);
                }
            });
    }
    
    getCommentsCount(comments: any[]): number {
        if (!comments) return 0;
        // Contar comentarios principales + respuestas
        let count = comments.length;
        comments.forEach(comment => {
            if (comment.replies && comment.replies.length > 0) {
                count += comment.replies.length;
            }
        });
        return count;
    }
    
    getSortOption(publicationId: string): string {
        return this.sortOptions[publicationId] || 'time';
    }
    
    setSortOption(publicationId: string, option: string) {
        this.sortOptions[publicationId] = option;
        this.sortComments(publicationId, option);
    }
    
    sortComments(publicationId: string, sortBy: string) {
        const publication = this.publications.find(p => p._id === publicationId);
        if (!publication || !publication.comments) return;
        
        publication.comments.sort((a: any, b: any) => {
            if (sortBy === 'likes') {
                return (b.likesCount || 0) - (a.likesCount || 0);
            } else {
                // Por defecto ordenar por tiempo (más reciente primero)
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
        });
    }
    
    getSortedComments(publication: any): any[] {
        if (!publication.comments) return [];
        
        const sortBy = this.getSortOption(publication._id);
        const sortedComments = [...publication.comments];
        
        sortedComments.sort((a: any, b: any) => {
            if (sortBy === 'likes') {
                return (b.likesCount || 0) - (a.likesCount || 0);
            } else {
                // Por defecto ordenar por tiempo (más reciente primero)
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
        });
        
        return sortedComments;
    }

    // Métodos para likes en comentarios
    hasUserLikedComment(comment: any): boolean {
        return comment.likes && comment.likes.includes(this.identity._id);
    }
    
    toggleLikeComment(commentId: string) {
        this._commentService.toggleLikeComment(this.token, commentId)
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe({
                next: (response) => {
                    if (response.message) {
                        // Actualizar el estado local del comentario
                        this.updateCommentLikeStatus(commentId, response.action === 'liked');
                    }
                },
                error: (error) => {
                    console.error('Error toggling comment like:', error);
                }
            });
    }

    private updateCommentLikeStatus(commentId: string, isLiked: boolean) {
        // Buscar el comentario en todas las publicaciones
        for (let publication of this.publications) {
            if (publication.comments) {
                // Buscar en comentarios principales
                const comment = publication.comments.find(c => c._id === commentId);
                if (comment) {
                    this.updateSingleCommentLike(comment, isLiked);
                    return;
                }
                
                // Buscar en respuestas anidadas
                for (let mainComment of publication.comments) {
                    if (mainComment.replies) {
                        const reply = mainComment.replies.find(r => r._id === commentId);
                        if (reply) {
                            this.updateSingleCommentLike(reply, isLiked);
                            return;
                        }
                    }
                }
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

    // Métodos para respuestas
    toggleReplyForm(commentId: string) {
        this.showReplyForm[commentId] = !this.showReplyForm[commentId];
        
        // Limpiar el formulario al abrir
        if (this.showReplyForm[commentId]) {
            this.replyForm.reset();
        }
    }

    cancelReply(commentId: string) {
        this.showReplyForm[commentId] = false;
        this.replyForm.reset();
    }

    onReplySubmit(publicationId: string, parentCommentId: string) {
        if (!this.replyForm.valid) return;

        const replyText = this.replyForm.get('replyText')?.value;
        const reply = {
            text: replyText,
            publication: publicationId
        };
        
        this._commentService.addReply(this.token, parentCommentId, reply)
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe({
                next: (response) => {
                    if (response.reply) {
                        // Encontrar el comentario padre y agregar la respuesta
                        const publication = this.publications.find(p => p._id === publicationId);
                        if (publication && publication.comments) {
                            const parentComment = publication.comments.find(c => c._id === parentCommentId);
                            if (parentComment) {
                                if (!parentComment.replies) {
                                    parentComment.replies = [];
                                }
                                parentComment.replies.push(response.reply);
                            }
                        }
                        
                        // Limpiar formulario y ocultar
                        this.replyForm.reset();
                        this.showReplyForm[parentCommentId] = false;
                    }
                },
                error: (error) => {
                    console.error('Error creating reply:', error);
                }
            });
    }

    newLines(text){
        let innerHtml = '';
        
        if(text){
            text.split('\n').forEach(paragraph => {
                innerHtml += `<p>${paragraph}</p>`
            });
        }

        return innerHtml;
    }

    // Método para hacer scroll a comentarios y activar formulario
    scrollToComments(publicationId: string) {
        // Activar el formulario de comentario para esta publicación
        this.setFocusPublication(publicationId);
        
        // Hacer scroll hacia el formulario de comentarios
        setTimeout(() => {
            const commentElement = document.querySelector(`#comments-form-${publicationId}`);
            if (commentElement) {
                commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Enfocar el textarea
                const textarea = commentElement.querySelector('textarea');
                if (textarea) {
                    textarea.focus();
                }
            }
        }, 100);
    }
}
