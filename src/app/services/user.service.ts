import { Injectable, EventEmitter} from '@angular/core';
import { HttpClient, HttpResponse, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

import { GLOBAL } from './global';
import { User } from '../models/user.model';

@Injectable()
export class UserService {
    public url:string;
    public _identity: User;
    public _token: string;
    public stats;
    public identityChanged: BehaviorSubject<User | null>;
    public profilePictureUpdated: EventEmitter<void> = new EventEmitter<void>();

    constructor(
        private _http:HttpClient
    ){
        this.url = GLOBAL.url;
    
    
    // Initialize identity and token from localStorage
    this._identity = this.loadIdentityFromStorage();
    this._token = this.loadTokenFromStorage();
    this.identityChanged = new BehaviorSubject<User | null>(this._identity);
    }
    register(user:User):Observable<any>{
        let params = JSON.stringify(user);
        let headers = new HttpHeaders({'Content-Type':'application/json'});

        return this._http.post(this.url+'register', params, {headers:headers});
    }
    

    registerByAdmin(user:User):Observable<any>{
        let params = JSON.stringify(user);
        let headers = new HttpHeaders({
            'Content-Type':'application/json', 
            'Authorization': this.getToken() || ''
        });

        return this._http.post(this.url+'registerbyAdmin', params, {headers:headers});
    }    

    signup(user:User, getToken = null):Observable<any>{
        if(getToken != null){
            user.getToken = true;
        }
        
        let params = JSON.stringify(user);
        let headers = new HttpHeaders({'Content-Type':'application/json'});

        return this._http.post(this.url + 'login', params, { headers: headers }).pipe(
            tap((response: any) => {
                if (response.user) {
                    this.setIdentity(response.user);
                }
                if (response.token) {
                    this.setToken(response.token);
                }
            })
        );
    }

    updateUser(user:User):Observable<any>{

        let params = JSON.stringify(user);
        let headers = new HttpHeaders({
            'Content-Type':'application/json',
            'Authorization': this.getToken() || ''
        });

        return this._http.put(this.url+'user-update/'+ user._id, params, {headers:headers}).pipe(
            tap((response: any) => {
                // Solo actualizar la identidad si el usuario actualizado es el mismo que está logueado
                if (response.user && this._identity && response.user._id === this._identity._id) {
                    this.setIdentity(response.user);
                }
            })
        );
    }

    // Método específico para activar usuarios desde el panel de administración
    activateUserByAdmin(user: User): Observable<any> {
        const userToUpdate = { ...user, actived: true };
        let params = JSON.stringify(userToUpdate);
        let headers = new HttpHeaders({
            'Content-Type':'application/json',
            'Authorization': this.getToken() || ''
        });

        // No actualizar la identidad del admin, solo hacer la petición
        return this._http.put(this.url+'user-update/'+ user._id, params, {headers:headers});
    }

    validatePass(user):Observable<any>{
        let params = JSON.stringify(user);
        let headers = new HttpHeaders({
            'Content-Type':'application/json', 
            'Authorization': this.getToken() || ''
        });

        return this._http.post(this.url + 'validate-password', params, {headers:headers});
    }

    changePass(user):Observable<any>{
        let params = JSON.stringify(user);
        let headers = new HttpHeaders({
            'Content-Type':'application/json', 
            'Authorization': this.getToken() || ''
        });

        return this._http.post(this.url + 'change-password', params, {headers:headers});
    }

    recoverPass(user):Observable<any>{
        let params = JSON.stringify(user);

        let headers = new HttpHeaders({
            'Content-Type':'application/json'
        });

        return this._http.post(this.url + 'recover-password', params, {headers:headers});
    }
    resetPassword(token: string, newPassword: string): Observable<any> {
        let params = JSON.stringify({ token, newPassword });
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });

        return this._http.post(this.url + 'reset-password', params, { headers: headers });
    }


    getUsers(page = null):Observable<any>{
        let headers = new HttpHeaders({
            'Content-Type':'application/json', 
            'Authorization': this.getToken() || ''
        });

        return this._http.get(this.url + 'users/'+ page, {headers:headers});
    }

    
    getAllUsers():Observable<any>{
        let headers = new HttpHeaders({
            'Content-Type':'application/json', 
            'Authorization': this.getToken() || ''
        });

        return this._http.get(this.url + 'all-users/', {headers:headers});
    }

    getNewUsers(page = null):Observable<any>{
        let headers = new HttpHeaders({
            'Content-Type':'application/json', 
          'Authorization': this.getToken() || ''
        });

        return this._http.get(this.url + 'new-users/'+ page, {headers:headers});
    }

    deleteUser(userId = null):Observable<any>{
        let headers = new HttpHeaders({
            'Content-Type':'application/json',
            'Authorization': this.getToken() || ''
        });

        if(!userId){
            return this._http.delete(this.url + 'user', {headers:headers});
        }else{
            return this._http.delete(this.url + 'user/' + userId, {headers:headers});
        }
    }

    getUser(userId):Observable<any>{
        let headers = new HttpHeaders({
            'Content-Type':'application/json', 
            'Authorization': this.getToken() || ''
        });

        return this._http.get(this.url + 'user/' + userId, {headers:headers});
    }

    getStats(){
        let stats = JSON.parse(localStorage.getItem('stats'));

        if(stats != 'undefined'){
            this.stats = stats;         
        }else{
            this.stats = null;
        }

    }

    getCounters(userId = null):Observable<any>{
        let headers = new HttpHeaders({
            'Content-Type':'application/json', 
            'Authorization': this.getToken() || ''
        });

        if(userId){
            return this._http.get(this.url + 'counters/' + userId, {headers:headers});
        }else{
            return this._http.get(this.url + 'counters', {headers:headers});
        }
    }

   // --- Identity and Token Management ---

   private loadIdentityFromStorage(): User | null {
    const identityData = localStorage.getItem('identity');
    return identityData ? JSON.parse(identityData) : null;
}

private loadTokenFromStorage(): string | null {
    return localStorage.getItem('token');
}

getIdentity(): User | null {
    return this._identity;
}

getToken(): string | null {
    return this._token;
}
setIdentity(identity: User | null): void {
    this._identity = identity;
    if (identity) {
        localStorage.setItem('identity', JSON.stringify(identity));
    } else {
        localStorage.removeItem('identity');
    }
    this.identityChanged.next(this._identity);
}

setToken(token: string | null): void {
    this._token = token;
    if (token) {
        localStorage.setItem('token', token);
    } else {
        localStorage.removeItem('token');
    }
}

    clearIdentityAndToken(): void {
        localStorage.removeItem('identity');
        localStorage.removeItem('token');
        this._identity = null;
        this._token = null;
        this.identityChanged.next(null);
    }

    forceUserLogout(userId: string): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': this.getToken() || ''
        });

        return this._http.post(this.url + 'force-logout/' + userId, {}, { headers: headers });
    }

// --- Profile Picture Upload ---
uploadProfileImage(userId: string, file: File): Observable<any> {
    const formData: FormData = new FormData();
    formData.append('image', file, file.name); // 'image' should match your multer field name in user.routes.js

    let headers = new HttpHeaders({
        'Authorization': this.getToken() || '' // Multer needs the token for auth.ensureAuth
    });

    return this._http.post(`${this.url}upload-image-user/${userId}`, formData, { headers: headers }).pipe(
        tap((response: any) => {
            if (response.user) {
                this.setIdentity(response.user); // Update identity with new picture info
                this.profilePictureUpdated.emit(); // Emit event for components
            }
        })
        );
    }
}