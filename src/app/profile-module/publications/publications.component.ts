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
    templateUrl: './publications.component.html'
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
            textPost: new UntypedFormControl(''),
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
    

    newLines(text){
        let innerHtml = '';
        
        if(text){
            text.split('\n').forEach(paragraph => {
                innerHtml += `<p>${paragraph}</p>`
            });
        }

        return innerHtml;
    }
}
