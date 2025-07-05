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

    private identitySubscription: Subscription;
    private profilePicUpdateSubscription: Subscription;
    private notificationUpdateSubscription: Subscription;


    constructor(
        private _userService: UserService,        
        private _router: Router,
        private notificationService: NotificationService 

    ){
        this.profilePicVersion = new Date().getTime(); // Initialize with current time


    }

    ngOnInit(): void {
        this.token = this._userService.getToken();
        this.identity = this._userService.getIdentity(); // Get initial identity

        if (this.identity) {
            this.loadNotifications();
            this.startNotificationPolling();
        }
        
        // Subscribe to identity changes from the service (more reactive than ngDoCheck)
        this.identitySubscription = this._userService.identityChanged.subscribe(
            (newIdentity) => {
                this.identity = newIdentity;
                if (this.identity) {
                    this.loadNotifications();
                    this.startNotificationPolling();
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
    
    ngDoCheck(): void {  
      
        this.unviewMessages = localStorage.getItem('unviewedMessages');

    }
    
    loadNotifications(): void {
        if (!this.identity) return;
        
        // Verificar también que el token exista
        const token = this._userService.getToken();
        if (!token) {
            console.log('No hay token disponible para cargar notificaciones');
            this.unreadCount = 0;
            return;
        }
        
        this.notificationService.getNotifications().subscribe({
            next: (data: any) => {
                if (data && data.notifications) {
                    this.unreadCount = data.notifications.filter(notification => !notification.read).length;
                }
            },
            error: (error) => {
                console.log('Error loading notifications count:', error);
                // Si es un error de autenticación, no mostrar mensaje de error
                if (error.includes && error.includes('autenticado')) {
                    console.log('Token inválido o expirado, limpiando sesión');
                    this._userService.clearIdentityAndToken();
                    this._router.navigate(['/login']);
                } else {
                    console.log('Error técnico en notificaciones:', error);
                }
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
