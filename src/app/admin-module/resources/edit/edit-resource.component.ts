import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

import { Validators, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { Resource } from 'src/app/models/resource.model';
import { UserService } from 'src/app/services/user.service';
import { ResourceService } from 'src/app/services/resource.service';

import { GLOBAL } from 'src/app/services/GLOBAL';
import { UploadService } from 'src/app/services/upload.service';
import { FIELDS_FORM } from '../resources/resourcesData';
import { MAX_FILE_SIZE } from 'src/app/services/DATA';
import { HttpEvent, HttpEventType } from '@angular/common/http';

@Component({
    selector: 'edit-resource',
    templateUrl: './edit-resource.component.html',
    standalone: false
})
export class EditResourceComponent implements OnInit {
    
    
    public loading = false; //set spiner off or on
    public title;
    public identity;
    public token;
    public url;
    
    public fields;
    public editForm;

    public status;
    public submitted;

    public errorMsg;
    public successMsg;
    public warningMsg;  
    public prevResource = new Resource('', '', '', '', '');
    @Input() resource = new Resource('', '', '', '', '');

    @Output() edited = new EventEmitter();

    public MAX_FILE_SIZE = MAX_FILE_SIZE;
    public maxSize = MAX_FILE_SIZE * 1024 * 1024;
    public maxSizeError = false;
    public barWidth = '0%';

    constructor(
        private _userService: UserService,
        private _resourceService: ResourceService,
        private _uploadService: UploadService,
    ) {
        this.title = 'Editar recurso';
        this.identity = this._userService.getIdentity();
        this.token = this._userService.getToken();
        this.url = GLOBAL.url;

        this.fields = FIELDS_FORM;

        this.errorMsg = 'Hubo un error al editar el recurso. Intentalo de nuevo más tarde.';
        this.successMsg = 'Se ha editado el recurso correctamente. También puedes editar nuevamente el recurso';
        this.warningMsg= 'Se estan subiendo los archivos, por favor evita cerrar la ventana. '; 
        this.editForm = new UntypedFormGroup({
            name: new UntypedFormControl('', Validators.required),
            type: new UntypedFormControl('', Validators.required),
            description: new UntypedFormControl('', Validators.required),
            source: new UntypedFormControl('', Validators.required),
            file: new UntypedFormControl(''),
            url: new UntypedFormControl('', Validators.required)
        });

        this.editForm.controls.type.disable();
    }

    ngOnInit(): void {
        this.editForm.patchValue({
            name: this.resource.name,
            type: this.resource.type,
            description: this.resource.description,
            source: this.resource.source,
            url: this.resource.url
        });
       

    }

    ngDoCheck(): void {
        if (this.prevResource._id != this.resource._id) {
            this.editForm.patchValue({
                name: this.resource.name,
                type: this.resource.type,
                description: this.resource.description,
                source: this.resource.source,
                url: this.resource.url
            });

            if (['video', 'document', 'software'].includes(this.resource.type)) {
                this.editForm.controls.url.disable();
                this.editForm.controls.url.setValue('');
                this.editForm.controls.file.enable();
            } else {
                this.editForm.controls.url.enable();
                this.editForm.controls.file.setValue('');
                this.filesToUpload = null;
                this.editForm.controls.file.disable();
            }


            this.prevResource = this.resource;
        }
    }

    get f() { return this.editForm.controls; }

    restartValues() {
        this.status = null;
        this.submitted = false;
        
        this.edited.emit();
        this.editForm.controls.file.reset();
    }
   
    disableForm(command:Boolean):void{
        if(command == true){
        this.editForm.controls.name.disable();
        this.editForm.controls.type.disable();
        this.editForm.controls.description.disable();
        this.editForm.controls.source.disable();
        this.editForm.controls.file.disable();
        }    
        else{
            
        this.editForm.controls.name.enable();
        this.editForm.controls.type.enable();
        this.editForm.controls.description.enable();
        this.editForm.controls.source.enable();
        this.editForm.controls.file.enable();

        }
        
    }
    setDisabled() {
        this.editForm.get('type').valueChanges.subscribe(
            value => {
                if (['video', 'document', 'software'].includes(value)) {
                    this.editForm.controls.url.disable();
                    this.editForm.controls.url.setValue('');
                    this.editForm.controls.file.enable();
                } else {
                    this.editForm.controls.url.enable();
                    this.editForm.controls.file.setValue('');
                    this.filesToUpload = null;
                    this.editForm.controls.file.disable();
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
        this.status = 'warning';
        if (this.editForm.invalid) {
            return;
        }

        if (this.editForm.value.url) {
            this.resource.url = this.editForm.value.url;
        }

        this.resource.name = this.editForm.value.name;
        this.resource.description = this.editForm.value.description;
        this.resource.source = this.editForm.value.source;

        this._resourceService.editResource(this.token, this.resource).subscribe(
            response => {
                if (response.resource && response.resource._id) {

                    this.resource = response.resource;
                    if (!this.filesToUpload){
                      
                        this.status = 'success';
                        this.loading = false;
                    }

                    else{ 
                        if (this.filesToUpload && this.filesToUpload.length > 0) {

                            this.disableForm(true);
                            // Upload post image
                            this._uploadService.makeFileRequest(
                                this.url + 'upload-resource/' + response.resource._id,
                                [],
                                this.filesToUpload,
                                this.token,
                                'file'
                            ).subscribe((event: HttpEvent<any>) => { // client call
                                switch(event.type) { //checks events
                                case HttpEventType.UploadProgress: // If upload is in progress
                                this.status = 'warning';
                                this.barWidth = Math.round(event.loaded / event.total * 100).toString()+'%'; // get upload percentage
                                break;
                                case HttpEventType.Response: // give final response
                                console.log('User successfully added!', event.body);
                                
                                this.disableForm(false);
                                this.resource = event.body.resource;
                                this.barWidth ='0%';
                                this.loading = false
                                this.status ='success';
                            
                                }
                                
                            }, error=>{

                             
                                this.status = 'error';
                                this.barWidth ='0%';
                                this.loading = false;
                                console.log(<any>error);
   
                            });

                        }
                        else {
                            this.status = 'error';
                            this.barWidth ='0%';
                            this.loading = false;
                        }
                    }

                    

                } else {
                    this.status = 'error';
                    this.barWidth ='0%';
                    this.loading = false;
                }
            },
            error => {
                this.status = 'error';
                this.barWidth ='0%';
                this.loading = false;
                console.log(<any>error);
            }
        );
        document.querySelector('.modal-body').scrollTop = 0;

        this.submitted = false;

    }

    onChanges(): void {
        if (this.loading ==false){
            console.log("changes");
            this.status = null;
            this.editForm.valueChanges.subscribe(val =>{
                if(val){
                    this.status = null;
                    this.barWidth ='0%';
                    this.submitted = false;
                }
            });
        }
    }


}
