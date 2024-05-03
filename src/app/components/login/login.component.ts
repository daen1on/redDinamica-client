import { Component, OnInit } from '@angular/core';
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
export class LoginComponent implements OnInit {
    public title: string;
    public invalid: boolean;
    public emailFound: boolean;
    public submitted = false;
    public loginForm: UntypedFormGroup;
    public user;
    public identity;
    public token;

    public allProfessions = [];
    public allInstitutions = [];
    public allAreas = [];
    private unsubscribe$: Subject<void> = new Subject();

    public loading;
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
        })

    }
    onChanges(): void {
        this.loginForm.valueChanges.pipe(
            takeUntil(this.unsubscribe$)
        ).subscribe(val => {
            this.errorMessage = ''; // Reset the error message on form changes
            this.invalid = false; // Consider setting to false or an empty string depending on your logic
        });
    }
   

    // Get controls form
    get f() { return this.loginForm.controls; }
    onSubmit() {
        this.submitted = true;
        this.loading = true; // Ensure you set loading true at the beginning of the submission
    
        if (this.loginForm.invalid) {
            this.loading = false;
            return;
        }
    
        // Simplify by directly using the form value
        this._userService.signup(this.loginForm.value).pipe(
            takeUntil(this.unsubscribe$),
            switchMap(response => {
                if (!response.user || !response.user._id) {
                    throw new Error('Invalid login');
                }
                localStorage.setItem('identity', JSON.stringify(response.user));
                return this._userService.signup(this.loginForm.value, true);
            }),
            tap(tokenResponse => {
                if (!tokenResponse.token) {
                    throw new Error('Token not found');
                }
                localStorage.setItem('token', tokenResponse.token);
                // Proceed with fetching all necessary data
            }),
            catchError(error => {
                this.errorMessage = 'Ha ocurrido un error. Por favor intenta de nuevo.';
                console.error(error);
                this.invalid = true;
                this.loading = false;
                // Optionally, set an error message for the UI
                return EMPTY; // Import EMPTY from 'rxjs'
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
        // Check if areas are already stored in localStorage to avoid unnecessary API calls
        const storedAreas = localStorage.getItem('areas');
        if (storedAreas) {
            this.allAreas = JSON.parse(storedAreas);
            return; // Exit the method if areas are already available
        }
    
        // Proceed to fetch areas if not found in localStorage
        this._bDService.getAllKnowledgeAreas().pipe(
            takeUntil(this.unsubscribe$), // Ensure unsubscription to prevent memory leaks
            tap(response => {
                if (response.areas) {
                    this.allAreas = response.areas;
                    localStorage.setItem('areas', JSON.stringify(this.allAreas));
                } else {
                    // Handle case where the response might not have the expected data
                    throw new Error('No areas found');
                }
            }),
            catchError(error => {
                console.error(error);
                return EMPTY; // Prevents the Observable from breaking on error, import EMPTY from 'rxjs'
            })
        ).subscribe();
    }

    getAllProfessions() {
        // Attempt to retrieve professions from local storage to minimize unnecessary API calls
        const storedProfessions = localStorage.getItem('professions');
        if (storedProfessions) {
            this.allProfessions = JSON.parse(storedProfessions);
            return; // Exit if professions are found in local storage
        }
    
        // Fetch professions from the server if not found in local storage
        this._bDService.getAllProfessions().pipe(
            takeUntil(this.unsubscribe$), // Ensures clean unsubscription
            tap(response => {
                if (response.professions) {
                    this.allProfessions = response.professions;
                    localStorage.setItem('professions', JSON.stringify(this.allProfessions));
                } else {
                    // Consider adding more robust handling for when the expected data isn't present
                    throw new Error('No professions found');
                }
            }),
            catchError(error => {
                console.error(error);
                // Optionally, update the UI to inform the user that an error occurred
                this.errorMessage = 'No se pueden traer las profesiones. Por favor intenta de nuevo mas tarde.';
                return EMPTY; // Keeps the observable chain alive, import EMPTY from 'rxjs'
            })
        ).subscribe();
    }


    getAllInstitutions() {
        // Attempt to retrieve institutions from local storage to avoid unnecessary API calls
        const storedInstitutions = localStorage.getItem('institutions');
        if (storedInstitutions) {
            this.allInstitutions = JSON.parse(storedInstitutions);
            return; // Exit the method if institutions are already loaded
        }
    
        // Fetch institutions from the server if not found in local storage
        this._bDService.getAllInstitutions().pipe(
            takeUntil(this.unsubscribe$), // Unsubscribe when the component is destroyed
            tap(response => {
                if (response.institutions) {
                    this.allInstitutions = response.institutions;
                    localStorage.setItem('institutions', JSON.stringify(this.allInstitutions));
                } else {
                    // Handle the scenario where the expected data structure isn't returned
                    throw new Error('No institutions found');
                }
            }),
            catchError(error => {
                console.error(error);
                this.errorMessage = 'Error intentando traer las profesiones. Intenta de nuevo más tarde';
                return EMPTY; // Import EMPTY from 'rxjs'; prevents the Observable from breaking
            })
        ).subscribe();
    }

    getCounters() {
        this._userService.getCounters().pipe(
            takeUntil(this.unsubscribe$), // Automatically manage unsubscription
            tap(response => {
                if (response) {
                    localStorage.setItem('stats', JSON.stringify(response));
                } else {
                    throw new Error('Failed to fetch counters');
                }
            }),
            catchError(error => {
                console.error(error);
                // Optionally, we can set an error message to inform the user
                this.errorMessage = 'Failed to load user counters.';
                return EMPTY; // Ensures the stream is kept alive in case of an error
            })
        ).subscribe();
    }
    getUnviewMessages() {
        this._messageService.getUnviewMessages(this.token).pipe(
            takeUntil(this.unsubscribe$), // Ensures unsubscription to prevent memory leaks
            tap(response => {
                if (response) {
                    localStorage.setItem('unviewedMessages', JSON.stringify(response.unviewed));
                } else {
                    // Handle the case where the response might not be in the expected format
                    throw new Error('Failed to fetch unviewed messages');
                }
            }),
            catchError(error => {
                console.error(error);
                // Optionally, UI to display an error message to the user.
                this.errorMessage = 'Unable to load new messages.';
                return EMPTY; // Keeps the observable chain alive in case of an error, ensuring future subscriptions are not affected.
            })
        ).subscribe();
    }
    
    
}
