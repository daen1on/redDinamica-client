import { Injectable, EventEmitter} from '@angular/core';
import { HttpClient, HttpResponse, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';

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

    // === Preferencias del usuario ===
    getMyPreferences(): Observable<{ emailDigestEnabled: boolean }> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': this.getToken() || ''
        });
        return this._http.get<{ emailDigestEnabled: boolean }>(`${this.url}users/me/preferences`, { headers });
    }

    updateMyPreferences(prefs: { emailDigestEnabled: boolean }): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': this.getToken() || ''
        });
        return this._http.put(`${this.url}users/me/preferences`, prefs, { headers }).pipe(
            tap((response: any) => {
                if (response?.user) {
                    this.setIdentity(response.user);
                }
            })
        );
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


    // Búsqueda paginada para typeahead
    searchUsers(q: string, limit: number = 8): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type':'application/json', 
            'Authorization': this.getToken() || ''
        });
        const ts = Date.now();
        const params = `?q=${encodeURIComponent(q)}&limit=${limit}&_ts=${ts}`; // anti-cache
        const url = this.url + 'users/search' + params;
        console.log('[UserService] searchUsers request', { q, limit, ts, url });
        return this._http.get(url, {headers:headers}).pipe(
            tap({
                next: (res) => console.log('[UserService] searchUsers response', { q, limit, ts, count: (res as any)?.users?.length }),
                error: (err) => console.error('[UserService] searchUsers error', { q, limit, ts, err })
            })
        );
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
    // Verificar si localStorage y cache están sincronizados
    const localStorageIdentity = localStorage.getItem('identity');
    
    // Si localStorage está vacío pero cache tiene identity, limpiar cache
    if (!localStorageIdentity && this._identity) {
        this._identity = null;
        this.identityChanged.next(null);
        return null;
    }
    
    // Si localStorage tiene identity pero cache no, actualizar cache
    if (localStorageIdentity && !this._identity) {
        try {
            this._identity = JSON.parse(localStorageIdentity);
            this.identityChanged.next(this._identity);
        } catch (error) {
            console.error('Error parsing identity from localStorage:', error);
            localStorage.removeItem('identity');
            this._identity = null;
            this.identityChanged.next(null);
        }
    }
    
    return this._identity;
}

getToken(): string | null {
    // Verificar si localStorage y cache están sincronizados
    const localStorageToken = localStorage.getItem('token');
    
    // Si localStorage está vacío pero cache tiene token, limpiar cache
    if (!localStorageToken && this._token) {
        this._token = null;
        this._identity = null;
        this.identityChanged.next(null);
        
        // Disparar redirección inmediatamente 
        setTimeout(() => this.checkAndRedirectIfNeeded(), 100);
        return null;
    }
    
    // Si localStorage tiene token pero cache no, actualizar cache
    if (localStorageToken && !this._token) {
        this._token = localStorageToken;
    }
    
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
    // Emitir cambio de identidad cuando se actualiza el token
    // Esto asegura que los componentes se actualicen correctamente
    this.identityChanged.next(this._identity);
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
    formData.append('image', file, file.name); 

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

    // Método para verificar si el token es válido sin necesidad de hacer una petición específica
    isTokenValid(): boolean {
        const token = this.getToken();
        const identity = this.getIdentity();
        
        if (!token || !identity) {
            return false;
        }

        // Verificaciones básicas del token
        if (token.length < 20) { // Tokens muy cortos probablemente sean inválidos
            return false;
        }

        return true;
    }

    // Método para verificar si se necesita redirección cuando no hay token
    private checkAndRedirectIfNeeded(): void {
        const currentUrl = window.location.pathname;
        
        // Lista de rutas que requieren autenticación
        const protectedRoutes = ['/admin', '/perfil', '/home', '/lecciones', '/mensajes'];
        
        const isProtectedRoute = protectedRoutes.some(route => currentUrl.startsWith(route));
        
        if (isProtectedRoute) {
            this.handleExpiredSession('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
        }
    }

    // Método para manejar sesiones expiradas de forma centralizada
    handleExpiredSession(message?: string): void {
        const defaultMessage = 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.';
        const finalMessage = message || defaultMessage;
        
        // Limpiar datos de sesión
        this.clearIdentityAndToken();
        sessionStorage.clear();
        localStorage.clear();

        alert(finalMessage);
        // Redirigir al login
        window.location.href = '/login';
    }

    // Método para verificar proactivamente el estado del token
    checkTokenStatus(): Observable<boolean> {
        if (!this.isTokenValid()) {
            return of(false);
        }

        // Hacer una petición ligera para verificar si el token sigue siendo válido
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': this.getToken() || ''
        });

        return this._http.get(`${this.url}verify-token`, { headers: headers }).pipe(
            map((response: any) => {
                return response && response.valid === true;
            }),
            catchError((error) => {
                console.log('Token verification failed:', error);
                if (error.status === 401 || error.status === 403) {
                    this.handleExpiredSession();
                }
                return of(false);
            })
        );
    }
}