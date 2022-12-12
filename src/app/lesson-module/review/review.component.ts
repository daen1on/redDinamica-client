import { Component, OnInit, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { LESSON_STATES, ICON_STYLE, MAX_FILE_SIZE } from 'src/app/services/DATA';
import { UserService } from 'src/app/services/user.service';
import { LessonService } from 'src/app/services/lesson.service';
import { UploadService } from 'src/app/services/upload.service';
import { GLOBAL } from 'src/app/services/global';
import { Validators, UntypedFormControl } from '@angular/forms';
import { LessonFile } from 'src/app/models/lesson-file.model';
import { LessonMessage } from 'src/app/models/lesson-message.model';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'review',
    templateUrl: './review.component.html',
    styleUrls: ['./review.component.css']

})
export class ReviewComponent implements OnInit {
    public title: string;
    public identity;
    public token;
    public url;

    public lesson_states = LESSON_STATES;
    public icon_style = ICON_STYLE;

    public name;
    public message;
    public files;
    public barWidth: string = "0%";
    public submitted = false;
    public status;
    public errorMsg;
    public successMsg;
    public warningMsg;



    public groups;

    public selectedGroup;

    @Input() lesson;
    @Output() added = new EventEmitter();

    public MAX_FILE_SIZE = MAX_FILE_SIZE;
    public maxSize = MAX_FILE_SIZE * 1024 * 1024;
    public maxSizeError = false;
    public parentUrl;
    readonly deletedMsg = 'Se ha eliminado la conversación';

    constructor(
        private _userService: UserService,
        private _lessonService: LessonService,
        private _uploadService: UploadService,
        private _route: ActivatedRoute
    ) {
        this.title = 'Comentarios facilitador';
        this.identity = this._userService.getIdentity();
        this.token = this._userService.getToken();
        this.url = GLOBAL.url;
        this.groups = [];

        this.errorMsg = 'Hubo un error. Intentalo de nuevo más tarde.';
        this.successMsg = 'Se ha creado la conversación del Facilitador correctamente.';
        this.warningMsg =   'Se estan subiendo los archivos, por favor espera y evita cerrar esta ventana.';
        
        this.name = new UntypedFormControl('', Validators.required);
        this.message = new UntypedFormControl('', Validators.required);
        this.files = new UntypedFormControl('');

    }

    ngOnInit(): void {
        this.getGroups();
        this.selectedGroup = this.groups[0];
        this._route.parent.url.subscribe(value => {
            this.parentUrl = value[0].path;
        });
    }

    disableForm(command:Boolean):void{
        if(command == true){
        this.name.disable();
        this.files.disable();
        
        }    
        else{
            
        this.name.enable();
        this.files.enable();
        }
        
    }
    getGroups() {
        this.groups = [];

        if (this.lesson.expert_comments.length > 0) {
            this.lesson.expert_comments.forEach(message => {
                if (!this.groups.includes(message.conversationTitle)) {
                    this.groups.push(message.conversationTitle);
                }
            });
        }

    }


    
    public index;
    getIndex(index){
        //get index that will be eliminated.
        this.index =index;
        //console.log(this.index)

    }
    eliminar(){
        //console.log("eliminar",index);
        
        //console.log(this.index)
        this.lesson.expert_comments.splice(this.index,1);
        // eliminates current comment.

        //send edited version of the lesson.
        this._lessonService.editLesson(this.token, this.lesson).subscribe(
            response => {

                if (response.lesson && response.lesson._id) {
                    this.lesson = response.lesson;
                    this.getGroups();
                    this.selectedGroup = this.groups[0];
                    this.status = 'deleted';
                   



                }

            },error =>{

                if (error!=null){
                    this.status = 'error';
                    console.log(<any>error);
                }
                else{
                    this.status = 'error';
                }
            });     
    }


    restartValues(group) {

        this.selectedGroup = group;
        this.status = null;
        this.maxSizeError = false;
        this.submitted = false;
        this.filesToUpload = [];
        this.getGroups();

    }

    getMessages(group) {
        let messages = [];

        if (this.lesson.expert_comments.length > 0) {
            messages = this.lesson.expert_comments.filter(message => {
                return message.conversationTitle == group;
            });
        }
        return messages;
    }

    removeSpaces(text) {
        return text.replace(/[\s\(\).,!"#$%&\/='¡¿áéíóú:0123456789a]/g, '');
    }

    public filesToUpload = [];
    fileChangeEvent(fileInput: any) {
        this.filesToUpload = <Array<File>>fileInput.target.files;

        if (this.filesToUpload.length > 0) {
            for (let i = 0; i < this.filesToUpload.length; i++) {
                if (this.maxSize < this.filesToUpload[i].size) {
                    this.maxSizeError = true;
                    return;
                } else {
                    this.maxSizeError = false;
                }
            }
        }
    }

    onSubmit(group = null) {
        let tempFile, tempMessage;
        this.submitted = true;
        this.disableForm(true);
        tempMessage = new LessonMessage(this.message.value);

        if (group) {
            tempMessage.conversationTitle = group;
            this.name.setValue('dummy');
        } else {
            tempMessage.conversationTitle = this.name.value;
        }

        if (this.name.invalid || this.files.invalid || this.message.invalid || this.maxSizeError) {
            return;
        }


        if (this.filesToUpload.length > 0) {

            tempFile = new LessonFile();

            tempFile.fileName = this.filesToUpload[0].name;
            tempFile.created_at = this.filesToUpload[0].lastModified / 1000;
            tempFile.mimetype = this.filesToUpload[0].type;

        }

        tempMessage.created_at = Math.floor(Date.now() / 1000);
        tempMessage.file = tempFile;
        tempMessage.author = this.identity._id;

        this.lesson.expert_comments = this.lesson.expert_comments.concat(tempMessage);

        this.editLesson(this.lesson);

    }

    showResources(){
        let response;
        if(this.lesson.expert && this.lesson.expert._id == this.identity._id
            && ['proposed', 'assigned', 'development', 'test'].includes(this.lesson.state)){
            response = true;
        }else{
            response = false;
            if(this.parentUrl == 'admin'){
                response = true;
            }
        }
        //console.log(response);
        return response;
    }
    editLesson(lesson) {
        this._lessonService.editLesson(this.token, lesson).subscribe(
            response => {

                if (response.lesson && response.lesson._id) {
                    if (this.filesToUpload.length == 0){

                    
                    this.lesson = response.lesson;
                    this.status = 'success';
                    this.submitted = false;
                    this.name.reset();
                    this.files.reset();
                    this.message.reset();
                    this.getGroups();
                    this.disableForm(false);

                    }
                    else  if (this.filesToUpload.length > 0) {
                        //Upload profile imaage
                        this._uploadService.makeFileRequest(
                            this.url + 'upload-lesson/' + this.lesson._id,
                            [],
                            this.filesToUpload,
                            this.token,
                            'files'
                        ).subscribe((event: HttpEvent<any>) => { // client call
                            switch(event.type) { //checks events
                            case HttpEventType.UploadProgress: // If upload is in progress
                            this.status = 'warning';
                            this.barWidth = Math.round(event.loaded / event.total * 100).toString()+'%'; // get upload percentage
                            break;
                            case HttpEventType.Response: // give final response
                            console.log('User successfully added!', event.body);
                            this.submitted = false;
                            this.disableForm(false);
                            this.lesson = response.lesson;
                            this.status = 'success';
                            
                            this.name.reset();
                            this.files.reset();
                            this.message.reset();
                            this.getGroups();
                            this.status ='success';
                            this.barWidth ='0%';
                            }
                        }, error=>{

                             
                            this.status = 'error';
                            this.barWidth ='0%';
                            this.submitted = false;
                            this.disableForm(false);
                            console.log(<any>error);

                        });
                        }


                } else { 
                    //no response or no id.
                    this.status = 'error';
                    this.submitted =false;
                    this.barWidth ='0%';

                }
            },
            error => {
                //no response-other error
                if (error != null) {
                    this.status = 'error';
                    this.submitted =false;
                    console.log(<any>error);
                }
            }
        );

    }

    @HostListener('window:beforeunload')
    canDeactivate(): Observable<boolean> | boolean {
    // insert logic to check if there are pending changes here;
    // returning true will navigate without confirmation
    // returning false will show a confirm dialog before navigating away
        if ( this.name.value !='' || this.files.length > 0 ){
            console.log("falseName or file: ",this.name.value);
            return false;
        }
        else  if (this.submitted == true){
            console.log("edit ");
            return false;

        }
        else{
            return true;
        }
    }
    
}