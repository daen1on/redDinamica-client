import { Component, OnInit} from '@angular/core';
import { FIELDS_FORM } from '../resourcesData';
import { Validators, UntypedFormControl, UntypedFormGroup,   } from '@angular/forms';
import { Resource } from 'src/app/models/resource.model';
import { UserService } from 'src/app/services/user.service';
import { ResourceService } from 'src/app/services/resource.service';
import { UploadService } from 'src/app/services/upload.service';
import { GLOBAL } from 'src/app/services/global';
import { MAX_FILE_SIZE } from 'src/app/services/DATA';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { Subscription } from 'rxjs';



@Component({
    selector: 'suggest',
    templateUrl: './suggest.component.html',
    standalone: false
})
export class SuggestComponent implements OnInit {
    
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
    readonly  successMsg = 'Se ha enviado la sugerencia para el nuevo recurso correctamente. Gracias por tu sugerencia. Si deseas, puedes enviar otra sugerencia';
    readonly deletedMsg ="Se ha cancelado correctamente la sugerencia. Puedes volver a enviar un recurso";

    public resource;
    public MAX_FILE_SIZE = MAX_FILE_SIZE;
    public maxSize = MAX_FILE_SIZE * 1024 * 1024;
    public maxSizeError = false;
    public barWidth: string = "0%";
    
    private resourceId = '';

    // useless for now @Output() deleted = new EventEmitter();

    constructor(
        private _userService: UserService,
        private _resourceService: ResourceService,
        private _uploadService: UploadService,

    ) {
       
        this.title = 'Sugerir recurso';
        this.identity = this._userService.getIdentity();
        this.token = this._userService.getToken();
        this.url = GLOBAL.url;

        this.fields = FIELDS_FORM;
        this.errorMsg = 'Hubo un error al enviar la sugerencia para el nuevo recurso. Intentalo de nuevo más tarde.';
        this.warningMsg= 'Se estan subiendo los archivos, por favor evita cerrar la ventana. '; 

        this.addForm = new UntypedFormGroup({
            name: new UntypedFormControl('', Validators.required),
            type: new UntypedFormControl('', Validators.required),
            description: new UntypedFormControl('', Validators.required),
            justification: new UntypedFormControl('', Validators.required),
            source: new UntypedFormControl('', Validators.required),
            file: new UntypedFormControl('', Validators.required),
            url: new UntypedFormControl('', Validators.required)
        });



    }

    ngOnInit(): void {
        this.closeBtn = document.getElementById('closeBtn'); //test wtf
    }


    get f() { return this.addForm.controls; }


    restartValues() {
        //data-dismiss="modal"
        //console.log("restart")
        //console.log("submitted", this.submitted);
        //console.log("loading: ",this.loading);
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
        this.warningMsg = 'Se esta cancelando la sugerencia';
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
                        this.errorMsg = 'Hubo un error al enviar la sugerencia para el nuevo recurso. Intentalo de nuevo más tarde.';
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
        this.addForm.controls.justification.disable();
        this.addForm.controls.source.disable();
        this.addForm.controls.file.disable();
        }    
        else{
            
        this.addForm.controls.name.enable();
        this.addForm.controls.type.enable();
        this.addForm.controls.description.enable();
        this.addForm.controls.justification.enable();
        this.addForm.controls.source.enable();
        this.addForm.controls.file.enable();

        }
        
    }
    
    setDisabled() {
        this.subscriptionDisable = this.addForm.get('type').valueChanges.subscribe(
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

        this.resource.justification = this.addForm.value.justification;
        this.resource.url = this.addForm.value.url;
        this.resource.accepted = false;
        


        this.subscriptionResource$= this._resourceService.addResource(this.token, this.resource).subscribe(
            response => {
                if (response.resource && response.resource._id) {
                    this.setResId(response.resource._id);
                    if(!this.filesToUpload ){
                        //console.log("entró",this.resource.url); if user sent a url resource
                        this.addForm.reset();                    
                        this.status = 'success';
                        this.loading = false;
                    }
                    else {
                        if (this.filesToUpload.length > 0){
                        // Upload post image
                        this.disableForm(true);
                        this.subscriptionFile$ = this._uploadService.makeFileRequest(
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
                              this.status ='success';
                              this.addForm.reset();                    
                              this.disableForm(false);
                              this.barWidth ='0%';
                              this.loading = false;
                                                                                   

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

    onChanges(){
        
        console.log("btn: ",this.closeBtn);
        
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

