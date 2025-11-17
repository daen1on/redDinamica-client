import { Component, OnInit, ElementRef, Renderer2, ViewChild, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MustMatch } from '../../helpers/must-match.validator';
import { User } from 'src/app/models/user.model';
import { UserService } from 'src/app/services/user.service';
import { ActivatedRoute, Router } from '@angular/router';
import { BasicDataService } from 'src/app/services/basicData.service';
import { Profession } from 'src/app/models/profession.model';
import { Institution } from 'src/app/models/institution.model';
import { MessageService } from 'src/app/services/message.service';
import { TYC_FILE } from 'src/app/services/DATA';
import { GLOBAL } from 'src/app/services/GLOBAL';

import { firstValueFrom, Subject, throwError } from 'rxjs';
import { takeUntil, tap, catchError } from 'rxjs/operators';

@Component({
    selector: 'register',
    templateUrl: './register.component.html',
    standalone: false
})
export class RegisterComponent implements OnInit, OnDestroy {
    @ViewChild('contador') contador: ElementRef;
    public title: string;
    public registerForm: FormGroup;
    public submitted = false;
    public url;
    public tyc_file = '#/assets/TyC_RedDinamica.pdf';
    public user: User;
    public message: string;

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
    private unsubscribe$ = new Subject<void>();

    constructor(
        private _formBuilder: FormBuilder,
        private _userService: UserService,
        private _bDService: BasicDataService,
        private _messageService: MessageService,
        private _route: ActivatedRoute,
        private _router: Router,
        private renderer: Renderer2
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

    ngOnInit() {
        this.getAllInstitutions();
        this.getAllProfessions();

        this.registerForm = this._formBuilder.group({
            name: ['', Validators.required],
            surname: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', Validators.required],
            profession: ['', Validators.required],
            institution: ['', Validators.required],
            category: ['', Validators.required],
            experience: ['', [Validators.maxLength(1000)]],
            tyc: [false, Validators.requiredTrue] // Ensures checkbox is true
        }, {
            validators: MustMatch('password', 'confirmPassword')
        });
    }

    ngOnDestroy() {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    get f() { return this.registerForm.controls; }

    async onSubmit() {
        this.submitted = true;
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
            this.user.profession = this.registerForm.value.profession._id || this.registerForm.value.profession;
        }
    
        if (this.registerForm.value.institution) {
            this.user.institution = this.registerForm.value.institution._id || this.registerForm.value.institution;
        }
    
        if (['student', 'guest'].includes(this.f.category.value)) {
            this.user.about = '';
        }
    
        try {
            if (!this.user.profession && this.registerForm.value.profession) {
                if (this.registerForm.value.profession.name) {
                    this.profession.name = this.registerForm.value.profession.name;
                } else {
                    this.profession.name = this.registerForm.value.profession;
                }
    
                let responseAddProfession = await firstValueFrom(this._bDService.addProfession(this.profession));
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
    
                let responseAddInstitution = await firstValueFrom(this._bDService.addInstitution(this.institution));
                if (responseAddInstitution.institution && responseAddInstitution.institution._id) {
                    this.user.institution = responseAddInstitution.institution._id;
                    localStorage.removeItem('institutions');
                    this.getAllInstitutions();
                } else {
                    console.log(<any>responseAddInstitution);
                }
            }
    
            let response = await firstValueFrom(this._userService.register(this.user));
            if (response.user && response.user._id) {
                this._userService.signup(this.user).pipe(
                    tap(response => {
                        if (response.user && response.user._id) {
                            localStorage.setItem('identity', JSON.stringify(response.user));
                            this._userService.signup(this.user, true).pipe(
                                tap(response => {
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
                                }),
                                catchError(error => {
                                    console.log('Error during signup with token:', error);
                                    this.status = 'error';
                                    return throwError(() => error);
                                })
                            ).subscribe();
                        } else {
                            this.status = 'error';
                        }
                    }),
                    catchError(error => {
                        console.log('Error during signup:', error);
                        this.status = 'error';
                        return throwError(() => error);
                    })
                ).subscribe();
            } else {
                this.status = "error";
                this.message = 'No ha sido posible realizar el registro, el correo electrónico ya se encuentra registrado.';
            }
    
        } catch (error) {
            this.status = "error while running register";
            console.log('Error during registration:', error);
        }
    }
    onInputChange(event: Event) {
        const inputElement = event.target as HTMLInputElement;
        const value = inputElement.value;
    
        // If value is not a string, set it to an empty string
        if (typeof value !== 'string') {
            inputElement.value = '';
            console.warn('Input value is not a string:', value);
        }
    }

    getAllProfessions() {
        this._bDService.getAllProfessions().pipe(
            tap(response => {
                if (response.professions) {
                    this.allProfessions = response.professions;
                    this.items.profession = this.allProfessions;
                    localStorage.setItem('professions', JSON.stringify(this.allProfessions));
                }
            }),
            takeUntil(this.unsubscribe$)
        ).subscribe();
    }

    Contador = 1000;

    onKey(event) {
        var element = event.target as HTMLInputElement;
        this.Contador = 1000 - element.value.length;

        if (this.Contador < 0) {
            this.renderer.setStyle(this.contador.nativeElement, 'color', 'red');
        } else {
            this.renderer.setStyle(this.contador.nativeElement, 'color', 'black');
        }
    }

    getAllAreas() {
        this._bDService.getAllKnowledgeAreas().pipe(
            tap(response => {
                if (response.areas) {
                    this.allAreas = response.areas;
                    localStorage.setItem('areas', JSON.stringify(this.allAreas));
                }
            }),
            catchError(error => {
                console.log('Error fetching areas:', error);
                return throwError(() => error);
            })
        ).subscribe();
    }

    getAllInstitutions() {
        this._bDService.getAllInstitutions().pipe(
            tap(response => {
                if (response.institutions) {
                    this.allInstitutions = response.institutions;
                    this.items.institution = this.allInstitutions;
                    localStorage.setItem('institutions', JSON.stringify(this.allInstitutions));
                }
            }),
            takeUntil(this.unsubscribe$)
        ).subscribe();
    }

    getCounters() {
        this._userService.getCounters().pipe(
            tap(response => {
                if (response) {
                    localStorage.setItem('stats', JSON.stringify(response));
                }
            }),
            catchError(error => {
                console.log('Error fetching counters:', error);
                return throwError(() => error);
            })
        ).subscribe();
    }

    getUnviewMessages() {
        this._messageService.getUnviewMessages(this.token).pipe(
            tap(response => {
                if (response.unviewed) {
                    localStorage.setItem('unviewedMessages', response.unviewed);
                }
            }),
            catchError(error => {
                console.log('Error fetching unviewed messages:', error);
                return throwError(() => error);
            })
        ).subscribe();
    }
}
