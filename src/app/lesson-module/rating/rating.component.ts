import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { UserService } from 'src/app/services/user.service';
import { LessonService } from 'src/app/services/lesson.service';

import { UntypedFormGroup, UntypedFormControl, Validators } from '@angular/forms';
import { GLOBAL } from 'src/app/services/global';
import { CommentService } from 'src/app/services/comment.service';
import { Comment } from 'src/app/models/comment.model'
import { LESSON_STATES } from 'src/app/services/DATA';


@Component({
    selector: 'rating',
    templateUrl: './rating.component.html',
    styleUrls: ['./rating.component.css'],
    standalone: false
})
export class RatingComponent implements OnInit, OnDestroy {
    public title: string;
    public identity;
    public token;
    public url;

    public lesson_states = LESSON_STATES;
    
    @Input() lesson;
    public lessonOld;
    
    public comment;

    public ratingForm;
    private formSubscription: any;

    public errorMsg;
    public successMsg;
    public userAlreadyCommentedMsg;

    public status; 
    public submitted = false;

    constructor(
        private _userService: UserService,
        private _lessonService: LessonService,
        private _commentService: CommentService,

    ) {
        this.title = 'Calificaciones y comentarios';
        this.url = GLOBAL.url;
        this.identity = this._userService.getIdentity();
        this.token = this._userService.getToken();

        this.userAlreadyCommentedMsg = 'No es posible calificar la misma lección más de una vez.';
        this.errorMsg = 'Hubo un error al guardar la calificación de la lección. Intentalo de nuevo más tarde.';
        this.successMsg = 'Se ha enviado la calificación correctamente. Muchas gracias por participar.';

        this.ratingForm = new UntypedFormGroup({
            rating: new UntypedFormControl('', Validators.required),
            text: new UntypedFormControl('')
        });

    }

    ngOnChanges(){
        this.restartValues();
    }


    ngOnInit(): void {
        // Suscribir una sola vez a los cambios del formulario
        this.formSubscription = this.ratingForm.valueChanges.subscribe(val => {
            if (val) {
                this.status = null;
                this.submitted = false;
                this.userAlreadyCommented = null;
            }
        });
    }

    ngOnDestroy(): void {
        if (this.formSubscription) {
            this.formSubscription.unsubscribe();
        }
    }


    restartValues() {
        this.status = null;
        this.submitted = false;
        this.userAlreadyCommented = null;
    }

    public userAlreadyCommented = null;
    async onSubmit() {   
        this.restartValues();    

        // Validar si el usuario ya comentó (lista poblada)
        this.userAlreadyCommented = Array.isArray(this.lesson?.comments) ? this.lesson.comments.find(
            (comment) => comment && comment.user && (this.identity._id == comment.user._id)
        ) : null;

        this.submitted = true;

        if (this.userAlreadyCommented || this.ratingForm.invalid) {
            return;
        }

        this.comment = new Comment(
            this.ratingForm.value.text,
            this.identity._id
        );

        this.comment.score = Number(this.ratingForm.value.rating);


        let response = await this._commentService.addComment(this.token, this.comment)
            .toPromise().catch(error => {
                this.status = 'error';
                console.log(<any>error);
            });



        if (response && response.comment._id) {            

            // Calcular promedio correctamente en base al número de comentarios actuales
            const totalRatingsBefore = Array.isArray(this.lesson.comments) ? this.lesson.comments.length : 0;
            const currentTotal = (Number(this.lesson.score) || 0) * totalRatingsBefore;
            const newAverage = (currentTotal + Number(response.comment.score)) / (totalRatingsBefore + 1);
            this.lesson.score = newAverage;

            // Agregar el nuevo comentario por ID a la lección
            if (!Array.isArray(this.lesson.comments)) {
                this.lesson.comments = [];
            }
            this.lesson.comments.push(response.comment._id);

            this._lessonService.editLesson(this.token, this.lesson).subscribe(
                response => {
                    if (response && response.lesson && response.lesson._id) {                        
                        this.status = "success";
                        // La API devuelve la lección con comentarios poblados
                        this.lesson = response.lesson;
                        this.ratingForm.reset();
                    }
                },
                error => {
                    this.status = 'error';
                    console.log(<any>error);
                }
            )

        } else {
            this.status = 'error';
        }

        this.submitted = false;

    }

    onChanges(): void {

        this.ratingForm.valueChanges.subscribe(val => {
            if (val) {
                this.status = null;
                this.submitted = false;
                this.userAlreadyCommented = null;
            }
        });

    }
}
