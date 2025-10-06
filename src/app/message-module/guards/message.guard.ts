import { Injectable } from '@angular/core';
import { Router, Route } from '@angular/router';
import { UserService } from 'src/app/services/user.service';

@Injectable()
export class MessageGuard {
    
    constructor(
           private _router: Router,
           private _userService: UserService

    ){}


    canActivate(){        
        let identity = this._userService.getIdentity();
        let token = this._userService.getToken();

        if(!identity || !token){
            this._router.navigate(['/']);
            return false;
        }

        // Protección GDPR: Usuarios no activados no pueden enviar mensajes privados
        if(!identity.actived){
            alert('Tu cuenta aún no ha sido activada. No puedes enviar mensajes privados hasta que un administrador apruebe tu cuenta (protección de datos GDPR).');
            this._router.navigate(['/inicio']);
            return false;
        }

        return true;
    }
}