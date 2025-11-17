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
    public searchTerm: string = '';
    public filteredFollowers: any[] = [];
    public filteredFollowing: any[] = [];


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
        // Cargar la lista de IDs que el usuario logueado sigue (para pintar botones correctamente)
        this.loadMyFollowingIds();
        
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
    
    private loadMyFollowingIds(): void {
        if (!this.identity?._id || !this.token) return;
        // Obtener a quién sigue el usuario autenticado (página 1 basta para poblar IDs base)
        this._followService.getFollowingUsers(this.token, this.identity._id, 1).subscribe({
            next: (resp: any) => {
                if (Array.isArray(resp?.following)) {
                    this.followingUsersId = resp.following;
                } else if (Array.isArray(resp?.follows)) {
                    // Fallback: mapear desde objetos retornados
                    this.followingUsersId = resp.follows
                        .map((f: any) => f?.followed?._id || f?.followed)
                        .filter((id: any) => !!id);
                }
            },
            error: () => {}
        });
    }
    
    private normalizeForSearch(value: string): string {
        if (!value) return '';
        // Normaliza a lower-case y elimina acentos/diacríticos
        return value
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    private matchTerm(text: string, term: string): boolean {
        if (!term) return true;
        return this.normalizeForSearch(text).includes(this.normalizeForSearch(term));
    }

    private matchUserFields(user: any, term: string): boolean {
        if (!user) return false;
        const name = user?.name || '';
        const surname = user?.surname || '';
        const email = user?.email || '';
        const full = `${name} ${surname}`.trim();
        return this.matchTerm(name, term) ||
               this.matchTerm(surname, term) ||
               this.matchTerm(full, term) ||
               this.matchTerm(email, term);
    }

    private applyFilter(): void {
        const term = (this.searchTerm || '').trim();
        if (this.activeButton === 'followers') {
            const base = this.followers || [];
            this.filteredFollowers = !term ? base : base.filter((f: any) => {
                // Para seguidores, el objeto con datos es f.user (f.followed puede ser solo un ID)
                const u = typeof f?.user === 'object' ? f.user : null;
                return this.matchUserFields(u, term);
            });
        } else {
            const base = this.following || [];
            this.filteredFollowing = !term ? base : base.filter((f: any) => {
                // Para siguiendo, el objeto con datos es f.followed (f.user puede ser solo un ID)
                const u = typeof f?.followed === 'object' ? f.followed : null;
                return this.matchUserFields(u, term);
            });
        }
    }

    onSearchChange(): void {
        console.log('searchTerm', this.searchTerm);
        console.log('filteredFollowers', this.filteredFollowers);
        console.log('filteredFollowing', this.filteredFollowing);
        this.applyFilter();
    }

    setActiveButton(activeButton) {
        this.activeButton = activeButton;

        if (this.activeButton == 'followers') {
            // reset paginación y lista al cambiar de pestaña
            this.followersPage = 1;
            this.followers = [];
            this.getFollowerUsers(1);
            this.filteredFollowers = [];
        } else {
            this.followingPage = 1;
            this.following = [];
            this.getFollowingUsers(1);
            this.filteredFollowing = [];
            // Asegurar que los IDs del usuario logueado estén cargados para pintar botones
            this.loadMyFollowingIds();
        }
        this.applyFilter();
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
                        // Si es el propio perfil, poblar IDs de seguidos desde el listado
                        if (this.identity?._id && this.ownProfile?._id && this.identity._id === this.ownProfile._id) {
                            this.followingUsersId = (this.following || [])
                                .map((f: any) => f?.followed?._id || f?.followed)
                                .filter((id: any) => !!id);
                        }
                        this.applyFilter();
                    } else {
                        // Cuando se hace scroll, se envía por acá la petición
                        for (let i in response.follows) {
                            this.following.push(response.follows[i]);
                        }
                        // Si es el propio perfil, acumular IDs para pintar correctamente los botones en páginas siguientes
                        if (this.identity?._id && this.ownProfile?._id && this.identity._id === this.ownProfile._id) {
                            const newIds = (response.follows || [])
                                .map((f: any) => f?.followed?._id || f?.followed)
                                .filter((id: any) => !!id);
                            const merged = [...(this.followingUsersId || []), ...newIds];
                            // Eliminar duplicados
                            this.followingUsersId = Array.from(new Set(merged));
                        }
                        this.applyFilter();
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
                        this.applyFilter();
                    } else {
                        // se envia al array de followers
                        for (let i in response.follows) {
                            this.followers.push(response.follows[i]);
                        }
                        this.applyFilter();
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
        if (this.loading) return;
        if (this.activeButton == 'followers') {
            const next = (this.followersPage || 1) + 1;
            if (this.followersPages && next > this.followersPages) {
                return;
            }
            this.loading = true;
            this.getFollowerUsers(next);
            this.followersPage = next;
            this.loading = false;
        } else {
            const next = (this.followingPage || 1) + 1;
            if (this.followingPages && next > this.followingPages) {
                return;
            }
            this.loading = true;
            this.getFollowingUsers(next);
            this.followingPage = next;
            this.loading = false;
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
