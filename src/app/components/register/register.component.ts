import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, CheckboxRequiredValidator } from '@angular/forms';

import { MustMatch } from '../../helpers/must-match.validator';
import { User } from 'src/app/models/user.model';
import { UserService } from 'src/app/services/user.service';
import { ActivatedRoute, Router } from '@angular/router';
import { BasicDataService } from 'src/app/services/basicData.service';
import { Profession } from 'src/app/models/profession.model';
import { Institution } from 'src/app/models/institution.model';
import { MessageService } from 'src/app/services/message.service';
import { TYC_FILE } from 'src/app/services/DATA';
import { GLOBAL } from 'src/app/services/global';



@Component({
    selector: 'register',
    templateUrl: './register.component.html'
})
export class RegisterComponent implements OnInit {
    public title: string;
    public registerForm: FormGroup;
    public submitted = false;
    public url;
    public tyc_file;

    public user: User;
    public message: String;

    // Select data
    public items;
    public allProfessions: any;
    public allInstitutions;
    public allAreas;
    public profession = new Profession('');
    public institution = new Institution();
    public status;
    public token;

    public loading;

    constructor(
        private _formBuilder: FormBuilder,
        private _userService: UserService,
        private _bDService: BasicDataService,
        private _messageService: MessageService,
        private _route: ActivatedRoute,
        private _router: Router
    ) {
        this.title = 'Registro';
        this.user = new User();
        this.tyc_file = TYC_FILE;
        this.url = GLOBAL.url;


        this.items = {
            institution: [],
            profession: []
        };

        


    }

    ngDoCheck(): void {
    }

    ngOnInit() {
        this.getAllInstitutions();
        this.getAllProfessions();

        //aca iba antes formBuilder
        
            this.registerForm = this._formBuilder.group({
            name: ['', Validators.required],
            surname: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', Validators.required],
            profession: ['', Validators.required],
            institution: ['', Validators.required],
            category: ['', Validators.required],
            experience: '',
            tyc: [false, Validators.requiredTrue ] //problema aca con el validators del checkbox
        },
            {
                validators: MustMatch('password', 'confirmPassword')
            });
        
    }


    get f() { return this.registerForm.controls; }

    async onSubmit() {
        this.submitted = true;

        // stop here if form is invalid
        if (this.registerForm.invalid) {
            this.loading = false;
            return;
        }

        this.user.name = this.registerForm.value.name;
        this.user.surname = this.registerForm.value.surname;
        this.user.email = this.registerForm.value.email;
        this.user.password = this.registerForm.value.password;
        this.user.role = this.registerForm.value.category;
        this.user.about = this.registerForm.value.experience;

        if (this.registerForm.value.profession) {
            this.user.profession = this.registerForm.value.profession._id;
        }

        if (this.registerForm.value.institution) {
            this.user.institution = this.registerForm.value.institution._id;
        }

        if (['student', 'guest'].includes(this.f.category.value)) {
            this.user.about = '';
        }

        if (!this.user.profession && this.registerForm.value.profession) {

            if (this.registerForm.value.profession.name) {
                this.profession.name = this.registerForm.value.profession.name;
            } else {
                this.profession.name = this.registerForm.value.profession;
            }

            // this.profession.used = true;

            let responseAddProfession = await this._bDService.addProfession(this.profession).toPromise().catch(error => console.log(<any>error));

            if (responseAddProfession.profession && responseAddProfession.profession._id) {
                this.user.profession = responseAddProfession.profession._id;
                localStorage.removeItem('professions');
                this.getAllProfessions();
            } else {
                console.log(<any>responseAddProfession);
            }

        }


        if (!this.user.institution && this.registerForm.value.institution) {

            if (this.registerForm.value.institution.name) {
                this.institution.name = this.registerForm.value.institution.name;
            } else {
                this.institution.name = this.registerForm.value.institution;
            }

            // this.institution.used = true;

            let responseAddinstitution = await this._bDService.addInstitution(this.institution).toPromise();
            if (responseAddinstitution.institution && responseAddinstitution.institution._id) {
                this.user.institution = responseAddinstitution.institution._id;
                localStorage.removeItem('institutions');
                this.getAllInstitutions();
            } else {
                console.log(<any>responseAddinstitution);
            }

        }

        let response = await this._userService.register(this.user).toPromise().catch((error) => {
            this.status = "error";
            console.log(<any>error);
        });


        if (response.user && response.user._id) {
            this._userService.signup(this.user).subscribe(
                response => {

                    if (response.user && response.user._id) {

                        localStorage.setItem('identity', JSON.stringify(response.user));

                        this._userService.signup(this.user, true).subscribe(
                            response => {

                                this.token = response.token;

                                if (this.token.length <= 0) {
                                    this.status = 'error';
                                } else {
                                    this.status = 'success';
                                    localStorage.setItem('token', this.token);

                                    this.getAllInstitutions();
                                    this.getAllProfessions();
                                    this.getAllAreas();
                                    this.getCounters();
                                    this.getUnviewMessages();

                                    this._router.navigate(['/inicio']);

                                }
                            },
                            error => {
                                console.log(<any>error);
                                this.status = 'error';
                            }
                        )

                    } else {
                        this.status = 'error';
                    }
                },
                error => {
                    console.log(<any>error);
                    this.status = 'error';
                }
            );

        } else {
            this.status = "error";
            this.message = 'No ha sido posible realizar el registro, el correo electrónico ya se encuentra registrado.'
        }

    }

    getAllProfessions() {
        this._bDService.getAllProfessions().subscribe(
            response => {
                if (response.professions) {
                    this.allProfessions = response.professions;
                    this.items.profession = this.allProfessions;
                    localStorage.setItem('professions', JSON.stringify(this.allProfessions));
                }
            }, error => {
                console.log(<any>error);
            });

    }

    getAllAreas() {

        this._bDService.getAllKnowledgeAreas().subscribe(
            response => {
                if (response.areas) {
                    this.allAreas = response.areas;
                    localStorage.setItem('areas', JSON.stringify(this.allAreas));
                }
            }, error => {
                console.log(<any>error);
            });


    }

    getAllInstitutions() {
        this._bDService.getAllInstitutions().subscribe(
            response => {
                if (response.institutions) {

                    this.allInstitutions = response.institutions;
                    this.items.institution = this.allInstitutions;
                    localStorage.setItem('institutions', JSON.stringify(this.allInstitutions));
                }
            }, error => {
                console.log(<any>error);
            });

    }

    getCounters() {
        this._userService.getCounters().subscribe(
            response => {
                if (response) {
                    localStorage.setItem('stats', JSON.stringify(response));
                }
            },
            error => {
                console.log(<any>error);
            });
    }

    getUnviewMessages() {
        this._messageService.getUnviewMessages(this.token).subscribe(
            response => {
                if (response.unviewed) {
                    localStorage.setItem('unviewedMessages', response.unviewed);
                }
            },
            error => {
                console.log(<any>error);
            }
        )
    }
}
