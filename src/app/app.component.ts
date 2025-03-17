import { Component } from '@angular/core';
import { UserService } from './services/user.service';
import { Router } from '@angular/router';
import { GLOBAL } from './services/global';
import { NotificationService } from './services/notification.service';


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: false
})
export class AppComponent {
    public title = 'RedDinámica';
    public url = GLOBAL.url;
    public identity;    
    public token;    
    public unreadCount = 0;
    public unviewMessages;

    constructor(
        private _userService: UserService,        
        private _router: Router,
        private notificationService: NotificationService 

    ){}

    ngOnInit(): void {
        this.token = this._userService.getToken();
        this.loadNotifications();
                      
    }
    
    ngDoCheck(): void {  
        this.identity = this._userService.getIdentity();
        this.unviewMessages = localStorage.getItem('unviewedMessages');
    }
    loadNotifications(): void {
        this.notificationService.getNotifications().subscribe((data: any) => {
          this.unreadCount = data.notifications.filter(notification => !notification.read).length;
        });
    }
    logout(){
        localStorage.clear();
        this._router.navigate(['']);
    }
    openP(){
        let url ="https://forms.gle/n7jGyGgAM9ERfK4d9";
        var newW=(window as any).open(url, "_blank");
        newW.opener =null;  } //must search about "_blank  rel= nopener"
        
}
