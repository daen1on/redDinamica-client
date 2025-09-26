import { Component, OnInit, AfterViewInit, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { UserService } from 'src/app/services/user.service';
import { ResourceService } from 'src/app/services/resource.service';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { GLOBAL } from 'src/app/services/global';
import { CommentService } from 'src/app/services/comment.service';
import { Comment } from 'src/app/models/comment.model';

@Component({
    selector: 'rating-resource',
    templateUrl: './rating-resource.component.html',
    styleUrls: ['./rating-resource.component.css'],
    standalone: false
})
export class RatingResourceComponent implements OnInit, AfterViewInit, OnDestroy {
    public title: string;
    public identity;
    public token;
    public url;

    @Input() resource;
    @Output() rated = new EventEmitter();

    public comment;
    public ratingForm: FormGroup;

    public errorMsg: string;
    public successMsg: string;

    public status: string | null;
    public submitted = false;

    constructor(
        private _userService: UserService,
        private _resourceService: ResourceService,
        private _commentService: CommentService
    ) {
        this.title = 'Calificar recurso';
        this.url = GLOBAL.url;
        this.identity = this._userService.getIdentity();
        this.token = this._userService.getToken();

        this.errorMsg = 'Hubo un error al guardar la calificación del recurso. Intentalo de nuevo más tarde.';
        this.successMsg = 'Se ha enviado la calificación correctamente. Muchas gracias por participar.';

        this.ratingForm = new FormGroup({
            rating: new FormControl('', Validators.required),
            text: new FormControl('')
        });
    }

    private modalEventListeners: (() => void)[] = [];

    ngOnInit(): void { }

    ngAfterViewInit(): void {
        this.setupModalEvents();
    }

    ngOnDestroy(): void {
        // Limpiar event listeners
        this.modalEventListeners.forEach(cleanup => cleanup());
    }

    setupModalEvents() {
        const modal = document.getElementById('rating');
        if (modal) {
            // Función para manejar cuando el modal se oculta completamente
            const onHidden = () => {
                // Reiniciar el formulario cuando se cierra el modal
                this.restartValues();
            };

            // Agregar solo el event listener necesario
            modal.addEventListener('hidden.bs.modal', onHidden);

            // Guardar función de limpieza
            this.modalEventListeners.push(
                () => modal.removeEventListener('hidden.bs.modal', onHidden)
            );
        }
    }

    restartValues() {
        this.status = null;
        this.submitted = false;
        this.ratingForm.reset();
        // Emitir evento solo si no se está cerrando desde el event listener
        if (!this.isClosingFromEvent) {
            this.rated.emit();
        }
    }

    private isClosingFromEvent = false;

    closeModal() {
        try {
            const modal = document.getElementById('rating');
            if (modal) {
                const bootstrapModal = (window as any).bootstrap?.Modal?.getInstance(modal);
                if (bootstrapModal) {
                    this.isClosingFromEvent = true;
                    bootstrapModal.hide();
                    setTimeout(() => {
                        this.isClosingFromEvent = false;
                    }, 300);
                } else {
                    // Si no hay instancia, usar el método de Bootstrap directamente
                    this.isClosingFromEvent = true;
                    (window as any).bootstrap?.Modal?.getOrCreateInstance(modal)?.hide();
                    setTimeout(() => {
                        this.isClosingFromEvent = false;
                    }, 300);
                }
            }
        } catch (error) {
            console.log('Error al cerrar modal de rating:', error);
            this.isClosingFromEvent = false;
        }
    }

    async onSubmit() {
        this.submitted = true;

        if (this.ratingForm.invalid) {
            return;
        }

        this.comment = new Comment(
            this.ratingForm.value.text,
            this.identity._id
        );

        this.comment.score = this.ratingForm.value.rating;

        try {
            const response = await this._commentService.addComment(this.token, this.comment).toPromise();
            if (response && response.comment._id) {
                if (this.resource.score == 0) {
                    this.resource.score += response.comment.score;
                } else {
                    this.resource.score += response.comment.score;
                    this.resource.score /= 2;
                }

                this.resource.comments.push(response.comment._id);

                this._resourceService.editResource(this.token, this.resource).subscribe({
                    next: res => {
                        if (res && res.resource._id) {
                            this.status = "success";
                            // Cerrar modal después de éxito
                            setTimeout(() => {
                                this.closeModal();
                            }, 2000);
                        }
                    },
                    error: err => {
                        this.status = 'error';
                        console.error(err);
                    }
                });
            } else {
                this.status = 'error';
            }
        } catch (error) {
            this.status = 'error';
            console.error(error);
        }
        this.submitted = false;
    }
}
