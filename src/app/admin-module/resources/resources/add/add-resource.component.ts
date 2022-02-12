import { Component, OnInit, Output, EventEmitter } from '@angular/core';

import { Validators, FormControl, FormGroup } from '@angular/forms';
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

@Component({
    selector: 'add-resource',
    templateUrl: './add-resource.component.html'

})
export class AddResourceComponent implements OnInit {
    public closeBtn; 

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
        this.addForm = new FormGroup({
            name: new FormControl('', Validators.required),
            type: new FormControl('', Validators.required),
            description: new FormControl('', Validators.required),
            source: new FormControl('', Validators.required),
            file: new FormControl('', Validators.required),
            url: new FormControl('', Validators.required)
        });



    }

    ngOnInit(): void {
        this.closeBtn = document.getElementById('closeBtn'); //test wtf

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
        if (this.loading ==false || this.loading == null){
            console.log(this.closeBtn);
            this.closeBtn.click();
            //data-dismiss="modal";
        }
    }
    getValue(){
        //gets R.Id if cancelling is needed
        return this.resourceId;
    }
    setResId(resourceId){
        this.resourceId = resourceId;
    }

    async cancelResource(){
        console.log("entró");
        this.warningMsg = 'Se esta cancelando el recurso';
        this.status='warning';
        await this.subscriptionFile$.unsubscribe();
            console.log("subscrip", this.subscriptionFile$);
        await this.subscriptionResource$.unsubscribe();
            
            console.log("subscripReso", this.subscriptionResource$);

        await this._resourceService.deleteResource(this.token, this.getValue()).subscribe(
                response => {
                    if(response && response.resource){
                        //let the user know it was quite deleted
                       //useless for now  this.deleted.emit();          
                        console.log("deleted?", response);    //log
                        this.status='deleted';
                        this.warningMsg = 'Se estan subiendo los archivos, por favor evita cerrar la ventana. ';
                        this.errorMsg = 'Hubo un error al enviar el recurso. Intentalo de nuevo más tarde.';
                        this.loading =false;
                        
                    }
                },
                error =>{
                    //TODO let the user know there's an error 
                    console.log(<any>error);
                    this.errorMsg="hubo un Error, por favor comunicate con el Administrador";
                    this.status='error';
                    this.loading =false;
                    
                }
            );
            
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


        this.subscriptionResource$=this._resourceService.addResource(this.token, this.resource).subscribe(
            response => {

                if (response.resource && response.resource._id) {
                    
                    this.setResId(response.resource._id);
                    if (!this.filesToUpload){
                        this.addForm.reset();
                        this.status = 'success';
                        this.loading = false;
                    }
                    else{

                        if (this.filesToUpload.length > 0) {


                            // Upload post image
                            this.disableForm(true);
                            this.subscriptionFile$= this._uploadService.makeFileRequest(
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
                                
                                //console.log("enter here edit Document");
                                this.added.emit();
                                this.addForm.reset();                    
                                this.disableForm(false);
                                //console.log("respuesta: ", event.body.resource);
                                this.barWidth ='0%';
                                this.loading = false;
                                this.status ='success';
                                                                                    

                                }
                            }, error=>{

                                
                                this.status = 'error';
                                this.barWidth ='0%';
                                this.loading = false;
                                console.log(<any>error);

                            });

                        this.added.emit();                       

                     } else {
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
        this.added.emit();
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
