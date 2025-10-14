import { Component, OnInit } from '@angular/core';
import { HOME_MENU } from './services/homeMenu';
import { GLOBAL } from '../services/GLOBAL';
import { UserService } from '../services/user.service';
import { Router } from '@angular/router';

@Component({
    selector: 'home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    standalone: false
})
export class HomeComponent implements OnInit {
    public title: string;
    public menuOptions = HOME_MENU;
    public identity;
    public url;

    constructor(
        private _userService: UserService,
        private _router: Router
    ) {
        this.title = 'Home';
        this.identity = this._userService.getIdentity();
        this.url = GLOBAL.url;
    }

    ngOnInit(): void {
        // Verificar si el usuario está realmente autenticado
        if (!this.identity) {
            console.log('Usuario no autenticado, redirigiendo al login');
            this._router.navigate(['/login']);
            return;
        }
    }

    ngDoCheck(): void {
        const currentIdentity = this._userService.getIdentity();
        if (currentIdentity !== this.identity) {
            this.identity = currentIdentity;
            
            // Si la identidad se pierde, redirigir al login
            if (!this.identity) {
                console.log('Identidad perdida, redirigiendo al login');
                this._router.navigate(['/login']);
            }
        }
    }
}



