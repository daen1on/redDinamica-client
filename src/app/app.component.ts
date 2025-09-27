import { Component, OnInit, OnDestroy, DoCheck } from '@angular/core';
import { UserService } from './services/user.service';
import { Router } from '@angular/router';
import { GLOBAL } from './services/global';
import { NotificationService } from './services/notification.service';
import { Subscription, interval } from 'rxjs';


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: false
})
export class AppComponent implements OnInit, OnDestroy, DoCheck {
    public title = 'RedDinámica';
    public url = GLOBAL.url;
    public identity;    
    public token;    
    public unreadCount = 0;
    public unviewMessages;
    public profilePicVersion: number; // For cache-busting
    public isDarkMode: boolean = false;

    private identitySubscription: Subscription;
    private profilePicUpdateSubscription: Subscription;
    private notificationUpdateSubscription: Subscription;
    private bellLastTap = 0;


    constructor(
        private _userService: UserService,        
        private _router: Router,
        private notificationService: NotificationService 

    ){
        this.profilePicVersion = new Date().getTime(); // Initialize with current time


    }

    ngOnInit(): void {
        // Aplicar tema inicial desde localStorage
        const storedTheme = localStorage.getItem('rd_theme');
        this.isDarkMode = storedTheme === 'dark';
        this.applyThemeClass();
        this.token = this._userService.getToken();
        this.identity = this._userService.getIdentity(); // Get initial identity

        // Solo cargar notificaciones si tanto identity como token existen
        if (this.identity && this.token) {
            this.loadNotifications();
            this.startNotificationPolling();
        }
        
        // Subscribe to identity changes from the service (more reactive than ngDoCheck)
        this.identitySubscription = this._userService.identityChanged.subscribe(
            (newIdentity) => {
                this.identity = newIdentity;
                this.token = this._userService.getToken(); // Actualizar token también
                
                if (this.identity && this.token) {
                    // Agregar un pequeño delay para asegurar que todo esté sincronizado
                    setTimeout(() => {
                        this.loadNotifications();
                        this.startNotificationPolling();
                    }, 100);
                } else {
                    this.unreadCount = 0;
                    this.stopNotificationPolling();
                }
            }
        );

        // Subscribe to a specific event from UserService that signals a profile picture update
        this.profilePicUpdateSubscription = this._userService.profilePictureUpdated.subscribe(() => {
            console.log('Profile picture updated event received in AppComponent, updating version.');
            // It's good to ensure identity is fresh if the event doesn't carry the new picture name
            this.identity = this._userService.getIdentity(); 
            this.profilePicVersion = new Date().getTime();
        });
                      
    }

    onBellClick(event: MouseEvent): void {
        const now = Date.now();
        // doble tap/click en menos de 350ms
        if (now - this.bellLastTap < 350) {
            event.preventDefault();
            event.stopPropagation();
            // navegar a la página de todas las notificaciones
            (event.currentTarget as HTMLElement)?.closest('.dropdown')?.classList.remove('show');
            this._router.navigate(['/notificaciones']);
        }
        this.bellLastTap = now;
    }
    
    ngDoCheck(): void {  
      
        this.unviewMessages = localStorage.getItem('unviewedMessages');

    }
    
    loadNotifications(): void {
        // Verificar que tanto identity como token existan
        if (!this.identity) {
            console.log('No hay identity disponible para cargar notificaciones');
            this.unreadCount = 0;
            return;
        }
        
        const token = this._userService.getToken();
        if (!token) {
            console.log('No hay token disponible para cargar notificaciones');
            this.unreadCount = 0;
            return;
        }
        
        // Verificar que el usuario esté activado
        if (!this.identity.actived) {
            console.log('Usuario no activado, no se cargan notificaciones');
            this.unreadCount = 0;
            return;
        }
        
        this.notificationService.getUnreadCount().subscribe({
            next: (data: any) => {
                this.unreadCount = (data && typeof data.unreadCount === 'number') ? data.unreadCount : 0;
            },
            error: () => {
                this.unreadCount = 0;
            }
        });
    }
    
    startNotificationPolling(): void {
        // Actualizar notificaciones cada 30 segundos
        this.notificationUpdateSubscription = interval(30000).subscribe(() => {
            this.loadNotifications();
        });
    }
    
    stopNotificationPolling(): void {
        if (this.notificationUpdateSubscription) {
            this.notificationUpdateSubscription.unsubscribe();
        }
    }
    
    logout(){
        this._userService.clearIdentityAndToken(); // Use service method to clear identity and token
        // The identitySubscription will automatically set this.identity and this.token to null
        this._router.navigate(['']);
    }
    
    get unreadCountDisplay(): string {
        return this.unreadCount > 99 ? '99+' : String(this.unreadCount);
    }
    toggleTheme(): void {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('rd_theme', this.isDarkMode ? 'dark' : 'light');
        this.applyThemeClass();
    }
    private applyThemeClass(): void {
        const root = document.documentElement;
        if (this.isDarkMode) {
            root.classList.add('theme-dark');
        } else {
            root.classList.remove('theme-dark');
        }
    }
    openP(){
        let url ="https://forms.gle/n7jGyGgAM9ERfK4d9";
        var newW=(window as any).open(url, "_blank");
        newW.opener =null;  } //must search about "_blank  rel= nopener"
    ngOnDestroy() {
            if (this.identitySubscription) {
                this.identitySubscription.unsubscribe();
            }
            if (this.profilePicUpdateSubscription) {
                this.profilePicUpdateSubscription.unsubscribe();
            }
            if (this.notificationUpdateSubscription) {
                this.notificationUpdateSubscription.unsubscribe();
            }
    }   
    
}
