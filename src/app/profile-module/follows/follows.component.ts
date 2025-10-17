import { Component, OnInit } from '@angular/core';
import { UserService } from 'src/app/services/user.service';
import { GLOBAL } from 'src/app/services/GLOBAL';
import { FollowService } from 'src/app/services/follow.service';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from 'src/app/models/user.model';
import { LABEL_PROFILE } from '../services/profileData';
import { Follow } from 'src/app/models/follow.model';


@Component({
    selector: 'follows',
    templateUrl: './follows.component.html',
    standalone: false
})
export class FollowsComponent implements OnInit {
    public title: string;
    public fieldsForm;
    public identity;
    public url;

    public ownProfile = new User;
    public labelProfile = LABEL_PROFILE;
    public token;

    public status;
    public loading = false;
    public followers = [];
    public followingUsersId = [];
    //public followerUsersId = [];
    //public followingThisU = [];
    public followersTotal;
    public followersPages;
    public followersPage;

    public following = [];
    public followingTotal;
    public followingPages;
    public followingPage;

    public nextPage;
    public prevPage;
    public page;

    public throttle = 0;
    public distance = 2;
    public activeButton;


    constructor(
        private _userService: UserService,
        private _followService: FollowService,
        private _route: ActivatedRoute,
        private _router: Router
    ) {
        this.title = 'Red';
        this.identity = this._userService.getIdentity();
        this.token = this._userService.getToken();
        this.url = GLOBAL.url;
        this.activeButton = 'followers'; // Default
        this.followingPage = 1;

        this._route.parent.params.subscribe({next: (params) => {
            let id = params['id'];
            this.ownProfile._id = id;
        }});
    }

    ngOnInit(){
        this.actualPage();
        this.loadPage();
        
        // Leer query parameters para determinar qué pestaña mostrar
        this._route.queryParams.subscribe({next: (params) => {
            const tab = params['tab'];
            if (tab === 'following') {
                this.activeButton = 'following';
                this.setActiveButton('following');
            } else if (tab === 'followers') {
                this.activeButton = 'followers';
                this.setActiveButton('followers');
            } else {
                // Default a followers si no hay parámetro
                this.activeButton = 'followers';
                this.setActiveButton('followers');
            }
        }});
    }
    
    setActiveButton(activeButton) {
        this.activeButton = activeButton;

        if (this.activeButton == 'followers') {
            this.getFollowerUsers(this.page || 1);
        } else {
            this.getFollowingUsers(this.page || 1);
        }
    }
    
    loadPage() {
        this._route.parent.params.subscribe({next: (params) => {
            let id = params['id'];
            this.getUser(id);
        }});

        this._route.params.subscribe({next: (params) => {
            let reload = params['reload'];
            if (reload) {
               this._router.navigate(['perfil', this.ownProfile._id, 'red']);
            }
        }});
    }

    actualPage() {
        this._route.parent.params.subscribe({next: (params) => {
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
        }});
    }

    getUser(userId) {
        this._userService.getUser(userId).subscribe(
            { 
                next: (response) => {
                if (response.user) {
                    this.ownProfile = response.user;
                    this.followersPage = 1;
                    // No llamar automáticamente aquí, se llamará desde setActiveButton
                } else {
                    this.status = 'error';
                    this.ownProfile = this.identity;
                }
            },
            error: (error) => {
                console.log(<any>error);
                this.ownProfile = this.identity;
            }
    });
    }

    getFollowingUsers(page) {
        this._followService.getFollowingUsers(this.token, this.ownProfile._id, page).subscribe(
            { next: (response) => {
                if (response) {
                    if (page == 1) {
                        this.status = 'success';
                        this.following = response.follows;
                        this.followingPages = response.totalPages || response.pages;
                        this.followingTotal = response.total;
                    } else {
                        // Cuando se hace scroll, se envía por acá la petición
                        for (let i in response.follows) {
                            this.following.push(response.follows[i]);
                        }
                    }
                } else {
                    this.status = 'error';
                }
            },
            error: (error) => {
                console.log(<any>error);
            }
        });
    }

    getFollowerUsers(page) {
        this._followService.getFollowersUsers(this.token, this.ownProfile._id, page).subscribe(
            { next: (response) => {
                if (response) {
                    if (page == 1) {
                        this.status = 'success';
                        this.followers = response.follows;
                        this.followersPages = response.totalPages || response.pages;
                        this.followersTotal = response.total;
                        this.followingUsersId = response.following; // los que esta siguiendo el perfil logueado
                    } else {
                        // se envia al array de followers
                        for (let i in response.follows) {
                            this.followers.push(response.follows[i]);
                        }
                    }
                } else {
                    this.status = 'error';
                }
            },
            error: (error) => {
                console.log(<any>error);
            }
        });
    }

    // Follower systems buttons
    public followUserOver;
    mouseEnter(userId) {
        this.followUserOver = userId;
    }

    mouseLeave() {
        this.followUserOver = 0;
    }

    followUser(userId) {
        let follow = new Follow();
        follow.user = this.identity._id;
        follow.followed = userId;

        this._followService.addFollow(this.token, follow).subscribe(
            {next: (response) => {
                if (response) {
                    this.getFollowerUsers(this.page);
                    this.getFollowingUsers(this.page);
                }
            },
            error: (error) => {
                console.log(<any>error);
            }
        });
    }
    
    public TempU;
    getU(userId) {
        this.TempU = userId;
    }

    unfollow() {
        // así se llama a la función desde el botón de continuar
        this.unfollowUser(this.TempU);
        this.TempU = "";
    }

    onScrolld() {
        if (this.activeButton == 'followers') {
            this.followersPage += 1;
            if (this.followersPage <= this.followersPages) {
                this.loading = true;
                this.getFollowerUsers(this.followersPage);
                this.loading = false;
            }
        } else {
            this.followingPage += 1;
            if (this.followingPage <= this.followingPages) {
                this.loading = true;
                this.getFollowingUsers(this.followingPage);
                this.loading = false;
            }
        }
    }

    onScroll() {
        // Función alternativa de scroll si es necesaria
    }

    unfollowUser(userId) {
        this._followService.removeFollow(this.token, userId).subscribe(
            {next: (response) => {
                if (response) {
                    this.getFollowerUsers(this.page);
                    this.getFollowingUsers(this.page);
                }
            },
            error: (error) => {
                console.log(<any>error);
            }
        });
    }
}
