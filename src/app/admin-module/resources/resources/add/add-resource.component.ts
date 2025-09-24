import { Component, OnInit, AfterViewInit, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';

import { Validators, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { Resource } from 'src/app/models/resource.model';
import { UserService } from 'src/app/services/user.service';
import { ResourceService } from 'src/app/services/resource.service';
import { FIELDS_FORM } from '../resourcesData';
import { GLOBAL } from 'src/app/services/global';
import { UploadService } from 'src/app/services/upload.service';
import { CachedSource } from 'webpack-sources';
import { MAX_FILE_SIZE } from 'src/app/services/DATA';
import { HttpErrorResponse, HttpEvent, HttpEventType } from '@angular/common/http';
import { Subscription } from 'rxjs/internal/Subscription';
import { concatMap, catchError } from 'rxjs/operators';
import { finalize, switchMap } from 'rxjs/operators';

import { of } from 'rxjs';
@Component({
    selector: 'add-resource',
    templateUrl: './add-resource.component.html',
    standalone: false
})

export class AddResourceComponent implements OnInit, AfterViewInit {
    public title;
    public identity;
    public token;
    public url;
    
    public subscriptionResource$: Subscription; //data loading
    public subscriptionFile$: Subscription; //data loading
    public subscriptionDisable; //setdisable

    public fields;
    public addForm;

    public status;
    public submitted;
    public loading;
    
   
    public errorMsg;
    public warningMsg;  
    public  successMsg ;
    public deletedMsg;
    
    public resource;
    public MAX_FILE_SIZE = MAX_FILE_SIZE;
    public maxSize = MAX_FILE_SIZE * 1024 * 1024;
    public maxSizeError = false;
    public barWidth = '0%';
    
    private resourceId = '';
    @ViewChild('closeBtn', { static: false }) closeBtn: ElementRef;

    @Output() added = new EventEmitter();

    constructor(
        private _userService: UserService,
        private _resourceService: ResourceService,
        private _uploadService: UploadService,
    ) {
        this.title = 'Agregar recurso';
        this.identity = this._userService.getIdentity();
        this.token = this._userService.getToken();
        this.url = GLOBAL.url;

        this.fields = FIELDS_FORM;

        this.errorMsg = 'Hubo un error agregando el nuevo recurso. Intentalo de nuevo más tarde.';
        this.warningMsg= 'Se estan subiendo los archivos, por favor evita cerrar la ventana. '; 
        this.successMsg = 'Se ha guardado el nuevo recurso correctamente. Si deseas, puedes enviar otro recurso';
        this.deletedMsg ="Se ha cancelado correctamente el recurso. Puedes volver a enviar un recurso";
        this.addForm = new UntypedFormGroup({
            name: new UntypedFormControl('', Validators.required),
            type: new UntypedFormControl('', Validators.required),
            description: new UntypedFormControl('', Validators.required),
            source: new UntypedFormControl('', Validators.required),
            file: new UntypedFormControl('', Validators.required),
            url: new UntypedFormControl('', Validators.required)
        });



    }

    ngOnInit(): void {
        // Inicialización del componente
    }

    ngAfterViewInit(): void {
        // Acceder a elementos del DOM después de que la vista esté inicializada
        if (this.closeBtn && this.closeBtn.nativeElement) {
            // Solo hacer click si es necesario
            // this.closeBtn.nativeElement.click();
        }
    }

    get f() { return this.addForm.controls; }

    restartValues() {
        this.status = null;
        if (this.loading ==true){
            this.cancelResource();

            
        }
        this.addForm.reset();
        this.disableForm(false);
        this.submitted = false;
        this.maxSizeError = false;
        this.barWidth = '0%';
        if (this.loading == false || this.loading == null) {
            console.log(this.closeBtn);
            if (this.closeBtn && this.closeBtn.nativeElement) {
                this.closeBtn.nativeElement.click();
            }
        }
    }
    getValue(){
        //gets R.Id if cancelling is needed
        return this.resourceId;
    }
    setResId(resourceId){
        this.resourceId = resourceId;
    }
    ngOnDestroy() {
        if (this.subscriptionResource$) {
            this.subscriptionResource$.unsubscribe();
        }
        if (this.subscriptionFile$) {
            this.subscriptionFile$.unsubscribe();
        }
    }
    cancelResource() {
        console.log("Cancelling resource...");
        this.warningMsg = 'Se está cancelando el recurso';
        this.status = 'warning';
        
        of(this.subscriptionFile$, this.subscriptionResource$) // Wrap subscriptions in an observable
            .pipe(
                concatMap(subscription => {
                    // Ensure previous subscriptions are cancelled before proceeding
                    if (subscription) subscription.unsubscribe();
                    return this._resourceService.deleteResource(this.token, this.getValue());
                }),
                catchError((error: any) => {
                    // Handle errors here
                    console.error(error);
                    this.errorMsg = "Hubo un error, por favor comunícate con el Administrador";
                    this.status = 'error';
                    this.loading = false;
                    return of(error); // Return an observable with the error to keep the chain alive
                })
            )
            .subscribe(response => {
                if (response && response.resource) {
                    console.log("Resource deleted:", response);
                    this.status = 'deleted';
                    this.warningMsg = 'Recurso cancelado con éxito.';
                    this.errorMsg = 'Hubo un error al enviar el recurso. Inténtalo de nuevo más tarde.';
                    this.loading = false;
                }
            });
    }



    disableForm(command:Boolean):void{
        if(command == true){
        this.addForm.controls.name.disable();
        this.addForm.controls.type.disable();
        this.addForm.controls.description.disable();
        this.addForm.controls.source.disable();
        this.addForm.controls.file.disable();
        }    
        else{
            
        this.addForm.controls.name.enable();
        this.addForm.controls.type.enable();
        this.addForm.controls.description.enable();
        this.addForm.controls.source.enable();
        this.addForm.controls.file.enable();

        }
        
    }

    setDisabled() {
        this.addForm.get('type').valueChanges.subscribe(
            value => {
                if (['video', 'document', 'software'].includes(value)) {
                    this.addForm.controls.url.disable();
                    this.addForm.controls.url.setValue('');
                    this.addForm.controls.file.enable();
                } else {
                    this.addForm.controls.url.enable();
                    this.addForm.controls.file.setValue('');
                    this.filesToUpload = null;
                    this.addForm.controls.file.disable();
                }
            }
        );
    }

    public filesToUpload: Array<File>;
    fileChangeEvent(fileInput: any) {

        this.filesToUpload = <Array<File>>fileInput.target.files;
        
        if (this.maxSize < fileInput.target.files[0].size) {
            this.maxSizeError = true;
            return;
        }

        this.maxSizeError = false;

    }
    onSubmit() {
        this.submitted = true;
        this.loading = true;
        if (this.addForm.invalid || this.maxSizeError) {
            this.loading = false;
            return;
        }
    
        this.resource = new Resource(
            this.addForm.value.name,
            this.addForm.value.type,
            this.addForm.value.source,
            this.addForm.value.description,
            this.identity._id);
    
        if (this.addForm.value.url) {
            this.resource.url = this.addForm.value.url;
        }
    
        this.resource.accepted = true;
    
        this._resourceService.addResource(this.token, this.resource)
            .pipe(
                switchMap(response => {
                    if (!response.resource || !response.resource._id) {
                        throw new Error('Failed to create resource');
                    }
                    this.setResId(response.resource._id);
                    if (!this.filesToUpload || this.filesToUpload.length === 0) {
                        return of(response); // Immediately complete if no files to upload
                    }
                    return this._uploadService.makeFileRequest(
                        this.url + 'upload-resource/' + response.resource._id,
                        [],
                        this.filesToUpload,
                        this.token,
                        'file'
                    );
                }),
                finalize(() => {
                    this.loading = false;
                    this.submitted = false;
                    this.addForm.reset();
                    this.status = 'success';
                }),
                catchError((error: any) => {
                    console.error(error);
                    this.status = 'error';
                    return of(error); // Handle error and continue
                })
            )
            .subscribe(event => {
                if (event.type === HttpEventType.UploadProgress) {
                    this.status = 'warning';
                    this.barWidth = Math.round(event.loaded / event.total * 100).toString() + '%';
                } else if (event.type === HttpEventType.Response) {
                    this.added.emit();
                }
            });
    }
    

    onChanges(): void {
        if (this.loading ==false){
            console.log("changes");
            this.status = null;
            this.addForm.valueChanges.subscribe(val =>{
                if(val){
                    this.status = null;
                    this.barWidth ='0%';
                    this.submitted = false;
                }
            });
        }
    }
}
