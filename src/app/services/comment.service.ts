import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

import { GLOBAL } from './GLOBAL';
import { Comment } from '../models/comment.model';

@Injectable()
export class CommentService {
    public url:string;
    public identity;
    public token;
    

    constructor(
        private _http:HttpClient
    ){
        this.url = GLOBAL.url;
    }

    // Helper para crear headers seguros sin token null
    private createSafeHeaders(token: string | null, contentType: string = 'application/json'): HttpHeaders {
        const headers: { [key: string]: string } = {
            'Content-Type': contentType
        };
        
        // Solo agregar Authorization si el token es válido
        if (token && token.trim() !== '') {
            headers['Authorization'] = token;
        }
        
        return new HttpHeaders(headers);
    }

    addComment(token, comment: Comment | any):Observable<any>{
        // Verificar si hay token antes de hacer la petición
        if (!token || token.trim() === '') {
            return throwError(() => 'No hay token de autenticación. Por favor, inicie sesión nuevamente.');
        }
        
        // Enviar objeto directamente; HttpClient serializa automáticamente
        const headers = this.createSafeHeaders(token);
        return this._http.post(this.url + 'comment', comment, { headers });
    }

    updateComment(token, commentId: string | number, body: Partial<Comment> = {}):Observable<any>{
        if (!token || token.trim() === '') {
            return throwError(() => 'No hay token de autenticación. Por favor, inicie sesión nuevamente.');
        }
        
        const headers = this.createSafeHeaders(token);
        return this._http.put(this.url+'comment/' + commentId, body, { headers });
    }
   
    removeComment(token, commentId):Observable<any>{
        if (!token || token.trim() === '') {
            return throwError(() => 'No hay token de autenticación. Por favor, inicie sesión nuevamente.');
        }
        
        let headers = this.createSafeHeaders(token);

        return this._http.delete(this.url+'comment/' + commentId, {headers:headers});
    }

    // Métodos para likes en comentarios
    toggleLikeComment(token, commentId):Observable<any>{
        if (!token || token.trim() === '') {
            return throwError(() => 'No hay token de autenticación. Por favor, inicie sesión nuevamente.');
        }
        
        let headers = this.createSafeHeaders(token);

        return this._http.post(this.url + 'comment-like/' + commentId, {}, {headers:headers});
    }

    getCommentLikes(token, commentId):Observable<any>{
        if (!token || token.trim() === '') {
            return throwError(() => 'No hay token de autenticación. Por favor, inicie sesión nuevamente.');
        }
        
        let headers = this.createSafeHeaders(token);

        return this._http.get(this.url + 'comment-likes/' + commentId, {headers:headers});
    }

    // Métodos para respuestas anidadas
    addReply(token, parentCommentId, reply: any):Observable<any>{
        if (!token || token.trim() === '') {
            return throwError(() => 'No hay token de autenticación. Por favor, inicie sesión nuevamente.');
        }
        
        const headers = this.createSafeHeaders(token);
        return this._http.post(this.url + 'comment/' + parentCommentId + '/reply', reply, { headers });
    }

    getReplies(token, commentId):Observable<any>{
        if (!token || token.trim() === '') {
            return throwError(() => 'No hay token de autenticación. Por favor, inicie sesión nuevamente.');
        }
        
        let headers = this.createSafeHeaders(token);

        return this._http.get(this.url + 'comment/' + commentId + '/replies', {headers:headers});
    }
}