import { Component, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormControl, Validators } from '@angular/forms';
import { FIELDS_SEND_FORM } from '../lessonsData';

import { UserService } from 'src/app/services/user.service';


import { GLOBAL } from 'src/app/services/global';
import { Lesson } from 'src/app/models/lesson.model';
import { LessonService } from 'src/app/services/lesson.service';
import { BasicDataService } from 'src/app/services/basicData.service';
import { KnowledgeArea } from 'src/app/models/knowledge-area.model';


@Component({
    selector: 'send-experience',
    templateUrl: './send-experience.component.html',
    standalone: false
})
export class SendExperienceComponent implements OnInit {
    public title;
    public identity;
    public token;
    public url;

    public fields;
    public sendForm;

    public status;
    public submitted;
    public loading= false;

    public errorMsg;
    public successMsg;

    public lesson;

    public items = {
        areas: []
    };

    public allAreas;

    constructor(
        private _userService: UserService,
        private _lessonService: LessonService,
        private _bDService: BasicDataService
    ) {
        this.title = 'Enviar experiencia';
        this.identity = this._userService.getIdentity();
        this.token = this._userService.getToken();
        this.url = GLOBAL.url;

        this.fields = FIELDS_SEND_FORM;

        this.errorMsg = 'Hubo un error al enviar la experiencia. Intentalo de nuevo más tarde.';
        this.successMsg = 'Se ha enviado la experiencia correctamente. Gracias por tu participación.';

        this.sendForm = new UntypedFormGroup({
            title: new UntypedFormControl('', Validators.required),
            resume: new UntypedFormControl('', Validators.required),
            references: new UntypedFormControl('', Validators.required),
            level: new UntypedFormControl('', Validators.required),
            type: new UntypedFormControl('', Validators.required),
            areas: new UntypedFormControl('', Validators.required)
        });
    }

    ngOnInit(): void {
        this.getAllAreas();
    }

    get f() { return this.sendForm.controls; }

    restartValues() {
        this.status = null;
        this.submitted = false;
    }

    async onSubmit() {
        let tempArray = [];
        this.loading = true;

        this.submitted = true;
        
        if (this.sendForm.invalid) {
            this.loading = false;
            return;
        }
        
        this.lesson = new Lesson();
        
        this.lesson.title = this.sendForm.value.title;
        this.lesson.resume = this.sendForm.value.resume;
        this.lesson.references = this.sendForm.value.references;
        this.lesson.development_level = this.sendForm.value.level;
        this.lesson.type = this.sendForm.value.type;
        this.lesson.accepted = false;
        this.lesson.knowledge_area = [];
        this.lesson.author = this.identity._id;
        this.lesson.class = 'experience';
               
        this.sendForm.value.areas.forEach(element => {
            tempArray.push(element._id);
        });

        this.lesson.knowledge_area = tempArray;

        let responseAddLesson = await this._lessonService.addLesson(this.token, this.lesson)
            .toPromise()
            .catch((error) => {
                this.status = 'error';
                this.loading = false;
                console.log(<any>error);
            });


        if (responseAddLesson.lesson && responseAddLesson.lesson._id) {
            this.sendForm.reset();
            this.status = 'success';
            this.loading = false;
           
        } else {
            this.status = 'error';
            this.loading = false;
            console.log(<any>responseAddLesson);
        }

        this.submitted = false;
        document.querySelector('div#modal-body').scrollTop = 0;
    }



    getAllAreas() {
        this.allAreas = JSON.parse(localStorage.getItem('areas'));

        if (!this.allAreas) {

            this._bDService.getAllKnowledgeAreas().subscribe(
                response => {
                    if (response.areas) {
                        this.allAreas = response.areas;
                        this.items.areas = this.allAreas;
                        localStorage.setItem('areas', JSON.stringify(this.allAreas));
                    }
                }, error => {
                    console.log(<any>error);
                });
        } else {
            this.items.areas = this.allAreas;
        }
    }

    onChanges(): void {

        this.sendForm.valueChanges.subscribe(val => {
            if (val) {
                this.status = null;
                this.submitted = false;

            }
        });


    }
}
