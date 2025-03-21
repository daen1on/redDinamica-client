import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { UserService } from 'src/app/services/user.service';
import { User } from 'src/app/models/user.model';
import { GLOBAL } from 'src/app/services/global';
import { FIELDS_FORM, LABEL_PROFILE} from 'src/app/profile-module/services/profileData';

import { Subject } from 'rxjs';
import { first } from 'rxjs/operators';

import { takeUntil } from 'rxjs/operators';



@Component({
    selector: 'newUsers',
    templateUrl: './newUsers.component.html',
    styleUrls: ['./newUsers.component.css'],
    standalone: false
})
export class NewUsersComponent {
    public title:string;    
    public url;
    public user = new User();
    public users = [];
    public fields = FIELDS_FORM;
    public categories = LABEL_PROFILE;
    public openItem;

    // Pagination
    public page; // Actual page
    public pages; // Number of pages
    public total; // Total of records
    public prevPage;
    public nextPage;

    public loading = true;
    private unsubscribe$: Subject<void> = new Subject();


    constructor(
        private _UserService: UserService,
        private _route: ActivatedRoute,
        private _router:Router,
    ) { 
        this.title = 'Nuevos usuarios';
        this.url = GLOBAL.url;
        this.categories = LABEL_PROFILE;
    }

    ngOnInit(): void {        
        this.actualPage();
    }
    ngOnDestroy() {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
      }
      getNewUsers(page: number) {
        this._UserService.getNewUsers(page)
          .pipe(takeUntil(this.unsubscribe$))
          .subscribe({
            next: (response) => {
              
              this.users = response.users || []; // Ensure users is always an array
              this.total = response.total;
              this.pages = response.pages;
              this.loading = false; 
              // Navigate if the current page is greater than total pages
              if (page > this.pages) {
                this._router.navigate(['/admin/usuarios-nuevos']);
              }
            },
            error: (error) => {
              console.error("error nuevos usuarios: "+error);
              this.loading = false; // Ensure loading is set to false even on error
            }
          });
    }
    
    activeUser(user: any) {
        user['actived'] = true;
        this._UserService.updateUser(user)
          .pipe(takeUntil(this.unsubscribe$))
          .subscribe({
            next: (response) => {
              if (response.user) {
                this.users = this.users.filter((item) => item._id != response.user._id);
    
                if (this.users.length == 0) {
                  this._router.navigate(['/admin/usuarios-nuevos']);
                }
              }
            },
            error: (error) => {
              console.error(error);
            }
          });
    }
    
    removeUser(userId: string) {
        this._UserService.deleteUser(userId)
          .pipe(takeUntil(this.unsubscribe$))
          .subscribe({
            next: (response) => {
              if (response.user) {
                this.users = this.users.filter((item) => item._id != response.user._id);
    
                if (this.users.length == 0) {
                  this._router.navigate(['/admin/usuarios-nuevos']);
                }
              }
            },
            error: (error) => {
              console.error(error);
            }
          });
    }
    
    removeToOpenItem(){
        this.openItem = null;
    }

    
    addToOpenItem(userId){
        this.openItem = userId;
    }

    actualPage() {
        this._route.params.pipe(
            first(), 
            takeUntil(this.unsubscribe$)
        ).subscribe(params => {
            let page = +params['page'] || 1;
            this.page = page;
            this.nextPage = this.page + 1;
            this.prevPage = this.page - 1;
    
            if (this.prevPage <= 0) {
                this.prevPage = 1;
            }
    
            this.getNewUsers(this.page);
        });
    }
}
