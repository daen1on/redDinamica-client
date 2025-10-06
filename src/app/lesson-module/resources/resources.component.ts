import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { LESSON_STATES, ICON_STYLE, MAX_FILE_SIZE } from 'src/app/services/DATA';
import { Validators, UntypedFormControl } from '@angular/forms';
import { LessonService } from 'src/app/services/lesson.service';

import { UserService } from 'src/app/services/user.service';
import { GLOBAL } from 'src/app/services/global';
import { UploadService } from 'src/app/services/upload.service';
import { LessonFile } from 'src/app/models/lesson-file.model';
import { Router, ActivatedRoute } from '@angular/router';

import { HttpEvent, HttpEventType } from '@angular/common/http';
import { HostListener } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
@Component({
    selector: 'resources',
    templateUrl: './resources.component.html',
    styleUrls: ['./resources.component.css'],
    standalone: false
})
export class ResourcesComponent implements OnInit {


    
    public title: string;
    public identity;
    public token;
    public url;

    public lesson_states = LESSON_STATES;
    public icon_style = ICON_STYLE;

    public name;
    public files;

    public submitted = false;
    public loading;
    public status;
    public errorMsg;
    public successMsg;
    public errorMsgEdit;
    public successMsgEdit;
    public warningMsg;
    public deletedMsg ;
    readonly warningMsgF = 'Se esta eliminando el grupo';
    public deletedMsgF = 'Se ha eliminado el archivo';
    public groups;

    public editMode = false;
    public selectedGroup;

    public parentUrl;

    @Input() lesson;
    @Output() added = new EventEmitter();

    public MAX_FILE_SIZE = MAX_FILE_SIZE;
    public maxSize = MAX_FILE_SIZE * 1024 * 1024;
    public maxSizeError = false;
    public barWidth: string = "0%";
    public unsaved = [];
    public addingNewGroup: boolean = false;
    public confirmLeaveMessage: string = '';
    constructor(
        private _userService: UserService,
        private _lessonService: LessonService,
        private _uploadService: UploadService,
        private _router: Router,
        private _route: ActivatedRoute
    ) {
        this.title = 'Recursos de la lección';
        this.identity = this._userService.getIdentity();
        this.token = this._userService.getToken();
        this.url = GLOBAL.url;
        this.groups = [];

        this.errorMsg = 'Hubo un error agregando el grupo. Intentalo de nuevo más tarde.';
        this.successMsg = 'Se ha creado el grupo de recursos correctamente.';
        this.errorMsgEdit = 'Hubo un error editando el grupo. Intentalo de nuevo más tarde.';
        this.successMsgEdit = 'Se ha editado el grupo de recursos correctamente.';
        this.warningMsg =  'Se estan subiendo los archivos, por favor espera y evita cerrar esta ventana.';
        this.deletedMsg= 'Se ha eliminado el grupo de recursos';
        
        this.name = new UntypedFormControl('', Validators.required);
        this.files = new UntypedFormControl('', Validators.required);
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
    }

    getGroups() {
        this.groups = [];

        if (this.lesson.files.length > 0) {
            this.lesson.files.forEach(file => {
                if (!this.groups.includes(file.groupTitle)) {
                    this.groups.push(file.groupTitle);
                }
            });
        }
    }

    restartValues(group) {
        this.selectedGroup = group;
        this.status = null;
        this.maxSizeError = false;
        this.submitted = false;
        if (this.editMode == true){
            this.lesson.files = this.unsaved; //user didn't save, so It will restart values
        }
        this.editMode = false;
        this.name.reset();
        this.files.reset();
        this.files.setValidators(Validators.required);
        this.getGroups();
        this.addingNewGroup = false;

    }

    startAddGroup(): void {
        this.restartValues(null);
        this.addingNewGroup = true;
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

    deleteFile(id){
        let tempfilesArray = [];
        this.lesson.files.forEach(file => {
            if(file._id != id){
                tempfilesArray.push(file);
            }
        });
        this.unsaved = this.lesson.files; //save temp in case they don't save
        this.lesson.files = tempfilesArray; 

       // this.editLesson(this.lesson,'deletedF'); no lo tiene que enviar todavía pq no se ha guardado, 

       // If no files remain, keep UI stable by focusing add group panel
       if (this.lesson.files.length === 0) {
           this.addingNewGroup = true;
       }
    }

    confirmDeleteFile(id, fileName?: string): void {
        const message = fileName
            ? `¿Deseas eliminar el archivo "${fileName}"? Los cambios se aplicarán al guardar.`
            : '¿Deseas eliminar este archivo? Los cambios se aplicarán al guardar.';
        if (window.confirm(message)) {
            this.deleteFile(id);
        }
    }

    getfiles(group) {
        let files = [];
        if (this.lesson.files.length > 0) {
            files = this.lesson.files.filter(file => {
                return file.groupTitle == group;
            });
        }

        return files;
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

    deleteGroup(group) {
        //erases a group
        let tempFilesArray = [];

        tempFilesArray = this.lesson.files.filter(file => {
            return file.groupTitle != group;
        }); 
        console.log(tempFilesArray);
        this.lesson.files = tempFilesArray;

        this.groups.splice(this.groups.indexOf(group), 1);

        // If no groups/files left, switch to add group panel for clarity
        if (this.lesson.files.length === 0) {
            this.addingNewGroup = true;
        }

        this.editLesson(this.lesson, 'deleted');
    }

    initEditGroup(event, group) {
        event.stopPropagation();

        this.editMode = true;
        this.name.setValue(group);

        this.files.clearValidators();
        this.files.updateValueAndValidity();
    }

    confirmDeleteGroup(event: Event, group: string): void {
        event.stopPropagation();
        const message = `¿Deseas eliminar  el grupo de recursos"${group}" y todos sus archivos?`;
        if (window.confirm(message)) {
            this.deleteGroup(group);
        }
    }

    public filesUploaded = [];
    onSubmit(group = null) {
        
        this.loading = true;
        /*if (this.editMode == true){
            this.editMode = false;
            this.selectedGroup = group; //revisar qué pasa cuando se quiere guardar archivos, necesitamos que se vea la barra de carga.

        }*/

       
        let tempFile;
        this.submitted = true;

        if (this.name.invalid || this.files.invalid || this.maxSizeError) {
            this.loading = false;
            return;
        }

        if (this.filesToUpload.length > 0) {
            
            for (let i = 0; i < this.filesToUpload.length; i++) {
                tempFile = new LessonFile();

                tempFile.groupTitle = this.name.value;
                tempFile.fileName = this.filesToUpload[i].name;
                tempFile.created_at = this.filesToUpload[i].lastModified / 1000;
                tempFile.mimetype = this.filesToUpload[i].type;

                this.filesUploaded.push(tempFile);
            }

        }

        
        this.lesson.files = this.lesson.files.concat(this.filesUploaded);
        this.filesUploaded = [];
        
        if (group != null) {
            
            if (group != this.name.value) {
                

                this.filesUploaded = this.lesson.files.map(file => {
                    if(file.groupTitle == group){
                        file.groupTitle = this.name.value;
                    }
                    return file;
                });
                
                this.lesson.files = this.filesUploaded;
                this.filesUploaded = [];
            }
        }
        
        this.editLesson(this.lesson, 'success', group);
        
    }
    
    editLesson(lesson, statusE = null, group=null) {
        if (statusE === 'deleted') {
            this.status = 'warningD'; //case when deleting group
        }
        if (statusE === 'success') {
            this.status = 'warning'; //case when uploading a resource
        }
    
        this._lessonService.editLesson(this.token, lesson).subscribe({
            next: (response) => {
                if (response.lesson && response.lesson._id) {
                    this.lesson = response.lesson;
                    // No limpiar el formulario aquí: si hay carga de archivos queremos
                    // mantener el nombre y los campos visibles junto con la barra de progreso
    
                    if (this.filesToUpload.length > 0) {
                        //Upload profile image
                        this._uploadService.makeFileRequest(
                            this.url + 'upload-lesson/' + this.lesson._id,
                            [],
                            this.filesToUpload,
                            this.token,
                            'files'
                        ).subscribe({
                            next: (event: HttpEvent<any>) => { // client call
                                switch (event.type) { //checks events
                                    case HttpEventType.UploadProgress: // If upload is in progress
                                        this.barWidth = Math.round(event.loaded / event.total * 100).toString() + '%'; // get upload percentage
                                        break;
                                    case HttpEventType.Response: // give final response
                                        console.log('User successfully added!', event.body);
                                        this.submitted = false;
                                        this.status = statusE;
                                        this.barWidth = '0%';
                                        this.files.reset();
                                        this.filesToUpload = [];
                                        if (!this.editMode) {
                                            this.name.reset();
                                        }
                                        this.loading = false;
                                        break;
                                }
                            },
                            error: (error) => {
                                this.status = 'error';
                                this.barWidth = '0%';
                                this.submitted = false;
                                console.log(<any>error);
                            }
                        });
                    }
    
                    // Si no hay archivos para subir, cerrar ciclo de guardado aquí
                    if (this.filesToUpload.length === 0) {
                        this.files.reset();
                        this.submitted = false;
                        this.getGroups();
                        this.loading = false;
                        this.status = statusE;
                        if (!this.editMode) {
                            this.name.reset();
                        }
                    }
    
                    if (this.editMode === true) {
                        this.editMode = false;
                        this.status = 'successE';
                        this.selectedGroup = group; //revisar qué pasa cuando se quiere guardar archivos, necesitamos que se vea la barra de carga.
                        this.loading = false;
                    }
    
                    if (statusE === 'deleted') {
                        this.status = 'deletedD';
                        this.loading = false;
                    }
                } else {
                    this.status = 'error';
                    this.loading = false;
                }
            },
            error: (error) => {
                this.status = 'error';
                this.loading = false;
                console.error('Error updating lesson resources:', error);
                
                // Manejo específico de errores
                if (error.status === 500) {
                    this.errorMsg = 'Error interno del servidor. Por favor, verifica que todos los archivos sean válidos.';
                } else if (error.status === 400) {
                    this.errorMsg = error.error?.message || 'Datos inválidos. Por favor, revisa los archivos seleccionados.';
                } else if (error.status === 404) {
                    this.errorMsg = 'La lección no fue encontrada.';
                } else {
                    this.errorMsg = error.error?.message || 'Hubo un error agregando los recursos. Inténtalo de nuevo más tarde.';
                }
            }
        });
    
        this.submitted = false;
    }
    
    
    // Aviso nativo del navegador si se intenta cerrar/recargar con una carga en progreso
    @HostListener('window:beforeunload', ['$event'])
    handleBeforeUnload(event: BeforeUnloadEvent): void {
        const hasPendingUpload = this.loading || this.barWidth !== '0%';
        const hasUnsaved = (this.name?.value && this.name.value !== '') || (this.filesToUpload && this.filesToUpload.length > 0) || this.editMode || this.submitted;
        if (hasPendingUpload || hasUnsaved) {
            event.preventDefault();
            event.returnValue = '';
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

        return response;
    }

    onChanges(){
        this.name.valueChanges.subscribe({
            next: val => {
                if (val) {
                    this.status = null;
                    this.submitted = false;
                }
            }
        });
        
    }

    // Modal programático de confirmación al intentar salir
    openConfirmLeave(message: string): Promise<boolean> {
        this.confirmLeaveMessage = message;
        return new Promise<boolean>((resolve) => {
            // Espera a que Angular pinte el modal en el DOM
            setTimeout(() => {
                try {
                    const modalEl = document.getElementById('confirmLeaveModal');
                    if (!modalEl) {
                        // Fallback
                        const confirmed = window.confirm(message);
                        resolve(confirmed);
                        return;
                    }

                    let instance = (window as any).bootstrap?.Modal?.getInstance(modalEl);
                    if (!instance) {
                        instance = new (window as any).bootstrap.Modal(modalEl, {
                            backdrop: 'static',
                            keyboard: false
                        });
                    }

                    const confirmBtn = modalEl.querySelector('[data-confirm]') as HTMLElement | null;
                    const cancelBtn = modalEl.querySelector('[data-cancel]') as HTMLElement | null;

                    const cleanup = () => {
                        confirmBtn?.removeEventListener('click', onConfirm);
                        cancelBtn?.removeEventListener('click', onCancel);
                        modalEl.removeEventListener('hidden.bs.modal', onCancel as any);
                    };

                    const onConfirm = () => {
                        cleanup();
                        resolve(true);
                        instance.hide();
                    };
                    const onCancel = () => {
                        cleanup();
                        resolve(false);
                    };

                    confirmBtn?.addEventListener('click', onConfirm);
                    cancelBtn?.addEventListener('click', onCancel);
                    // Si el usuario cierra el modal con la X
                    modalEl.addEventListener('hidden.bs.modal', onCancel as any);

                    instance.show();
                } catch (error) {
                    console.error('Error al abrir modal de confirmación de salida:', error);
                    const confirmed = window.confirm(message);
                    resolve(confirmed);
                }
            }, 0);
        });
    }

    // Intercepta clic en pestaña de grupo
    handleTabClick(event: Event, group: string): void {
        const uploadInProgress = this.loading || this.barWidth !== '0%';
        const hasDraft = (this.name?.value && this.name.value !== '') || (this.filesToUpload && this.filesToUpload.length > 0) || this.editMode || this.submitted;
        if (uploadInProgress || hasDraft) {
            event.preventDefault();
            event.stopPropagation();
            const message = uploadInProgress
                ? 'Hay una carga de archivos en progreso. Si cambias de pestaña se cancelará. ¿Deseas continuar?'
                : 'Tienes cambios sin guardar. ¿Deseas descartar y continuar?';
            this.openConfirmLeave(message).then(confirmed => {
                if (confirmed) {
                    this.restartValues(group);
                }
            });
            return;
        }
        this.restartValues(group);
    }

    // Intercepta clic en pestaña "Agregar grupo"
    handleAddGroupTabClick(event: Event): void {
        const uploadInProgress = this.loading || this.barWidth !== '0%';
        const hasDraft = (this.name?.value && this.name.value !== '') || (this.filesToUpload && this.filesToUpload.length > 0) || this.editMode || this.submitted;
        if (uploadInProgress || hasDraft) {
            event.preventDefault();
            event.stopPropagation();
            const message = uploadInProgress
                ? 'Hay una carga de archivos en progreso. Si cambias de pestaña se cancelará. ¿Deseas continuar?'
                : 'Tienes cambios sin guardar. ¿Deseas descartar y continuar?';
            this.openConfirmLeave(message).then(confirmed => {
                if (confirmed) {
                    // Restaurar el estado previo si había ediciones sin guardar
                    if (this.editMode) {
                        this.lesson.files = this.unsaved;
                        this.editMode = false;
                    }
                    this.startAddGroup();
                }
            });
            return;
        }
        this.startAddGroup();
    }

}
