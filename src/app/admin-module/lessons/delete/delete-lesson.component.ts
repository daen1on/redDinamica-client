import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

import { UserService } from 'src/app/services/user.service';
import { LessonService } from 'src/app/services/lesson.service';

import { GLOBAL } from 'src/app/services/GLOBAL';



@Component({
    selector: 'delete-lesson',
    templateUrl: './delete-lesson.component.html',
    standalone: false
})
export class DeleteLessonComponent implements OnInit {
    public title;
    public message;
    public identity;
    public token;
    public url;

    public lesson;

    @Input() lessonId = '';
    @Input() parent;
    @Output() deleted = new EventEmitter();


    constructor(
        private _userService: UserService,
        private _lessonService: LessonService
        
    ) {
        this.identity = this._userService.getIdentity();
        this.token = this._userService.getToken();
        this.url = GLOBAL.url;
    }

    ngOnInit(): void {
        if(this.parent == 'experiences'){
            this.message = '¿Esta seguro que desea eliminar la experiencia?';
            this.title = 'Eliminar experiencia';
        }else if(this.parent == 'proposed-lesson'){
            this.message = '¿Esta seguro que desea eliminar la propuesta para lección?';
            this.title = 'Eliminar propuesta';
        }else{
            this.message = '¿Esta seguro que desea eliminar la lección?';
            this.title = 'Eliminar lección';
        }
    }

    delete(){
        this._lessonService.deleteLesson(this.token, this.lessonId).subscribe(
            response => {
                if(response && response.lesson){
                    this.deleted.emit();                    
                }
            },
            error =>{
                console.log(<any>error);
            }
        )
    }
}
