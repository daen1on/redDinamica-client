import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { LESSON_STATES, ICON_STYLE, MAX_FILE_SIZE } from 'src/app/services/DATA';
import { UserService } from 'src/app/services/user.service';
import { LessonService } from 'src/app/services/lesson.service';
import { UploadService } from 'src/app/services/upload.service';
import { GLOBAL } from 'src/app/services/GLOBAL';
import { Validators, UntypedFormControl } from '@angular/forms';
import { LessonFile } from 'src/app/models/lesson-file.model';
import { LessonMessage } from 'src/app/models/lesson-message.model';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpEvent, HttpEventType } from '@angular/common/http';

@Component({
    selector: 'conversation',
    templateUrl: './conversation.component.html',
    styleUrls: ['./conversation.component.css'],
    standalone: false
})
export class ConversationComponent implements OnInit, OnDestroy {
    public title: string;
    public identity;
    public token;
    public url;
    public barWidth: string = "0%";
    public lesson_states = LESSON_STATES;
    public icon_style = ICON_STYLE;

    public name;
    public message;
    public files;

    public submitted = false;
    public status;
    public errorMsg;
    public successMsg;
    public warningMsg;
    public groups;
    readonly deletedMsg = 'Se ha eliminado la conversación';
    public selectedGroup;
    public parentUrl;
   
    @Input() lesson;
    @Output() added = new EventEmitter();

    public MAX_FILE_SIZE = MAX_FILE_SIZE;
    public maxSize = MAX_FILE_SIZE * 1024 * 1024;
    public maxSizeError = false;
    public loading = false;
    // Edición de mensajes
    public editingMessage: any = null;
    public editingText = new UntypedFormControl('');
    // Polling
    private pollingHandle: any = null;

    constructor(
        private _userService: UserService,
        private _lessonService: LessonService,
        private _uploadService: UploadService,
        private _router: Router,
        private _route: ActivatedRoute
    ) {
        this.title = 'Conversación';
        this.identity = this._userService.getIdentity();
        this.token = this._userService.getToken();
        this.url = GLOBAL.url;
        this.groups = [];

        this.errorMsg = 'Hubo un error agregando la conversación. Intentalo de nuevo más tarde.';
        this.successMsg = 'Se ha creado la conversación correctamente.';
        this.warningMsg =  'Se estan subiendo los archivos, por favor espera mientras finaliza y evita cerrar esta ventana.';
        
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
        // Iniciar polling de la lección para refresco en tiempo real
        this.startPolling();
    }
    
  
    getGroups() {
        this.groups = [];

        if (this.lesson.conversations.length > 0) {
            this.lesson.conversations.forEach(message => {
                if (!this.groups.includes(message.conversationTitle)) {
                    this.groups.push(message.conversationTitle);
                }
            });
        }

    }


    restartValues(group) {

        this.selectedGroup = group;
        this.status = null;
        this.maxSizeError = false;
        this.submitted = false;
        this.filesToUpload = [];
        this.getGroups();

    }
    //pensar como traer los mensajes una vez se envian o una vez llegan 
    //probar a crear un nuevo servicio que traiga los mensajes 
    ngDoCheck(){
        // Evitar recálculo constante si no hay grupo seleccionado
        if (this.selectedGroup) {
            this.getMessages(this.selectedGroup);
        }
    }

    
    showResources(){
        let response;
        if(this.lesson.leader && this.lesson.leader._id == this.identity._id
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
    getMessages(group) {
        let messages = [];

        if (this.lesson.conversations.length > 0) {
            messages = this.lesson.conversations.filter(message => {
                return message.conversationTitle == group;
            });
        }
        return messages;
    }

    removeSpaces(text) {
        return text.replace(/[\s\(\).,!"#$%&\/='¡¿áéíóú:0123456789a]/g, '');
    }

    public index;
    getIndex(index){
        this.index =index;
        //console.log(this.index)

    }
    eliminar(){
        //console.log("eliminar",index);
        
        //console.log(this.index)
        this.lesson.conversations.splice(this.index,1);
        //console.log("eliminar",this.lesson.conversations);

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
        this.disableForm(this.submitted);
        tempMessage = new LessonMessage(this.message.value);
         // Check if your form controls have validation errors
        if (this.name.invalid || this.files.invalid || this.message.invalid || this.maxSizeError) {
            // Handle validation errors, e.g., display error messages to the user
             return;
        }
        if(group){
            tempMessage.conversationTitle = group;
            this.name.setValue('dummy');
        }else{
            tempMessage.conversationTitle = this.name.value;            
        }        

        if (this.filesToUpload.length > 0) {

            tempFile = new LessonFile();

            tempFile.fileName = this.filesToUpload[0].name;
            tempFile.created_at = this.filesToUpload[0].lastModified / 1000;
            tempFile.mimetype = this.filesToUpload[0].type;

        }

        tempMessage.created_at = new Date();
        tempMessage.file = tempFile;
        // Enviar vía endpoint específico para evitar condiciones de carrera
        this._lessonService.addLessonMessage(this.token, this.lesson._id, {
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

    disableForm(command:Boolean):void{
        if(command == true){
        this.name.disable();
        this.message.disable();
        this.files.disable();
        
        }    
        else{
            
        this.name.enable();
        this.message.enable();
        this.files.enable();
        }
        
    }

    editLesson(lesson) {
        // Mostrar loading mientras se persiste el cambio
        this.loading = true;

        this._lessonService.editLesson(this.token, lesson).subscribe({
            next: response => {
                if (response.lesson && response.lesson._id) {
                    this.lesson = response.lesson;
                    if (this.filesToUpload.length === 0){
                        this.status = 'success';
                        this.submitted = false;
                        this.name.reset();
                        this.files.reset();
                        this.message.reset();
                        this.getGroups();
                        this.disableForm(false);
                        this.loading = false;
                    }
                    
                    else{ 
                        if (this.filesToUpload.length > 0) {
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
                            this.name.reset();
                            this.files.reset();
                            this.message.reset();
                            this.getGroups();
                            this.status ='success';
                            this.barWidth ='0%';
                            this.loading = false;
                            }
                        }, error=>{

                             
                            this.status = 'error';
                            this.barWidth ='0%';
                            this.submitted = false;
                            this.loading = false;
                            console.log(<any>error);

                        });
                        }
                        else{
                            
                            this.status = 'error';
                            this.submitted =false;
                            this.loading = false;
                        }

                    }
                } else {
                    this.status = 'error';
                    this.submitted = false;
                    this.loading = false;
                    this.errorMsg = 'Error al actualizar la lección. Respuesta inválida del servidor.';
                }
            },
            error: error => {
                this.status = 'error';
                this.submitted = false;
                this.loading = false;
                console.error('Error updating lesson conversation:', error);
                
                // Manejo específico de errores
                if (error.status === 500) {
                    this.errorMsg = 'Error interno del servidor. Por favor, verifica que todos los campos estén correctamente completados.';
                } else if (error.status === 400) {
                    this.errorMsg = error.error?.message || 'Datos inválidos. Por favor, revisa los campos del formulario.';
                } else if (error.status === 404) {
                    this.errorMsg = 'La lección no fue encontrada.';
                } else {
                    this.errorMsg = error.error?.message || 'Hubo un error creando la conversación. Inténtalo de nuevo más tarde.';
                }
            }
        });

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

    saveEditMessage(group: string): void {
        if (!this.editingMessage) return;
        const newText = (this.editingText.value || '').toString().trim();
        if (!newText) return;

        const messageId = this.editingMessage._id;
        this._lessonService.editLessonMessage(this.token, this.lesson._id, messageId, { text: newText, scope: 'conversations' }).subscribe({
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
        const idx = this.lesson.conversations.findIndex((m: any) => m === message);
        if (idx >= 0) {
            this.lesson.conversations.splice(idx, 1);
            this.editLesson(this.lesson);
        }
    }

    // ===== Polling para refresco en tiempo real =====
    private startPolling(): void {
        if (this.pollingHandle) return;
        // Poll cada 10s si no estamos enviando ni editando
        this.pollingHandle = setInterval(() => {
            if (this.submitted || this.loading || this.editingMessage) return;
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
}
