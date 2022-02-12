import { Component } from '@angular/core';
import { UserService } from 'src/app/services/user.service';

import { FIELDS_FORM } from '../services/profileData';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { User } from 'src/app/models/user.model';
import { UploadService } from 'src/app/services/upload.service';
import { GLOBAL } from 'src/app/services/global';
import { BasicDataService } from 'src/app/services/basicData.service';

import { City } from 'src/app/models/city.model';
import { Profession } from 'src/app/models/profession.model';
import { Institution } from 'src/app/models/institution.model';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { MAX_FILE_SIZE } from 'src/app/services/DATA';

@Component({
    selector: 'editInfo',
    templateUrl: './editInfo.component.html',
    styleUrls: ['./editInfo.component.css']
})
export class EditInfoComponent {
    public title: string;
    public url: string;
    public token: string;
    public identity;
    public addCity = false;
    public fieldsForm;
    public MAX_FILE_SIZE = MAX_FILE_SIZE;
    public maxSize = MAX_FILE_SIZE * 1024 * 1024;
    public maxSizeError = false;
    public status;
    public city = new City();
    public profession = new Profession('');
    public institution = new Institution();
    public state;
    public country;
    public editForm: FormGroup;
    public user;

    public items;
    public allCities;
    public allProfessions;
    public allInstitutions;
    barWidth: string = "0%";

    constructor(
        private _formBuilder: FormBuilder,
        private _userService: UserService,
        private _uploadService: UploadService,
        private _bDService: BasicDataService,
        private _router: Router,
        private _route: ActivatedRoute,
    ) {

        this.title = 'Editar perfil';
        this.identity = this._userService.getIdentity();
        this.url = GLOBAL.url;

        this.user = this._userService.getIdentity();
        this.token = this._userService.getToken();

        this.fieldsForm = FIELDS_FORM;

        this.state = new FormControl('');
        this.country = new FormControl('');
        this.items = {
            city: [],
            institution: [],
            profession: []
        };
    }


    ngOnInit(): void {
        this.loadPage();
        this.getAllCities();
        this.getAllInstitutions();
        this.getAllProfessions();   
        
        this.editForm = this._formBuilder.group({
            name: [this.identity.name,[Validators.required,Validators.maxLength(80)]],
            surname: [this.identity.surname, [Validators.required,Validators.maxLength(80)]],
            about: [this.identity.about,[Validators.required, Validators.maxLength(1000)]],
            city: [this.identity.city],
            profession: [this.identity.profession,Validators.required,],
            institution: [this.identity.institution,Validators.required],
            postgraduate: [this.identity.postgraduate,Validators.maxLength(1000)],
            profileImage: '',
            contactNumber: [this.identity.contactNumber,[Validators.pattern('[- +()0-9]+'),Validators.maxLength(15)]],
            socialNetworks: this.identity.socialNetworks
        },{
            //TODO validar en html del edit y hacer que el numero sea solo de numeros...
        });


    }
    

    onChanges(): void {
        this.editForm.valueChanges.subscribe(val => {
            if (val) {
                this.status = null;
            }
        });
    }

    loadPage() {
        this.identity = this._userService.getIdentity();

        this._route.parent.params.subscribe(params => {
            let id = params['id'];

            this.getUser(id);
        })
    }

    getUser(userId) {
        this._userService.getUser(userId).subscribe(
            response => {
                if (response.user) {
                    this.identity = response.user;
                } else {

                    this.identity = this.identity;
                    
                }

            },
            error => {
                console.log(<any>error);
                this.identity = this.identity;
                
            }
        );
    }

    public typeError = false;
    async onSubmit() {
     
          // stop here if form is invalid
          if (this.editForm.invalid) {
            document.scrollingElement.scrollTop = 0;
            this.status = "error";
            return;
        }
        if (this.filesToUpload[0]) {
            // Validate file type
            if (['image/jpeg', 'image/gif', 'image/png'].includes(this.filesToUpload[0].type)) {
                this.typeError = false;
            } else {
                window.scroll({ 
                    top: 0, 
                    left: 0, 
                    behavior: 'smooth' 
                 });
                this.typeError = true;
                return;
            }

            // Validate file size
            if (this.maxSize < this.filesToUpload[0].size) {
                window.scroll({ 
                    top: 0, 
                    left: 0, 
                    behavior: 'smooth' 
                 });
                this.typeError = true;
                this.maxSizeError = true;
                return;
            } else {
                this.maxSizeError = false;
            }
        } 

        this.user.name = this.editForm.value.name;
        this.user.surname = this.editForm.value.surname;
        this.user.about = this.editForm.value.about;
        this.user.postgraduate = this.editForm.value.postgraduate;
        this.user.socialNetworks = this.editForm.value.socialNetworks;
        this.user.contactNumber = this.editForm.value.contactNumber;

        if (this.editForm.value.city) {
            this.user.city = this.editForm.value.city._id;
        }

        if (this.editForm.value.profession) {
            this.user.profession = this.editForm.value.profession._id;
        }

        if (this.editForm.value.institution) {
            this.user.institution = this.editForm.value.institution._id;
        }

        if (!this.user.city && this.editForm.value.city) {

            if (this.editForm.value.city.name) {
                this.city.name = this.editForm.value.city.name;
            } else {
                this.city.name = this.editForm.value.city;
            }

            this.city.state = this.state.value;
            this.city.country = this.country.value;
            // this.city.used = true;

            let responseAddCity = await this._bDService.addCity(this.city).toPromise();

            if (responseAddCity.city && responseAddCity.city._id) {
                this.user.city = responseAddCity.city._id;
                this.state.reset();
                this.country.reset();
            } else {
                console.log(<any>responseAddCity);
            }

            localStorage.removeItem('cities');
            this.getAllCities();
        }

        if (!this.user.profession && this.editForm.value.profession) {

            // this.profession.used = true;

            if (this.editForm.value.profession.name) {
                this.profession.name = this.editForm.value.profession.name;
            } else {
                this.profession.name = this.editForm.value.profession;
            }

            let responseAddProfession = await this._bDService.addProfession(this.profession).toPromise();

            if (responseAddProfession.profession && responseAddProfession.profession._id) {
                this.user.profession = responseAddProfession.profession._id;
            } else {
                console.log(<any>responseAddProfession);
            }

            localStorage.removeItem('professions');
            this.getAllProfessions();
        }

        if (!this.user.institution && this.editForm.value.institution) {

            if (this.editForm.value.institution.name) {
                this.institution.name = this.editForm.value.institution.name;
            } else {
                this.institution.name = this.editForm.value.institution;
            }

            // this.institution.used = true;

            let responseAddinstitution = await this._bDService.addInstitution(this.institution).toPromise();
            if (responseAddinstitution.institution && responseAddinstitution.institution._id) {
                this.user.institution = responseAddinstitution.institution._id;
            } else {
                console.log(<any>responseAddinstitution);
            }
            localStorage.removeItem('institutions');
            this.getAllInstitutions();
        }


        let response = await this._userService.updateUser(this.user).toPromise().catch((error) => {
            this.status = "error";
            console.log(<any>error);
        });

        if (response.user && response.user._id) {
            document.scrollingElement.scrollTop = 0;
            this.identity = response.user;
            this.status = 'success';
            localStorage.setItem('identity', JSON.stringify(this.identity));

            if (this.filesToUpload.length > 0) {

                //Upload profile imaage
                this._uploadService.makeFileRequest(
                    this.url + 'upload-image-user/' + this.identity._id,
                    [],
                    this.filesToUpload,
                    this.token,
                    'image'
                ).subscribe((event: HttpEvent<any>) => { // client call
                    switch(event.type) { //checks events
                    case HttpEventType.UploadProgress: // If upload is in progress
                    this.status = 'warning';
                    this.barWidth = Math.round(event.loaded / event.total * 100).toString()+'%'; // get upload percentage
                    break;
                    case HttpEventType.Response: // give final response
                    console.log('User successfully added!', event.body);
                    //this.submitted = false;
                    
                    this.status ='success';
                    this.barWidth ='0%';
                    
                    }
                }, error=>{

                     
                    this.status = 'error';
                    this.barWidth ='0%';
                    
                    
                    console.log(<any>error);

                });
            
            }
            
            this.getAllCities();
            this.getAllInstitutions();
            this.getAllProfessions();


        } else {
            this.status = "error";
        }

        
    }

    public filesToUpload = [];
    fileChangeEvent(fileInput: any) {
        this.filesToUpload = <Array<File>>fileInput.target.files;
    }

    getAllCities() {
        this.allCities = JSON.parse(localStorage.getItem('cities'));

        if (!this.allCities) {

            this._bDService.getAllCities().subscribe(
                response => {

                    if (response.cities) {
                        this.allCities = response.cities;
                        localStorage.setItem('cities', JSON.stringify(this.allCities));
                    }
                }, error => {
                    console.log(<any>error);
                });
        }

        this.items.city = this.allCities;

    }


    getAllProfessions() {
        this.allProfessions = JSON.parse(localStorage.getItem('professions'));
        if (!this.allProfessions) {

            this._bDService.getAllProfessions().subscribe(
                response => {
                    if (response.professions) {
                        this.allProfessions = response.professions;
                        localStorage.setItem('professions', JSON.stringify(this.allProfessions));
                    }
                }, error => {
                    console.log(<any>error);
                });
        }


        this.items.profession = this.allProfessions;
    }


    getAllInstitutions() {
        this.allInstitutions = JSON.parse(localStorage.getItem('institutions'));

        if (!this.allInstitutions) {
            this._bDService.getAllInstitutions().subscribe(
                response => {
                    if (response.institutions) {
                        this.allInstitutions = response.institutions;
                        localStorage.setItem('institutions', JSON.stringify(this.allInstitutions));
                    }
                }, error => {
                    console.log(<any>error);
                });
        }
        this.items.institution = this.allInstitutions;
    }

    addCityData(e, controlName) {
        if (e && !e._id && controlName == "city") {
            this.addCity = true;
        } else {
            this.addCity = false;
        }
    }

}
