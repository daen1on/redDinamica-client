import { Component, OnInit, Input, Output } from '@angular/core';
import { Validators, FormControl, FormGroup } from '@angular/forms';

import { UserService } from 'src/app/services/user.service';

import { GLOBAL } from 'src/app/services/global';
import { Lesson } from 'src/app/models/lesson.model';
import { LessonService } from 'src/app/services/lesson.service';
import { EventEmitter } from '@angular/core';
import { BasicDataService } from 'src/app/services/basicData.service';

@Component({
    selector: 'suggest-lesson',
    templateUrl: './suggest-lesson.component.html'

})
export class SuggestLessonComponent implements OnInit {
    public title;
    public identity;
    public token;
    public url;

    public fields;
    public addForm;

    public status;
    public submitted;
    //public check;

    public errorMsg;
    public successMsg;

    public lesson;

    //@Input() areas;
    
    @Output() added = new EventEmitter();

    constructor(
        private _userService: UserService,
        private _lessonService: LessonService,
        private _bDService: BasicDataService
    ) {
        this.title = 'Agregar';
        this.identity = this._userService.getIdentity();
        this.token = this._userService.getToken();
        this.url = GLOBAL.url;

        this.fields = [
            {
                id: "title",
                label: "Título",
                type: "text",
                attr: "title",
                required: true
            },
            {
                id: "resume",
                label: "Resumen",
                type: "textarea",
                attr: "resume",
                required: true
            },
            {
                id: "justification",
                label: "Justificación",
                type: "textarea",
                attr: "justification",
                required: true
            },
            {
                id: "references",
                label: "Referencias",
                type: "textarea",
                attr: "references",
                required: false
            }

        ];

        this.errorMsg = 'Hubo un error al agregar el tema para una lección. Intentalo de nuevo más tarde.';
        this.successMsg = 'Se ha agregado el tema para la nueva lección correctamente.';

        this.addForm = new FormGroup({
            title: new FormControl('', Validators.required),
            resume: new FormControl('', Validators.required),
            justification: new FormControl('', Validators.required),
            //areas: new FormControl('', Validators.required),
            //level: new FormControl('', Validators.required),
            references: new FormControl('')
            });
    }

    ngOnInit(): void {
       /* this.addForm.patchValue({
            areas: this.lesson.knowledge_area
        });*/
    }
    /*ngDoCheck(): void {

        if (this.check && this.lesson._id) {

            this.addForm.patchValue({
                areas: this.lesson.knowledge_area,
                title: '',
                resume:'',
                justification:'',
                references:'',
                level: ''
                
            });

            this.check = false;
        }

    }*/

    get f() { return this.addForm.controls; }

    restartValues() {
        this.status = null;
        this.submitted = false;
       // this.check = true;
    }

    onSubmit() {
        
        //let tempArray = []; //array de areas de conocimiento
        this.submitted = true;

        if (this.addForm.invalid) {
            return;
        }
        
        this.addForm.value.areas.forEach(element => {
          //  tempArray.push(element._id);
        });

        this.lesson = new Lesson();
        
        this.lesson.title = this.addForm.value.title;
        this.lesson.resume = this.addForm.value.resume;
        this.lesson.references = this.addForm.value.references;
        this.lesson.accepted = true;
        this.lesson.author = this.identity._id;

        //this.lesson.knowledge_area = tempArray;
        this.lesson.level = this.addForm.value.level;
        
        this.lesson.state = 'proposed';
        

        this._lessonService.addLesson(this.token, this.lesson).subscribe(
            response => {
                if (response.lesson && response.lesson._id) {
                    this.addForm.reset();
                    this.status = 'success';
                    this.added.emit();

                } else {
                    this.status = 'error';
                    console.log(<any>response);
                }



            },
            error => {
                this.status = 'error';
                console.log(<any>error);
            }
        );
        this.submitted = false;

        document.querySelector('.modal-body').scrollTop = 0;

    }

    onChanges(): void {

        this.addForm.valueChanges.subscribe(val => {
            if (val) {
                this.status = null;
                this.submitted = false;
            }
        });
    }
}
