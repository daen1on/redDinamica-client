import { Component } from '@angular/core';
import { UserService } from 'src/app/services/user.service';
import { GLOBAL } from 'src/app/services/global';
import { FollowService } from 'src/app/services/follow.service';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from 'src/app/models/user.model';
import { LABEL_PROFILE } from '../services/profileData';
import { Follow } from 'src/app/models/follow.model';


@Component({
    selector: 'follows',
    templateUrl: './follows.component.html'
})
export class FollowsComponent {
    public title: string;
    public fieldsForm;
    public identity;
    public url;

    public ownProfile = new User;
    public labelProfile = LABEL_PROFILE;
    public token;

    public status;

    public followers = [];
    public followingUsersId = [];
    public followerUsersId = [];
    public followingThisU = [];
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
        this.activeButton = 'followers';
        this.followingPage = 1;


        this._route.parent.params.subscribe(params => {
            let id = params['id'];
            this.ownProfile._id = id;
        });
        


    }
    ngOnInit(){
        this.actualPage();
        this.loadPage();
        
    }
    
    public activeButton;
    setActiveButton(activeButton) {
        this.activeButton = activeButton;

        if (this.activeButton == 'followers') {
            this.getFollowerUsers(this.page);
        } else {
            this.getFollowingUsers(this.page);
        }
    }
    
    loadPage() {
        //console.log("identidad1: ", this.identity);
        //this.identity = this._userService.getIdentity(); desactivada pq esta redundando
        //console.log(this.identity); //probando si cambia 
        
        this._route.parent.params.subscribe(params => {
            let id = params['id'];

            this.getUser(id);
            
        });

        this._route.params.subscribe(params => {
            let reload = params['reload'];

            if (reload) {
               this._router.navigate(['perfil', this.ownProfile._id, 'red']);
               
            }

        });

    }

    actualPage() {
        this._route.parent.params.subscribe(params => {
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

        });
    }

    
    getUser(userId) {
        this._userService.getUser(userId).subscribe(
            response => {
                if (response.user) {
                    this.ownProfile = response.user;
                    this.followersPage=1; // desde aquí permite que entre a la función
                    this.getFollowerUsers(this.followersPage);
                    //this.getFollowingUsers(this.followingPage);

                } else {
                    this.status = 'error';
                    this.ownProfile = this.identity;
                }
            },
            error => {
                console.log(<any>error);
                this.ownProfile = this.identity;

            }
        );
    }

    getFollowingUsers(page) {
        this._followService.getFollowingUsers(this.token, this.ownProfile._id, page).subscribe(
            response => {
                if (response) {
                    if (page==1){
                    this.status = 'success';
                    this.following = response.follows;
                    this.followingPages = response.pages;
                    this.followingTotal = response.total;
                    }
                    else{
                        //console.log(response.follows);
                        //console.log(this.following);
                        //Cuando se hace scroll, se envía por acá la petición
                        for (let i in response.follows){
                            this.following.push(response.follows[i]);
                        }
                        //console.log(this.following);
                        }
                } else {
                    this.status = 'error';
                }
            },
            error => {
                console.log(<any>error);
            }
        );
    }

    getFollowerUsers(page) {
        this._followService.getFollowersUsers(this.token, this.ownProfile._id, page).subscribe(
            response => {
                if (response) {
                    if (page==1){
                    this.status = 'success';
                    this.followers = response.follows;
                    this.followersPages = response.pages;
                    this.followersTotal = response.total;
                    this.followerUsersId = response.followers; //seguidores del perfil que se visita
                    this.followingUsersId = response.following; //seguidos del perfil que se visita
                    console.log("oh");      
                    }
                    else{
                        //se envia al array  de followers
                        for (let i in response.follows){

                            this.followers.push(response.follows[i]);
                        }
                    }

                } else {
                    this.status = 'error';
                }
            },
            error => {
                console.log(<any>error);
            }
        );
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
            response => {

                if (response) {
                    this.getFollowingUsers(this.page);
                    this.getFollowerUsers(this.page);
                }

            },
            error => {
                console.log(<any>error);
            }
        )
    }
    public TempU;
    getU(userId){
        //console.log(userId);

        this.TempU = userId;
        
    }

    unfollow(){
        //así se llama a la función desde el botón de continuar
        this.unfollowUser(this.TempU);
        this.TempU="";
     
    }
    onScrolld(){
        //following
        if (this.page<this.followingPages){
            this.page++;
            this.getFollowingUsers(this.page);
            //console.log("seguidos",this.followingPages);
            //console.log("actual",this.page)
        }


    }
    onScroll(){  
        //followers
        if (this.page<this.followersPages){
            console.log(this.page);
            this.page++;
            
            this.getFollowerUsers(this.page);
            
        }

    }
    unfollowUser(userId) {
        let index;

        this._followService.removeFollow(this.token, userId).subscribe(
            response => {
                //console.log(response)
                if (response) {
                    this.getFollowingUsers(this.page);
                    this.getFollowerUsers(this.page);
                }

            },
            error => {
                console.log(<any>error);
            }
        )
    }
}
