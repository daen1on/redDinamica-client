import { Component, OnInit, Input, Output, EventEmitter, HostListener, OnDestroy } from '@angular/core';
import { LESSON_STATES, ICON_STYLE, MAX_FILE_SIZE } from 'src/app/services/DATA';
import { UserService } from 'src/app/services/user.service';
import { LessonService } from 'src/app/services/lesson.service';
import { UploadService } from 'src/app/services/upload.service';
import { GLOBAL } from 'src/app/services/GLOBAL';
import { Validators, UntypedFormControl } from '@angular/forms';
import { LessonFile } from 'src/app/models/lesson-file.model';
import { LessonMessage } from 'src/app/models/lesson-message.model';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'review',
    templateUrl: './review.component.html',
    styleUrls: ['./review.component.css'],
    standalone: false
})
export class ReviewComponent implements OnInit, OnDestroy {
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
    // Edición de mensajes
    public editingMessage: any = null;
    public editingText = new UntypedFormControl('');
    // Polling
    private pollingHandle: any = null;

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
        this._route.parent?.url.subscribe(segments => {
            const first = (segments && segments.length > 0) ? segments[0] : null;
            this.parentUrl = (first && first.path)
                || this._route.parent?.snapshot?.routeConfig?.path?.split('/')?.[0]
                || '';
        });
        this.startPolling();
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

        tempMessage.created_at = new Date();
        tempMessage.file = tempFile;

        // Usar el nuevo endpoint addExpertComment que envía notificaciones automáticamente
        this._lessonService.addExpertComment(this.token, this.lesson._id, {
            text: this.message.value,
            conversationTitle: tempMessage.conversationTitle,
            file: tempFile || null
        }).subscribe({
            next: (response) => {
                if (response && response.lesson && response.lesson._id) {
                    this.lesson = response.lesson;
                    this.status = 'success';
                    this.submitted = false;
                    this.name.reset();
                    this.files.reset();
                    this.message.reset();
                    this.getGroups();
                    this.disableForm(false);
                } else {
                    this.status = 'error';
                    this.submitted = false;
                    this.disableForm(false);
                }
            },
            error: () => {
                this.status = 'error';
                this.submitted = false;
                this.disableForm(false);
            }
        });

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

    // ===== Helpers de edición de mensajes =====
    canEditMessage(message: any): boolean {
        const isOwner = message?.author && (message.author._id === this.identity._id);
        const isAdmin = this.parentUrl === 'admin';
        return !!(isOwner || isAdmin);
    }

    startEditMessage(message: any): void {
        if (!this.canEditMessage(message)) return;
        this.editingMessage = message;
        this.editingText.setValue(message.text || '');
    }

    cancelEditMessage(): void {
        this.editingMessage = null;
        this.editingText.reset('');
    }

    saveEditMessage(): void {
        if (!this.editingMessage) return;
        const newText = (this.editingText.value || '').toString().trim();
        if (!newText) return;
        // Para expert_comments, reutilizamos endpoint de edición con scope
        const messageId = this.editingMessage._id;
        this._lessonService.editLessonMessage(this.token, this.lesson._id, messageId, { text: newText, scope: 'expert_comments' }).subscribe({
            next: (response) => {
                if (response?.lesson?._id) {
                    this.lesson = response.lesson;
                    this.getGroups();
                }
                this.editingMessage = null;
                this.editingText.reset('');
            },
            error: () => {
                this.editingMessage = null;
                this.editingText.reset('');
            }
        });
    }

    deleteMessage(message: any): void {
        if (!this.canEditMessage(message)) return;
        const idx = this.lesson.expert_comments.findIndex((m: any) => m === message);
        if (idx >= 0) {
            this.lesson.expert_comments.splice(idx, 1);
            this.editLesson(this.lesson);
        }
    }

    // ===== Polling para refresco en tiempo real =====
    private startPolling(): void {
        if (this.pollingHandle) return;
        this.pollingHandle = setInterval(() => {
            if (this.submitted || this.editingMessage) return;
            if (!this.lesson?._id) return;
            this._lessonService.getLesson(this.token, this.lesson._id).subscribe({
                next: (response) => {
                    if (response?.lesson?._id) {
                        this.lesson = response.lesson;
                        this.getGroups();
                    }
                },
                error: () => {}
            });
        }, 10000);
    }

    ngOnDestroy(): void {
        if (this.pollingHandle) {
            clearInterval(this.pollingHandle);
            this.pollingHandle = null;
        }
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