import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from 'src/app/services/user.service';
import { BasicDataService } from 'src/app/services/basicData.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ADD_FIELDS_FORM, CATEGORIES_ADMIN, CATEGORIES, LABEL_PROFILE, EDIT_FIELDS_FORM } from '../services/usersData';
import { User } from 'src/app/models/user.model';
import { City } from 'src/app/models/city.model';
import { Profession } from 'src/app/models/profession.model';
import { Institution } from 'src/app/models/institution.model';
import { GLOBAL } from 'src/app/services/global';
import { lastValueFrom, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';


@Component({
    selector: 'users',
    templateUrl: './users.component.html',
    styleUrls: ['./users.component.css'],
    standalone: false
})
export class UsersComponent implements OnInit {
    public labelProfile = LABEL_PROFILE;
    public title: string;
    public url;
    public addFieldsForm = ADD_FIELDS_FORM;
    public editFieldsForm = EDIT_FIELDS_FORM;
    public categories;
    public identity;
    public addCity = false;
    public openItem;

    public submitted = false;
    public editSubmitted = false;
    public status;
    public editStatus;
    public addForm: FormGroup;
    public city = new City();
    public profession = new Profession('');
    public institution = new Institution();
    public state;
    public country;
    public editForm: FormGroup;
    public user = new User();
    public users = [];

    // Pagination
    public page; // Actual page
    public pages; // Number of pages
    public total; // Total of records
    public prevPage;
    public nextPage;

    // Filter
    public filter;
    public allUsers;
    public selectedCategory = [];

    // Select data
    public items;
    public allCities;
    public allProfessions: any;
    public allInstitutions;

    public loading = true;

    constructor(
        private _bDService: BasicDataService,
        private _userService: UserService,
        private _route: ActivatedRoute,
        private _router: Router,
        private fb: FormBuilder,
    ) {
        this.title = 'Usuarios';
        this.identity = _userService.getIdentity();
        this.categories = CATEGORIES;
        this.url = GLOBAL.url;

        if (this.identity.role == 'admin') {
            this.categories = CATEGORIES_ADMIN;
        }

        this.addForm = this.fb.group({
            name: ['', Validators.required],
            surname: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            profession: ['', Validators.required],
            institution: ['', Validators.required],
            city: ['', Validators.required],
            category: ['', Validators.required],
            canAdvise: ['false'],
        });

        this.editForm = this.fb.group({
            name: [''],
            surname: [''],
            email: [''],
            profession: [''],
            institution: [''],
            about: [''],
            city: [''],
            category: [''],
            canAdvise: [''],
            postgraduate: ['']
        });

        this.state = this.fb.control('');
        this.country = this.fb.control('');
        this.items = {
            city: [],
            institution: [],
            profession: []
        };

        this.filter = this.fb.control('');
    }

    ngOnInit(): void {
        this.getAllUsers();
        this.getAllCities();
        this.getAllInstitutions();
        this.getAllProfessions();
        this.actualPage();
    }

    // Get controls form
    get f() { return this.addForm.controls; }
    get f2() { return this.editForm.controls; }

  
    getAllCities() {
        this.allCities = JSON.parse(localStorage.getItem('cities'));
        if (!this.allCities) {
            this._bDService.getAllCities().subscribe({
                next: (response) => {
                    if (response.cities) {
                        this.allCities = response.cities;
                        localStorage.setItem('cities', JSON.stringify(this.allCities));
                    }
                },
                error: (error) => {
                    console.log(<any>error);
                }
            });
        }
    }

    getAllProfessions() {
        this.allProfessions = JSON.parse(localStorage.getItem('professions'));
        if (!this.allProfessions) {
            this._bDService.getAllProfessions().subscribe({
                next: (response) => {
                    if (response.professions) {
                        this.allProfessions = response.professions;
                        localStorage.setItem('professions', JSON.stringify(this.allProfessions));
                    }
                },
                error: (error) => {
                    console.log(<any>error);
                }
            });
        }
    }

    getAllInstitutions() {
        this.allInstitutions = JSON.parse(localStorage.getItem('institutions'));

        if (!this.allInstitutions) {
            this._bDService.getAllInstitutions().subscribe({
                next: (response) => {
                    if (response.institutions) {
                        this.allInstitutions = response.institutions;
                        localStorage.setItem('institutions', JSON.stringify(this.allInstitutions));
                    }
                },
                error: (error) => {
                    console.log(<any>error);
                }
            });
        }
    }

    setAdd() {
        if (!this.status) {
            this.status = null;            
        }
        this.submitted = false;
        this.items.city = this.allCities;
        this.items.institution = this.allInstitutions;
        this.items.profession = this.allProfessions;
    }

    async onSubmit() {
        this.submitted = true;
    
        if (this.addForm.invalid) {
            return;
        }
    
        this.user.name = this.addForm.value.name;
        this.user.surname = this.addForm.value.surname;
        this.user.email = this.addForm.value.email;
    
        if (this.addForm.value.city) {
            this.user.city = this.addForm.value.city._id;
        }
    
        if (this.addForm.value.profession) {
            this.user.profession = this.addForm.value.profession._id;
        }
    
        if (this.addForm.value.institution) {
            this.user.institution = this.addForm.value.institution._id;
        }
    
        this.user.role = this.addForm.value.category;        
        this.user.canAdvise = this.addForm.value.canAdvise == 'true' ? true : false;
    
        try {
            if (!this.user.city && this.addForm.value.city) {
                this.city.name = this.addForm.value.city.name;
                this.city.state = this.state.value;
                this.city.country = this.country.value;
    
                const responseAddCity = await lastValueFrom(this._bDService.addCity(this.city));
    
                if (responseAddCity.city && responseAddCity.city._id) {
                    this.user.city = responseAddCity.city._id;
                    this.state.reset();
                    this.country.reset();
    
                    localStorage.removeItem('cities');
                    this.getAllCities();
                } else {
                    console.log(responseAddCity);
                }
            }
    
            if (!this.user.profession && this.addForm.value.profession) {
                this.profession.name = this.addForm.value.profession.name;
    
                const responseAddProfession = await lastValueFrom(this._bDService.addProfession(this.profession));
    
                if (responseAddProfession.profession && responseAddProfession.profession._id) {
                    this.user.profession = responseAddProfession.profession._id;
    
                    localStorage.removeItem('professions');
                    this.getAllProfessions();
                } else {
                    console.log(responseAddProfession);
                }
            }
    
            if (!this.user.institution && this.addForm.value.institution) {
                this.institution.name = this.addForm.value.institution.name;
    
                const responseAddInstitution = await lastValueFrom(this._bDService.addInstitution(this.institution));
    
                if (responseAddInstitution.institution && responseAddInstitution.institution._id) {
                    this.user.institution = responseAddInstitution.institution._id;
    
                    localStorage.removeItem('institutions');
                    this.getAllInstitutions();
                } else {
                    console.log(responseAddInstitution);
                }
            }
    
            const responseAddUser = await lastValueFrom(this._userService.registerByAdmin(this.user));
    
            if (responseAddUser.user && responseAddUser.user._id) {
                this.addForm.reset();
                this.status = "success";
                this.submitted = false;
            } else {
                this.status = "error";
            }
    
            this.getUsers(this.page);
            this.getAllUsers();
            this.setAdd();
    
            document.querySelector('.modal-body').scrollTop = 0;
        } catch (error) {
            this.status = "error";
            console.log(error);
        }
    }

    public tempUser;
    setEdit(user) {
        let city;
        let profession;
        let institution;

        this.editStatus = null;
        this.editSubmitted = false;

        this.tempUser = user;
        this.user = null;

        if (this.tempUser.city) {
            city = `${this.tempUser.city.name}, ${this.tempUser.city.state}, ${this.tempUser.city.country}`;
        }

        if (this.tempUser.profession) {
            profession = this.tempUser.profession.name;
        }

        if (this.tempUser.institution) {
            institution = this.tempUser.institution.name;
        }

        this.editForm.patchValue({
            name: this.tempUser.name,
            surname: this.tempUser.surname,
            about: this.tempUser.about,
            email: this.tempUser.email,
            city: city,
            profession: profession,
            institution: institution,
            category: this.tempUser.role,
            canAdvise: this.tempUser.canAdvise.toString()
        });


    }
    onEditSubmit() {
        this.submitted = true;

        if (this.editForm.invalid) {
            return;
        }


        this.user = this.tempUser;
        if(this.tempUser.city){
            this.user.city = this.tempUser.city._id;
        }
        this.user.institution = this.tempUser.institution._id;
        this.user.profession = this.tempUser.profession._id;
        this.user.role = this.editForm.value.category;
        this.user.canAdvise = this.editForm.value.canAdvise == 'true' ? true : false;

        this._userService.updateUser(this.user).subscribe(
            response => {
                if (response.user && response.user._id) {
                    this.editStatus = 'success';
                    this.getUsers(this.page);
                    this.getAllUsers();

                } else {
                    this.editStatus = 'error';
                }
            },
            error => {
                this.editStatus = 'error';
                console.log(<any>error);
            }
        );

        document.querySelector('div#modal-body').scrollTop = 0;

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

            this.getUsers(this.page);
        });
    }

    getUsers(page) {
        this._userService.getUsers(page).subscribe({
            next: (response) => {
                if (response.users) {
                    this.users = response.users;
    
                    this.total = response.total;
                    this.pages = response.pages;
                    if (page > this.pages) {
                        this._router.navigate(['/admin/usuarios']);
                    }
    
                    this.loading = false;
                }
            },
            error: (error) => {
                console.log(<any>error);
            }
        });
    }
    
    getAllUsers() {
        let filteredUsers = [];
        this._userService.getAllUsers().subscribe({
            next: (response) => {
                if (response.users) {
                    this.allUsers = response.users;
    
                    if (this.selectedCategory.length > 0) {
                        this.selectedCategory.forEach((category) => {
                            filteredUsers = filteredUsers.concat(this.allUsers.filter((user) => {
                                return user.role == category;
                            }));
                        });
    
                        this.allUsers = filteredUsers;
                    }
                }
            },
            error: (error) => {
                console.log(<any>error);
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
    
    removeUser(userId) {
        // Primero forzar logout del usuario para invalidar su token
        this._userService.forceUserLogout(userId)
            .pipe(
                // Continuar con la eliminación independientemente del resultado del logout
                catchError((error) => {
                    console.log('Error al forzar logout (continuando con eliminación):', error);
                    return of(null); // Continuar el flujo
                }),
                // Eliminar el usuario después de forzar el logout
                switchMap(() => this._userService.deleteUser(userId))
            )
            .subscribe({
                next: (response) => {
                    if (response.user) {
                        this.users = this.users.filter((item) => {
                            return item._id != response.user._id;
                        });
                        this.getUsers(this.page);
                        this.getAllUsers();
                    }
                },
                error: (error) => {
                    console.log(<any>error);
                    alert('Error al eliminar el usuario. Por favor, intenta nuevamente.');
                }
            });
    }
    addToOpenItem(userId) {
        this.openItem = userId;
    }

    addCityData(e, controlName) {
        if (e && !e._id && controlName == "city") {
            this.addCity = true;
        } else {
            this.addCity = false;
        }
    }

    setCategory(category) {
        if (this.selectedCategory.indexOf(category) >= 0) {
            this.selectedCategory.splice(this.selectedCategory.indexOf(category), 1);
        } else {
            this.selectedCategory.push(category);
        }

        this.getAllUsers();
    }

    restartValues() {
        this.status = null;
        this.submitted = false;
    }

    onChanges(): void {
        this.addForm.valueChanges.subscribe(val => {
            if (val) {
                this.status = null;
                this.submitted = false;
            }
        });

        this.editForm.valueChanges.subscribe(val => {
            if (val) {
                this.editStatus = null;
                this.editSubmitted = false;
            }
        });
    }
}
