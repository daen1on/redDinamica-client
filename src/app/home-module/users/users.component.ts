import { Component } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators, FormBuilder } from '@angular/forms';

import { BasicDataService } from 'src/app/services/basicData.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ADD_FIELDS_FORM, CATEGORIES, LABEL_PROFILE, EDIT_FIELDS_FORM } from './services/usersData';
import { UserService } from 'src/app/services/user.service';
import { FollowService } from 'src/app/services/follow.service';


import { Follow } from 'src/app/models/follow.model';
import { User } from 'src/app/models/user.model';
import { City } from 'src/app/models/city.model';
import { Profession } from 'src/app/models/profession.model';
import { Institution } from 'src/app/models/institution.model';
import { GLOBAL } from 'src/app/services/GLOBAL';

import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
@Component({
    selector: 'users',
    templateUrl: './users.component.html',
    styleUrls: ['./users.component.css'],
    standalone: false
})
export class UsersComponent {
    public title: string;
    public url;
    public token;
    
    public addFieldsForm = ADD_FIELDS_FORM;
    public editFieldsForm = EDIT_FIELDS_FORM;
    public categories;
    public labelProfile = LABEL_PROFILE;
    public identity;
    public addCity = false;
    public openItem;

    public submitted = false;
    public editSubmitted = false;
    public status;
    public editStatus;
    public addForm;
    public city = new City();
    public profession = new Profession('');
    public institution = new Institution();
    public state;
    public country;
    public editForm;
    public user = new User();
    public users = [];
    public following;
    public followers;

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
    private unsubscribe$ = new Subject<void>();

    constructor(
        private _bDService: BasicDataService,
        private _userService: UserService,   
        private _followService: FollowService,     
        private _route: ActivatedRoute,
        private _router: Router,        
    ) {

        this.title = 'Usuarios';
        this.identity = _userService.getIdentity();
        this.token = _userService.getToken();
        this.categories = CATEGORIES;
        this.url = GLOBAL.url;

        this.addForm = new UntypedFormGroup({
            name: new UntypedFormControl('', Validators.required),
            surname: new UntypedFormControl('', Validators.required),
            email: new UntypedFormControl('', [Validators.required, Validators.email]),
            profession: new UntypedFormControl(''),
            institution: new UntypedFormControl(''),
            city: new UntypedFormControl(''),
            category: new UntypedFormControl('', Validators.required)
        });

        this.editForm = new UntypedFormGroup({
            name: new UntypedFormControl(''),
            surname: new UntypedFormControl(''),
            email: new UntypedFormControl(''),
            profession: new UntypedFormControl(''),
            institution: new UntypedFormControl(''),
            about: new UntypedFormControl(''),
            city: new UntypedFormControl(''),
            category: new UntypedFormControl(''),
            postgraduate: new UntypedFormControl('')
        });

        this.state = new UntypedFormControl('');
        this.country = new UntypedFormControl('');
        this.items = {
            city: [],
            institution: [],
            profession: []
        };

        this.filter = new UntypedFormControl();

    }

    ngOnInit(): void {
        this.getAllUsers();
        this.getAllCities();
        this.getAllInstitutions();
        this.getAllProfessions();
        this.actualPage();
    }
    
    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    // Get controls form
    get f() { return this.addForm.controls; }
    get f2() { return this.editForm.controls; }

    getAllCities() {
        this._bDService.getAllCities().pipe(
            takeUntil(this.unsubscribe$)
        ).subscribe({
            next: (response) => {
                if (response.cities) {
                    this.allCities = response.cities;
                    localStorage.setItem('cities', JSON.stringify(this.allCities));
                }
            },
            error: (error) => {
                console.error('Error fetching cities:', error);
            }
        });
    }
    

    getAllProfessions() {
        this.allProfessions = JSON.parse(localStorage.getItem('professions'));
        if (!this.allProfessions) {
            this._bDService.getAllProfessions().pipe(
                takeUntil(this.unsubscribe$)
            ).subscribe({
                next: (response) => {
                    if (response.professions) {
                        this.allProfessions = response.professions;
                        localStorage.setItem('professions', JSON.stringify(this.allProfessions));
                    }
                },
                error: (error) => {
                    console.error('Error fetching professions:', error);
                }
            });
        }
    }
    
   


    getAllInstitutions() {
        this.allInstitutions = JSON.parse(localStorage.getItem('institutions'));
        if (!this.allInstitutions) {
            this._bDService.getAllInstitutions().pipe(
                takeUntil(this.unsubscribe$)
            ).subscribe({
                next: (response) => {
                    if (response.institutions) {
                        this.allInstitutions = response.institutions;
                        localStorage.setItem('institutions', JSON.stringify(this.allInstitutions));
                    }
                },
                error: (error) => {
                    console.error('Error fetching institutions:', error);
                }
            });
        }
    }
    actualPage() {

        // Handling route parameters
        this._route.params.pipe(
            takeUntil(this.unsubscribe$)
            ).subscribe(params => {
                let page = +params['page'] || 1;
                this.page = page;
                this.nextPage = page + 1;
                this.prevPage = page - 1;   
                if (this.prevPage <= 0) {
                    this.prevPage = 1;
                }
                this.getUsers(this.page);
            });
    }

    getUsers(page) {
        this.loading = true;  // Ensure loading is true when the function starts
        this._userService.getUsers(page).pipe(
            takeUntil(this.unsubscribe$)
        ).subscribe({
            next: (response) => {
                if (response.users) {
                  //  console.log("Full API Response:", response);

                    this.users = response.users;
                    this.total = response.totalItems;
                    this.pages = response.totalPages;
                    this.followers = response.followers;
                    this.following = response.following;
                    if (page > this.pages) {
                        this._router.navigate(['/inicio/usuarios']);
                    }
                    this.loading = false;
                } else {
                    // Handle case when there are no users
                    this.loading = false;
                    console.log('No users found');
                }
            },
            error: (error) => {
                this.loading = false;
                console.error('Error fetching users:', error);
            }
        });
    }
    
    getAllUsers() {
        let filteredUsers = [];
        this._userService.getAllUsers().pipe(
            takeUntil(this.unsubscribe$)
        ).subscribe({
            next: (response) => {
                if (response.users) {
                    this.allUsers = response.users;
                    this.followers = response.followers;
                    this.following = response.following;
    
                    if (this.selectedCategory.length > 0) {
                        this.selectedCategory.forEach((category) => {
                            filteredUsers = filteredUsers.concat(this.allUsers.filter((user) => user.role === category));
                        });
                        this.allUsers = filteredUsers;
                    }
                }
            },
            error: (error) => {
                console.error('Error fetching all users:', error);
            }
        });
    }
     
    
   
    setCategory(category) {
        if (this.selectedCategory.indexOf(category) >= 0) {
            if(category == 'delegated_admin'){
                this.selectedCategory.splice(this.selectedCategory.indexOf('admin'), 1);
            }
            this.selectedCategory.splice(this.selectedCategory.indexOf(category), 1);
        } else {
            if(category == 'delegated_admin'){
                this.selectedCategory.push('admin');            
            }
            this.selectedCategory.push(category);
        }

        this.getAllUsers();
    }

    // Follower systems buttons
    public followUserOver;
    mouseEnter(userId){
        this.followUserOver = userId;        
    }

    
    mouseLeave(){
        this.followUserOver = 0;        
    }

    followUser(userId) {
        let follow = new Follow();
        follow.user = this.identity._id;
        follow.followed = userId;
    
        this._followService.addFollow(this.token, follow).subscribe({
            next: (response) => {
                if (response.follow) {  // Assume the response is structured correctly
                    this.following.push(response.follow.followed);
                }
            },
            error: (error) => {
                console.error('Failed to follow user:', error);
            }
        });
    }
    
    
    public TempU;
    
    getU(userId){
        console.log(userId);
        this.TempU = userId;
        
    }
    unfollow(){
        this.unfollowUser(this.TempU);
        this.TempU="";
     
    }
    unfollowUser(userId) {
        this._followService.removeFollow(this.token, userId).subscribe({
            next: (response) => {
                const index = this.following.indexOf(userId); // Make sure the index is found correctly
                if (index !== -1) {
                    this.following.splice(index, 1);
                }
            },
            error: (error) => {
                console.error('Failed to unfollow user:', error);
            }
        });
    }
    
}
