import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { GLOBAL } from './global';
import { Publication } from '../models/publication.model';

@Injectable()
export class PublicationService {
    public url:string;
    public identity;


    constructor(
        private _http:HttpClient
    ){
        this.url = GLOBAL.url;
    }

    addPost(token, publication):Observable<any>{
        let params = JSON.stringify(publication);
        let headers = new HttpHeaders({
            'Content-Type':'application/json', 
            'Authorization': token
        });

        return this._http.post(this.url+'publication', params, {headers:headers});
    }

    removePost(token, publicationId):Observable<any>{
        let headers = new HttpHeaders({
            'Content-Type':'application/json', 
            'Authorization': token
        });

        return this._http.delete(this.url+'publication/' + publicationId, {headers:headers});
    }

    getPublications(token, page = 1, commentsLimit = 10, repliesLimit = 5):Observable<any>{
        let headers = new HttpHeaders({
            'Content-Type':'application/json', 
            'Authorization': token
        });

        const fullUrl = this.url+'publications/' + page + `?commentsLimit=${commentsLimit}&repliesLimit=${repliesLimit}`;

        return this._http.get(fullUrl, {headers:headers});
    }

    getPublication(token, publicationId, commentsLimit = 10, repliesLimit = 5):Observable<any>{
        let headers = new HttpHeaders({
            'Content-Type':'application/json', 
            'Authorization': token
        });

        return this._http.get(this.url+'publication/' + publicationId + `?commentsLimit=${commentsLimit}&repliesLimit=${repliesLimit}`, {headers:headers});
    }

    getUserPublications(token, userId, page = 1, commentsLimit = 10, repliesLimit = 5):Observable<any>{
        let headers = new HttpHeaders({
            'Content-Type':'application/json', 
            'Authorization': token
        });

        return this._http.get(this.url+'user-publications/' + userId + '/' + page + `?commentsLimit=${commentsLimit}&repliesLimit=${repliesLimit}`, {headers:headers});
    }

    updatePublicationComments(token, publicationId, comment):Observable<any>{
        let headers = new HttpHeaders({
            'Content-Type':'application/json', 
            'Authorization': token
        });

        return this._http.put(this.url + 'publication-comment/' + publicationId, comment,{headers:headers});
    }

    loadMoreComments(token, publicationId, page = 1, limit = 10):Observable<any>{
        let headers = new HttpHeaders({
            'Content-Type':'application/json', 
            'Authorization': token
        });

        const fullUrl = this.url + `publication/${publicationId}/comments?page=${page}&limit=${limit}`;

        return this._http.get(fullUrl, {headers:headers});
    }

    loadMoreReplies(token, commentId, page = 1, limit = 5):Observable<any>{
        let headers = new HttpHeaders({
            'Content-Type':'application/json', 
            'Authorization': token
        });

        return this._http.get(this.url + `publication/comment/${commentId}/replies?page=${page}&limit=${limit}`, {headers:headers});
    }

    // Métodos para likes en publicaciones
    toggleLikePublication(token, publicationId):Observable<any>{
        let headers = new HttpHeaders({
            'Content-Type':'application/json', 
            'Authorization': token
        });

        return this._http.post(this.url + 'publication-like/' + publicationId, {}, {headers:headers});
    }

    getPublicationLikes(token, publicationId):Observable<any>{
        let headers = new HttpHeaders({
            'Content-Type':'application/json', 
            'Authorization': token
        });

        return this._http.get(this.url + 'publication-likes/' + publicationId, {headers:headers});
    }

}