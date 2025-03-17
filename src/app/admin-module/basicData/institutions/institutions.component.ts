import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgSelectConfig } from '@ng-select/ng-select';
import { Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { BasicDataService } from 'src/app/services/basicData.service';

import { FIELDS_FORM } from './services/institutionsData';
import { Institution } from 'src/app/models/institution.model';

@Component({
    selector: 'institutions',
    templateUrl: './institutions.component.html',
    standalone: false
})
export class InstitutionsComponent implements OnInit, OnDestroy {
    public title: string;
    public fieldsForm = FIELDS_FORM;

    public submitted = false;
    public status: string;
    public institutionForm: FormGroup;
    public editInstitutionForm: FormGroup;
    public institution = new Institution();
    public institutions = [];

    // Pagination
    public page: number; // Actual page
    public pages: number; // Number of pages
    public total: number; // Total of records
    public prevPage: number;
    public nextPage: number;

    // Filter
    public filter: FormControl;
    public allInstitutions;

    // Select data
    public items;
    public allCities = [];

    public loading = true;
    private subscriptions: Subscription = new Subscription();

    constructor(
        private _bDService: BasicDataService,
        private config: NgSelectConfig,
        private _route: ActivatedRoute,
        private _router: Router,
    ) {
        this.title = 'Instituciones';

        this.institutionForm = new FormGroup({
            institutionName: new FormControl('', [Validators.required]),
            institutionWebsite: new FormControl(),
            institutionEmail: new FormControl(),
            institutionCity: new FormControl(),
            institutionTelephone: new FormControl()
        });

        this.editInstitutionForm = new FormGroup({
            institutionName: new FormControl('', [Validators.required]),
            institutionWebsite: new FormControl(),
            institutionEmail: new FormControl(),
            institutionCity: new FormControl(),
            institutionTelephone: new FormControl()
        });

        this.filter = new FormControl();

        // Set up of select
        this.config.addTagText = 'Agregar';
        this.config.notFoundText = 'No se encontro';

        this.items = { institutionCity: '' };
    }

    ngOnInit(): void {
        this.allCities = JSON.parse(localStorage.getItem('cities'));
        if (!this.allCities) {
            this.getAllCities();
        }

        this.actualPage();
        this.getAllInstitutions();
        this.onChanges();

        this.subscriptions.add(
            this.institutionForm.valueChanges.subscribe(val => {
                if (val) {
                    this.status = null;
                    this.submitted = false;
                }
            })
        );

        this.subscriptions.add(
            this.editInstitutionForm.valueChanges.subscribe(val => {
                if (val) {
                    this.status = null;
                    this.submitted = false;
                }
            })
        );
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    // Get controls form
    get f() { return this.institutionForm.controls; }

    get f2() { return this.editInstitutionForm.controls; }

    setAdd() {
        this.status = null;
        this.submitted = false;
        this.items = { institutionCity: this.allCities };
    }

    onSubmit() {
        this.submitted = true;

        if (this.institutionForm.invalid) {
            return;
        }

        this.institution.name = this.institutionForm.value.institutionName;
        this.institution.email = this.institutionForm.value.institutionEmail;

        if (this.institutionForm.value.institutionCity) {
            this.institution.city = this.institutionForm.value.institutionCity._id;
        }

        this.institution.website = this.institutionForm.value.institutionWebsite;
        this.institution.telephone = this.institutionForm.value.institutionTelephone;

        this._bDService.addInstitution(this.institution).subscribe({
            next: (response) => {
                if (response.institution && response.institution._id) {
                    this.institutionForm.reset();
                    this.status = 'success';
                    this.submitted = false;
                    this.getInstitutions(this.page);
                    this.getAllInstitutions();
                } else {
                    this.status = 'error';
                }
            },
            error: (error) => {
                if (error != null) {
                    this.status = 'error';
                    console.log(error);
                }
            }
        });
    }

    getAllInstitutions() {
        this._bDService.getAllInstitutions().pipe(
            catchError(error => {
                console.log('Error fetching institutions:', error);
                return of([]);
            })
        ).subscribe({
            next: (response) => {
                if (response.institutions) {
                    this.allInstitutions = response.institutions;
                    localStorage.setItem('institutions', JSON.stringify(this.allInstitutions));
                }
            },
            error: (error) => {
                console.log(error);
            }
        });
    }

    getInstitutions(page) {
        this._bDService.getInstitutions(page).pipe(
            catchError(error => {
                console.log('Error fetching institutions:', error);
                return of([]);
            })
        ).subscribe({
            next: (response) => {
                if (response.institutions) {
                    this.institutions = response.institutions;
                    this.total = response.total;
                    this.pages = response.pages;
                    if (page > this.pages) {
                        this._router.navigate(['/admin/instituciones']);
                    }
                    this.loading = false;
                }
            },
            error: (error) => {
                console.log(error);
            }
        });
    }

    public tempInstitution;
    setEditInstitution(institution) {
        this.status = null;
        this.items = { institutionCity: this.allCities };
        this.tempInstitution = institution;
        this.editInstitutionForm.patchValue({
            institutionName: this.tempInstitution.name,
            institutionWebsite: this.tempInstitution.website,
            institutionEmail: this.tempInstitution.email,
            institutionCity: this.tempInstitution.city,
            institutionTelephone: this.tempInstitution.telephone
        });
    }

    onEditSubmit() {
        this.status = null;
        this.submitted = true;

        if (this.editInstitutionForm.invalid) {
            return;
        }

        this.institution.name = this.editInstitutionForm.value.institutionName;
        this.institution.email = this.editInstitutionForm.value.institutionEmail;
        this.institution.city = this.editInstitutionForm.value.institutionCity;
        this.institution.website = this.editInstitutionForm.value.institutionWebsite;
        this.institution.telephone = this.editInstitutionForm.value.institutionTelephone;

        this._bDService.editInstitution(this.tempInstitution._id, this.institution).subscribe({
            next: (response) => {
                if (response.institution && response.institution._id) {
                    this.status = 'success';
                    this.submitted = false;
                    this.getInstitutions(this.page);
                    this.getAllInstitutions();
                } else {
                    this.status = 'error';
                }
            },
            error: (error) => {
                if (error != null) {
                    this.status = 'error';
                    console.log(error);
                }
            }
        });
    }

    public tempInstitutionId;
    setDeleteInstitution(institutionId) {
        this.tempInstitutionId = institutionId;
    }

    delete() {
        this._bDService.deleteInstitution(this.tempInstitutionId).subscribe({
            next: (response) => {
                this.tempInstitutionId = null;
                this.getInstitutions(this.page);
                this.getAllInstitutions();
            },
            error: (error) => {
                console.log(error);
            }
        });
    }

    actualPage() {
        this._route.params.subscribe(params => {
            let page = +params['page'];

            this.page = page;

            if (!page) {
                this.page = 1;
                this.nextPage = this.page + 1;
            } else {
                this.nextPage = page + 1;
                this.prevPage = page - 1;

                if (this.prevPage <= 0) {
                    this.prevPage = 1;
                }
            }

            this.getInstitutions(this.page);
        });
    }

    getAllCities() {
        this._bDService.getAllCities().pipe(
            catchError(error => {
                console.log('Error fetching cities:', error);
                return of([]);
            })
        ).subscribe({
            next: (response) => {
                if (response.cities) {
                    this.allCities = response.cities;
                    localStorage.setItem('cities', JSON.stringify(this.allCities));
                    this.items.institutionCity = this.allCities;
                }
            },
            error: (error) => {
                console.log(error);
            }
        });
    }

    onKeydown(e) {
        if (e.keyCode === 13) {
            // Cancel the default action, if needed
            e.preventDefault();
            // Trigger the button element with a click
            document.getElementById("save").click();
        }
    }

    onChanges(): void {
        this.subscriptions.add(
            this.institutionForm.valueChanges.subscribe(val => {
                if (val) {
                    this.status = null;
                    this.submitted = false;
                }
            })
        );

        this.subscriptions.add(
            this.editInstitutionForm.valueChanges.subscribe(val => {
                if (val) {
                    this.status = null;
                    this.submitted = false;
                }
            })
        );
    }
}
