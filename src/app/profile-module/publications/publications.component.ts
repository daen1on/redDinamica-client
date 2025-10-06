import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { User } from '../../models/user.model';
import { Publication } from '../../models/publication.model';
import { UserService } from '../../services/user.service';
import { PublicationService } from '../../services/publication.service';
import { UploadService } from '../../services/upload.service';
import { GLOBAL } from '../../services/global';
import { MAX_FILE_SIZE } from '../../services/DATA';
import { PublicationCardComponent } from '../../shared/publication-card/publication-card.component';

@Component({
    selector: 'app-publications',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, PublicationCardComponent],
    templateUrl: './publications.component.html'
})
export class PublicationsComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('publicationsContainer') publicationsContainer?: ElementRef;
    
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

    // Formularios de comentarios - eliminados porque ahora se manejan en publication-card
    barWidth: string = "0%";
    private unsubscribe$: Subject<void> = new Subject<void>();

    constructor(
        private _userService: UserService,
        private _publicationService: PublicationService,
        private _uploadService: UploadService,
        private _route: ActivatedRoute,
        private _router: Router
    ) {
        this.title = 'Publicaciones';
        this.identity = this._userService.getIdentity();
        this.token = this._userService.getToken();
        this.url = GLOBAL.url;
        this.page = 1;
        this.itemsPerPage = 5;
        this.publication = new Publication('', this.identity._id);
        this.filesToUpload = []; // Inicializar como array vacío
        
        const formBuilder = new UntypedFormBuilder();
        this.postForm = formBuilder.group({
            textPost: ['', [Validators.required, this.maxLinesValidator(10)]],
            filePost: ['']
        });
    }

    get f() { return this.postForm.controls; }
    
    ngOnInit() {
        // Suscribirse a cambios en los parámetros de ruta para recargar cuando cambie el perfil
        this._route.parent?.params.pipe(takeUntil(this.unsubscribe$)).subscribe(params => {
            const userId = params['id'];
            if (userId) {
                // Resetear paginación antes de cargar nuevos datos
                this.resetPagination();
                
                this.loadUserData(userId);
            }
        });
    }

    ngOnDestroy() {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    ngAfterViewInit(): void {
        // Solo hacer scroll automático si viene del botón "Volver a publicaciones"
        this._route.queryParams.pipe(takeUntil(this.unsubscribe$)).subscribe(params => {
            if (params['scrollTo'] === 'top') {
                setTimeout(() => {
                    // Intenta hacer scroll hacia el contenedor con #publicationsContainer
                    const container = this.publicationsContainer?.nativeElement;
                    if (container) {
                        container.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'start' 
                        });
                    } else {
                        // Si no existe el contenedor, buscar por ID como respaldo
                        const element = document.getElementById('publicationsContainer');
                        if (element) {
                            element.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'start' 
                            });
                        }
                    }
                    // Limpiar el query parameter después del scroll
                    this._router.navigate([], {
                        relativeTo: this._route,
                        queryParams: {},
                        replaceUrl: true
                    });
                }, 300);
            }
        });
    }

    loadUserData(userId: string) {
        this.getUser(userId);
    }

    onChanges(): void {
        this.postForm.valueChanges.subscribe(val => {
            if (val.textPost && val.textPost.length > 0) {
                this.formError = false;
            }
        });
    }

    getUser(userId) {
        this._userService.getUser(userId).pipe(takeUntil(this.unsubscribe$)).subscribe(
            response => {
                if (response.user) {
                    this.ownProfile = response.user;
                    // Llamar getUserPublications después de obtener el usuario
                    this.getUserPublications(this.page);
                } else {
                    this.status = 'error';
                }
            },
            error => {
                console.log(<any>error);
                this._router.navigate(['/home']);
            }
        );
    }

    getUserPublications(page: number, add: boolean = false) {
        this._publicationService.getUserPublications(this.token, this.ownProfile._id, page, 10, 5).pipe(takeUntil(this.unsubscribe$)).subscribe(
            response => {
                if (response.publications) {
                    this.total = response.totalItems;
                    this.pages = response.totalPages;
                    this.itemsPerPage = response.itemsPerPage;
                    
                    // Detectar si no hay más publicaciones que cargar
                    this.noMore = (this.page >= this.pages) || 
                                  (response.publications.length === 0) ||
                                  (this.page > 1 && response.publications.length < this.itemsPerPage);
                    
                    if (!add) {
                        this.publications = response.publications;
                    } else {
                        // Solo agregar si hay publicaciones nuevas
                        if (response.publications.length > 0) {
                            this.publications = this.publications.concat(response.publications);
                        }
                    }
                    
                    if (page > this.pages) {
                        this._router.navigate(['/home']);
                    }
                    
                    // Log para debugging
                    console.log(`User publications - Page ${this.page}/${this.pages}, Publications: ${response.publications.length}, NoMore: ${this.noMore}`);
                } else {
                    this.status = 'error';
                    this.noMore = true; // En caso de error, evitar solicitudes adicionales
                }
            },
            error => {
                var errorMessage = <any>error;
                console.log(errorMessage);
                if (errorMessage != null) {
                    this.status = 'error';
                    this.noMore = true; // En caso de error, evitar solicitudes adicionales
                }
            }
        );
    }

    setUpload() {
        // No deshabilitar el botón al seleccionar archivo
        // this.submitted = true;
    }

    public filesToUpload: Array<File> = [];
    fileChangeEvent(fileInput: any) {
        this.filesToUpload = <Array<File>>fileInput.target.files;
        // Reset de errores al cambiar archivo
        this.formError = false;
        this.typeError = false;
        this.maxSizeError = false;

        // Validar tipos de archivo permitidos
        if (this.filesToUpload && this.filesToUpload.length > 0) {
            for (let file of this.filesToUpload) {
                if (!this.isValidFileType(file)) {
                    this.typeError = true;
                    this.filesToUpload = []; // Limpiar archivos no válidos
                    // Limpiar el input file
                    fileInput.target.value = '';
                    return;
                }
            }
        }
    }

    public formError = false;
    public typeError = false;
    onSubmit() {
        this.submitted = true;
        this.formError = false;
        this.typeError = false;
        this.maxSizeError = false;

        const text = this.postForm.value.textPost;
        const hasFiles = this.filesToUpload && this.filesToUpload.length > 0;

        // Validar que haya contenido de texto o archivos
        if (!text || text.trim().length === 0) {
            if (!hasFiles) {
                this.formError = true;
                this.submitted = false;
                return;
            }
        }

        // Validar archivos si existen
        if (hasFiles) {
            for (let file of this.filesToUpload) {
                // Validar tipo de archivo
                if (!this.isValidFileType(file)) {
                    this.typeError = true;
                    this.submitted = false;
                    return;
                }
                // Validar tamaño de archivo
                if (file.size > this.maxSize) {
                    this.maxSizeError = true;
                    this.submitted = false;
                    return;
                }
            }
        }

        // Crear publicación
        this.publication = new Publication(text || '', this.identity._id);
        this.savePublication();
    }

    private savePublication() {
        this._publicationService.addPost(this.token, this.publication).pipe(takeUntil(this.unsubscribe$)).subscribe(
            response => {
                if (response.publication) {
                    const publicationId = response.publication._id;
                    
                    // Si hay archivos, subirlos después de crear la publicación
                    if (this.filesToUpload && this.filesToUpload.length > 0) {
                        this.uploadFiles(publicationId);
                    } else {
                        this.onPublicationSuccess();
                    }
                } else {
                    this.status = 'error';
                    this.submitted = false;
                }
            },
            error => {
                console.error('Error saving publication:', error);
                this.status = 'error';
                this.submitted = false;
            }
        );
    }

    private uploadFiles(publicationId: string) {
        this._uploadService.makeFileRequest(
            this.url + 'upload-file-post/' + publicationId, 
            [], 
            this.filesToUpload, 
            this.token, 
            'image'
        ).subscribe(
            result => {
                this.onPublicationSuccess();
            }, 
            error => {
                console.error('Error uploading file:', error);
                this.status = 'error';
                this.submitted = false;
            }
        );
    }

    private onPublicationSuccess() {
        this.postForm.reset();
        this.getUserPublications(1);
        this.status = 'success';
        this.filesToUpload = [];
        this.submitted = false;
    }

    public tempPublicationId;    
    setDelete(publicationId) {
        this.tempPublicationId = publicationId;
        // Abrir modal de confirmación local
        const modalElement = document.getElementById('delete');
        if (modalElement) {
            const modal = new (window as any).bootstrap.Modal(modalElement);
            modal.show();
        }
    }

    deletePost() {
        this._publicationService.removePost(this.token, this.tempPublicationId).pipe(takeUntil(this.unsubscribe$)).subscribe(
            response => {
                // Remover publicación localmente para feedback inmediato
                const index = this.publications.findIndex((p: any) => p && (p._id === (response?.publication?._id || this.tempPublicationId)));
                if (index !== -1) {
                    this.publications.splice(index, 1);
                } else {
                    // Fallback: recargar si no se encuentra
                    this.getUserPublications(1);
                }
                this.tempPublicationId = null;
            },
            error => {
                console.log(<any>error);
            }
        );
    }

    setErrorMessage(message: string) {
        // Método para manejar mensajes de error del publication-card
        console.error('Error from publication-card:', message);
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
        
        this.getUserPublications(this.page, true);
    }

    maxLinesValidator(maxLines: number) {
        return (control: any) => {
            const value = control.value;
            if (value && value.split('\n').length > maxLines) {
                return { maxLines: { actualLines: value.split('\n').length } };
            }
            return null;
        };
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

    // Método para resetear paginación (útil al cambiar de usuario)
    public resetPagination(): void {
        this.page = 1;
        this.noMore = false;
        this.publications = [];
        this.total = 0;
        this.pages = 0;
    }

    // Método para validar tipos de archivo permitidos
    private isValidFileType(file: File): boolean {
        const allowedTypes = [
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/gif'
        ];
        
        // Validar por MIME type
        if (!allowedTypes.includes(file.type.toLowerCase())) {
            return false;
        }
        
        // Validar por extensión como medida adicional de seguridad
        const fileName = file.name.toLowerCase();
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
        const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
        
        return hasValidExtension;
    }
}
