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
        this._publicationService.getPublications(this.token, page).pipe(
            catchError(error => {
                console.error(error);
                this.loading = false;
                // Return an observable of null so the stream remains intact
                return of(null);
            }),
            takeUntil(this.unsubscribe$)
        ).subscribe({
            next: (response: any) => {
                if (response && response.publications) {
                    this.total = response.total;
                    this.pages = response.pages;
                    this.itemsPerPage = response.itemsPerPage;
                    this.noMore = this.page >= this.pages;
    
                    if (!add) {
                        this.publications = response.publications;
                    } else {
                        this.publications = this.publications.concat(response.publications);
                    }
    
                    if (page > this.pages && this.pages > 0) {
                        this._router.navigate(['/inicio/post', 1]);
                    }
                }
                this.loading = false;
            },
            error: (error) => console.error(error)
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
                this.tempPublicationId = null;
                this.getPublications(this.page);
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
                this.tempCommentId = null;
                this.getPublications(this.page);
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

    viewMore() {
        this.page += 1;

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
}
