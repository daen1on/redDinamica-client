import { Component, OnInit, OnDestroy } from '@angular/core';
import { UserService } from '../services/user.service';

import { PROFILE_MENU, LABEL_PROFILE } from './services/profileData';
import { GLOBAL } from '../services/GLOBAL';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { User } from '../models/user.model';
import { FollowService } from '../services/follow.service';
import { Follow } from '../models/follow.model';
import { NewUsersComponent } from '../admin-module/users/newUsers/newUsers.component';

@Component({
    selector: 'profile',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.css'],
    standalone: false
})
export class ProfileComponent implements OnInit, OnDestroy {
    public title: string = 'Perfil';
    public url: string;
    public token;
    
    public categories;
    public menuOptions;
    public ownProfile: User = new User();
    public status: string;
    public identity: any;
    public following;
    public follower;
    public counters;
    public about: string = ''; // Inicializar con string vacío para evitar errores
    public profilePicVersion: number; // Para cache-busting de la imagen de perfil
    public aboutExpanded: boolean = false; // Para controlar la expansión del "Acerca de"
    
    // Variables para el manejo de seguir/dejar de seguir
    public followUserOver: string | null = null;
    public tempUserId: string | null = null;
    
    // Suscripciones
    private identitySubscription: Subscription;
    private profilePicUpdateSubscription: Subscription;
    
    constructor(
        private _userService: UserService,
        private _router: Router,
        private _route: ActivatedRoute,
        private _followService: FollowService,   
    ) {
        this.url = GLOBAL.url;
        this.token = _userService.getToken();
        this.menuOptions = PROFILE_MENU;
        this.categories = LABEL_PROFILE;
        this.counters = { 
            following: 0, 
            followed: 0,
            publications: 0,
            lessons: 0
        }
        
        this.profilePicVersion = new Date().getTime(); // Inicializar versión de imagen
        
        this.loadPage();
    }


    ngOnInit(): void {
        // Verificar que el usuario esté autenticado antes de continuar
        this.identity = this._userService.getIdentity();
        if (!this.identity || !this.token) {
            console.log('No hay usuario autenticado, redirigiendo a home');
            this._router.navigate(['/']);
            return;
        }

        this.loadPage();
        
        // Suscribirse a cambios de identidad para actualizar automáticamente
        this.identitySubscription = this._userService.identityChanged.subscribe(
            (newIdentity) => {
                if (newIdentity && this.identity && newIdentity._id === this.identity._id) {
                    this.ownProfile = newIdentity;
                }
            }
        );

        // Suscribirse a actualizaciones de imagen de perfil
        this.profilePicUpdateSubscription = this._userService.profilePictureUpdated.subscribe(() => {
            console.log('Profile picture updated event received in ProfileComponent, updating version.');
            // Actualizar la versión para cache-busting
            this.profilePicVersion = new Date().getTime();
            
            // Recargar el perfil para obtener la información más actualizada
            this._route.params.subscribe(params => {
                let id = params['id'];
                if (id) {
                    this.getUser(id);
                }
            });
            
            // Actualizar el perfil si es el mismo usuario
            const currentIdentity = this._userService.getIdentity();
            if (currentIdentity && this.identity && currentIdentity._id === this.identity._id) {
                this.ownProfile = currentIdentity;
            }
        });
    }
    
    ngOnDestroy(): void {
        if (this.identitySubscription) {
            this.identitySubscription.unsubscribe();
        }
        if (this.profilePicUpdateSubscription) {
            this.profilePicUpdateSubscription.unsubscribe();
        }
    }

    ngDoCheck(): void {

        this._route.params.subscribe(params => {
            let id = params['id'];

            if (this.identity._id == id) {
                this.ownProfile = this._userService.getIdentity();
            }
        })
    }

    // Funciones auxiliares para el template
    getRoleClass(role: string): string {
        return this.categories && this.categories[role] ? this.categories[role].class : '';
    }

    getRoleLabel(role: string): string {
        return this.categories && this.categories[role] ? this.categories[role].label : '';
    }

    hasRoleCategory(role: string): boolean {
        return this.categories && this.categories[role] ? true : false;
    }

    loadPage() {

        this.identity = this._userService.getIdentity();
        
        // Verificar nuevamente la autenticación
        if (!this.identity || !this.token) {
            console.log('No hay usuario autenticado en loadPage, redirigiendo a home');
            this._router.navigate(['/']);
            return;
        }

        this._route.params.subscribe(params => {
            let id = params['id'];
            
            // Validar que el ID existe
            if (!id) {
                console.log('No se proporcionó ID de usuario, redirigiendo al perfil propio');
                this._router.navigate(['/perfil', this.identity._id]);
                return;
            }

            this.getUser(id);
        });
    }

    getUser(userId) {
        this._userService.getUser(userId).subscribe({
            next: (response) => {
                if (response.user) {
                    this.following = response.following;
                    this.follower = response.follower;
                    this.ownProfile = response.user;
                    
                    // Verificar que about existe antes de procesarlo
                    if (this.ownProfile.about) {
                        this.about = this.ownProfile.about.toString();
                        this.about = this.truncateChar(this.about);
                    } else {
                        this.about = '';
                    }
                    
                    this.getCounters(userId);

                } else {
                    console.log('Usuario no encontrado, redirigiendo al perfil propio');
                    this.status = 'error';
                    this.ownProfile = this.identity;
                    this._router.navigate(['/perfil/' + this.identity._id]);
                }
            },
            error: (error) => {
                console.log("Error en profile: ", <any>error);
                this.ownProfile = this.identity;
                this._router.navigate(['/perfil/' + this.identity._id]);
            }
        });
    }

    truncateChar(text: string): string {
        let charlimit = 200;
        if (!text || text.length <= charlimit) {
            return text;
        }

        let without_html = text.replace(/<(?:.|\n)*?>/gm, '');
        let shortened = without_html.substring(0, charlimit) + "...";
        return shortened;
    }
   
    getCounters(userId){
                
            this._userService.getCounters(userId).subscribe({
                next: (response) => {
                    if (response) {       
                        
                        if(this.identity._id != userId){
                            localStorage.setItem('ownProfileStats', JSON.stringify(response));
                            this.counters = JSON.parse(localStorage.getItem('ownProfileStats'));
                        }else{
                            localStorage.setItem('stats', JSON.stringify(response));
                            this.counters = JSON.parse(localStorage.getItem('stats'));
                        }                        
                                           
                    } else {
                        this.status = 'error';
                        this.ownProfile = this.identity;
                    }
                },
                error: (error) => {
                    console.log(<any>error);
                    this.ownProfile = this.identity;
                    this._router.navigate(['/perfil/' + this.identity._id]);
                }
            });
    }

    // Funciones para seguir/dejar de seguir
    followUser(userId: string) {
        const followData = { followed: userId };
        this._followService.addFollow(this.token, followData).subscribe({
            next: (response) => {
                if (response.follow) {
                    this.following = response.follow;
                    // Actualizar contador
                    this.counters.followed = this.counters.followed + 1;
                }
            },
            error: (error) => {
                console.log(<any>error);
            }
        });
    }

    unfollowUser(userId: string) {
        this._followService.removeFollow(this.token, userId).subscribe({
            next: (response) => {
                if (response.follow) {
                    this.following = null;
                    // Actualizar contador
                    this.counters.followed = Math.max(0, this.counters.followed - 1);
                }
            },
            error: (error) => {
                console.log(<any>error);
            }
        });
    }

    // Funciones para el hover del botón de seguir
    mouseEnter(userId: string) {
        this.followUserOver = userId;
    }

    mouseLeave() {
        this.followUserOver = null;
    }

    // Función para el modal de dejar de seguir
    getus(userId: string) {
        this.tempUserId = userId;
    }

    unfollow() {
        if (this.tempUserId) {
            this.unfollowUser(this.tempUserId);
            this.tempUserId = null;
        }
    }

    // Funciones para mostrar seguidores y seguidos
    showFollowing() {
        // Navegar a la sección de red mostrando seguidos
        this._router.navigate(['/perfil', this.ownProfile._id.toString(), 'red'], { 
            queryParams: { tab: 'following' } 
        });
        console.log('Navegando a usuarios seguidos');
        
        // Scroll automático hacia abajo después de un breve delay
        setTimeout(() => {
            this.scrollToContent();
        }, 300);
    }

    showFollowers() {
        // Navegar a la sección de red mostrando seguidores
        this._router.navigate(['/perfil', this.ownProfile._id.toString(), 'red'], { 
            queryParams: { tab: 'followers' } 
        });
        console.log('Navegando a seguidores');
        
        // Scroll automático hacia abajo después de un breve delay
        setTimeout(() => {
            this.scrollToContent();
        }, 300);
    }

    // Función para navegar a publicaciones
    goToPublications() {
        this._router.navigate(['/perfil', this.ownProfile._id.toString(), 'publicaciones']);
        console.log('Navegando a publicaciones');
        
        // Scroll automático hacia abajo después de un breve delay
        setTimeout(() => {
            this.scrollToContent();
        }, 300);
    }

    // Función para navegar a lecciones
    goToLessons() {
        this._router.navigate(['/perfil', this.ownProfile._id.toString(), 'lecciones']);
        console.log('Navegando a lecciones');
        
        // Scroll automático hacia abajo después de un breve delay
        setTimeout(() => {
            this.scrollToContent();
        }, 300);
    }

    // Función de compatibilidad
    public TempU;
    getus_old(userId){
        //console.log(userId);
        this.TempU = userId;
    }

    // Verifica si estamos en la ruta de publicaciones
    isOnPublications(): boolean {
        const currentUrl = this._router.url;
        return currentUrl.includes('/publicaciones') || currentUrl.endsWith('/' + this.ownProfile._id);
    }

    // Verifica si estamos en una ruta que NO es publicaciones (para mostrar el botón flotante)
    shouldShowFloatingButton(): boolean {
        const currentUrl = this._router.url;
        return currentUrl.includes('/lecciones') || 
               currentUrl.includes('/info') || 
               currentUrl.includes('/red') ||
               currentUrl.includes('/editar');
    }

    // Método para actualizar la versión de la imagen de perfil
    updateProfilePictureVersion(): void {
        this.profilePicVersion = new Date().getTime();
        console.log('Profile picture version updated to:', this.profilePicVersion);
    }

    // Método para recargar completamente el perfil
    reloadProfile(): void {
        this._route.params.subscribe(params => {
            let id = params['id'];
            if (id) {
                this.getUser(id);
                this.updateProfilePictureVersion();
            }
        });
    }

    // Método para hacer scroll suave hacia el contenido
    private scrollToContent(): void {
        const contentElement = document.getElementById('content');
        if (contentElement) {
            contentElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        } else {
            // Fallback: scroll hacia abajo de manera suave
            window.scrollTo({ 
                top: window.innerHeight * 0.8, 
                behavior: 'smooth' 
            });
        }
    }

    // Método para expandir/contraer el "Acerca de"
    toggleAbout(): void {
        this.aboutExpanded = !this.aboutExpanded;
    }

    // Método para separar las redes sociales por punto y coma
    getSocialLinks(socialNetworks: string | String): string[] {
        if (!socialNetworks) return [];
        
        // Convertir a string primitivo si es necesario
        const networksStr = socialNetworks.toString();
        
        return networksStr.split(';')
            .map(link => link.trim())
            .filter(link => link.length > 0);
    }

    // Método para formatear los enlaces y asegurar que tengan protocolo
    formatLink(link: string): string {
        if (!link) return '';
        
        const trimmedLink = link.trim();
        
        // Si ya tiene protocolo, devolverlo tal como está
        if (trimmedLink.startsWith('http://') || trimmedLink.startsWith('https://')) {
            return trimmedLink;
        }
        
        // Si no tiene protocolo, agregar https://
        return 'https://' + trimmedLink;
    }

    // Método para abrir modal de unfollow con manejo correcto del DOM
    openUnfollowModal(userId: string) {
        this.getus(userId);
        
        // Esperar a que Angular actualice el DOM
        setTimeout(() => {
            try {
                const modal = document.getElementById('unfollowus');
                if (modal) {
                    // Limpiar cualquier instancia previa
                    const existingInstance = (window as any).bootstrap?.Modal?.getInstance(modal);
                    if (existingInstance) {
                        existingInstance.dispose();
                    }
                    
                    // Crear nueva instancia
                    const bootstrapModal = new (window as any).bootstrap.Modal(modal, {
                        backdrop: 'static',
                        keyboard: false
                    });
                    bootstrapModal.show();
                }
            } catch (error) {
                console.log('Error al abrir modal de dejar de seguir:', error);
            }
        }, 0);
    }
}



