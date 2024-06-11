import { Component, OnInit, OnDestroy } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { UserService } from 'src/app/services/user.service';
import { User } from 'src/app/models/user.model';
import { Router } from '@angular/router';
import { BasicDataService } from 'src/app/services/basicData.service';
import { MessageService } from 'src/app/services/message.service';
import { catchError, switchMap, takeUntil, tap } from 'rxjs/operators';
import { EMPTY, Subject } from 'rxjs';

@Component({
    selector: 'login',
    templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit, OnDestroy {
    public title: string;
    public invalid: boolean;
    public emailFound: boolean;
    public submitted = false;
    public loginForm: UntypedFormGroup;
    public user: User;
    public identity: any;
    public token: string;

    public allProfessions = [];
    public allInstitutions = [];
    public allAreas = [];
    private unsubscribe$: Subject<void> = new Subject();

    public loading: boolean;
    public errorMessage: string = '';

    constructor(
        private _formBuilder: UntypedFormBuilder,
        private _userService: UserService,
        private _bDService: BasicDataService,
        private _messageService: MessageService,
        private _router: Router
    ) {
        this.user = new User();
        this.title = 'Iniciar sesión';
    }

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    ngOnInit() {
        this.loginForm = this._formBuilder.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', Validators.required],
        });

        this.onChanges();
    }

    onChanges(): void {
        this.loginForm.valueChanges.pipe(
            takeUntil(this.unsubscribe$)
        ).subscribe(() => {
            this.errorMessage = '';
            this.invalid = false;
        });
    }

    // Get controls form
    get f() { return this.loginForm.controls; }

    onSubmit() {
        this.submitted = true;
        this.loading = true;

        if (this.loginForm.invalid) {
            this.loading = false;
            return;
        }

        this._userService.signup(this.loginForm.value).pipe(
            takeUntil(this.unsubscribe$),
            switchMap(response => {
                if (!response.user || !response.user._id) {
                    throw new Error('Invalid login');
                }
                localStorage.setItem('identity', JSON.stringify(response.user));
                return this._userService.signup(this.loginForm.value, true);
            }),
            tap({
                next: tokenResponse => {
                    if (!tokenResponse.token) {
                        throw new Error('Token not found');
                    }
                    localStorage.setItem('token', tokenResponse.token);
                    this.token = tokenResponse.token; // Set the token for further requests
                },
                error: error => {
                    this.errorMessage = 'Ha ocurrido un error. Por favor intenta de nuevo.';
                    console.error(error);
                    this.invalid = true;
                    this.loading = false;
                }
            }),
            catchError(error => {
                this.errorMessage = 'Ha ocurrido un error. Por favor intenta de nuevo.';
                console.error(error);
                this.invalid = true;
                this.loading = false;
                return EMPTY;
            })
        ).subscribe(() => {
            this.getAllInstitutions();
            this.getAllProfessions();
            this.getCounters();
            this.getAllAreas();
            this.getUnviewMessages();
            this._router.navigate(['/inicio']);
        });
    }

    getAllAreas() {
        const storedAreas = localStorage.getItem('areas');
        if (storedAreas) {
            this.allAreas = JSON.parse(storedAreas);
            return;
        }

        this._bDService.getAllKnowledgeAreas().pipe(
            takeUntil(this.unsubscribe$),
            tap({
                next: response => {
                    if (response.areas) {
                        this.allAreas = response.areas;
                        localStorage.setItem('areas', JSON.stringify(this.allAreas));
                    } else {
                        throw new Error('No areas found');
                    }
                },
                error: error => {
                    console.error(error);
                }
            }),
            catchError(error => {
                console.error(error);
                return EMPTY;
            })
        ).subscribe();
    }

    getAllProfessions() {
        const storedProfessions = localStorage.getItem('professions');
        if (storedProfessions) {
            this.allProfessions = JSON.parse(storedProfessions);
            return;
        }

        this._bDService.getAllProfessions().pipe(
            takeUntil(this.unsubscribe$),
            tap({
                next: response => {
                    if (response.professions) {
                        this.allProfessions = response.professions;
                        localStorage.setItem('professions', JSON.stringify(this.allProfessions));
                    } else {
                        throw new Error('No professions found');
                    }
                },
                error: error => {
                    console.error(error);
                    this.errorMessage = 'No se pueden traer las profesiones. Por favor intenta de nuevo mas tarde.';
                }
            }),
            catchError(error => {
                console.error(error);
                this.errorMessage = 'No se pueden traer las profesiones. Por favor intenta de nuevo mas tarde.';
                return EMPTY;
            })
        ).subscribe();
    }

    getAllInstitutions() {
        const storedInstitutions = localStorage.getItem('institutions');
        if (storedInstitutions) {
            this.allInstitutions = JSON.parse(storedInstitutions);
            return;
        }

        this._bDService.getAllInstitutions().pipe(
            takeUntil(this.unsubscribe$),
            tap({
                next: response => {
                    if (response.institutions) {
                        this.allInstitutions = response.institutions;
                        localStorage.setItem('institutions', JSON.stringify(this.allInstitutions));
                    } else {
                        throw new Error('No institutions found');
                    }
                },
                error: error => {
                    console.error(error);
                    this.errorMessage = 'Error intentando traer las instituciones. Intenta de nuevo más tarde';
                }
            }),
            catchError(error => {
                console.error(error);
                this.errorMessage = 'Error intentando traer las instituciones. Intenta de nuevo más tarde';
                return EMPTY;
            })
        ).subscribe();
    }

    getCounters() {
        this._userService.getCounters().pipe(
            takeUntil(this.unsubscribe$),
            tap({
                next: response => {
                    if (response) {
                        localStorage.setItem('stats', JSON.stringify(response));
                    } else {
                        throw new Error('Failed to fetch counters');
                    }
                },
                error: error => {
                    console.error(error);
                    this.errorMessage = 'Failed to load user counters.';
                }
            }),
            catchError(error => {
                console.error(error);
                this.errorMessage = 'Failed to load user counters.';
                return EMPTY;
            })
        ).subscribe();
    }

    getUnviewMessages() {
        this._messageService.getUnviewMessages(this.token).pipe(
            takeUntil(this.unsubscribe$),
            tap({
                next: response => {
                    if (response) {
                        localStorage.setItem('unviewedMessages', JSON.stringify(response.unviewed));
                    } else {
                        throw new Error('Failed to fetch unviewed messages');
                    }
                },
                error: error => {
                    console.error(error);
                    this.errorMessage = 'Unable to load new messages.';
                }
            }),
            catchError(error => {
                console.error(error);
                this.errorMessage = 'Unable to load new messages.';
                return EMPTY;
            })
        ).subscribe();
    }
}
