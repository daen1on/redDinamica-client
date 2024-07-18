import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { GLOBAL } from './global';
import { Lesson } from '../models/lesson.model';

@Injectable()
export class LessonService {
    public url: string;

    constructor(private _http: HttpClient) {
        this.url = GLOBAL.url;
    }

    addLesson(token: string, lesson: Lesson): Observable<any> {
        let params = JSON.stringify(lesson);
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.post(this.url + 'lesson', params, { headers: headers })
      .pipe(
        map(response => response),
        catchError(error => {
          console.log('Error en addLesson:', error);
          throw error;
        })
      );
    }

    getLesson(token: string, lessonId: string): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.get(`${this.url}lesson/${lessonId}`, { headers: headers });
    }

    getLessons(token: string, page: number = 1, visibleOnes: boolean = false): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.get(`${this.url}lessons/${visibleOnes}/${page}`, { headers: headers });
    }

    getAllLessons(token: string, orderBy: string = '', visibleOnes: boolean = false): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.get(`${this.url}all-lessons/${visibleOnes}/${orderBy}`, { headers: headers });
    }

    getMyLessons(token: string, page: number = 1): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.get(`${this.url}my-lessons/${page}`, { headers: headers });
    }

    getAllMyLessons(token: string): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.get(`${this.url}all-my-lessons`, { headers: headers });
    }

    getLessonsToAdvise(token: string, page: number = 1): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.get(`${this.url}lessons-to-advise/${page}`, { headers: headers });
    }

    getAllLessonsToAdvise(token: string): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.get(`${this.url}all-lessons-to-advise`, { headers: headers });
    }

    getCalls(token: string, page: number = 1): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.get(`${this.url}calls/${page}`, { headers: headers });
    }

    getAllCalls(token: string): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.get(`${this.url}all-calls`, { headers: headers });
    }

  

    getExperiences(token: string, page: number = 1): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.get(this.url + 'all-lessons/false/created_at', { headers: headers })
        .pipe(
          map(response => response),
          catchError(error => {
            console.log('Error en getExperiences:', error);
            throw error;
          })
        );
    }
    editLesson(token: string, lesson: any): Observable<any> {
        let headers = new HttpHeaders().set('Content-Type', 'application/json')
                                        .set('Authorization', token);
        return this._http.put(this.url + 'lesson/' + lesson._id, JSON.stringify(lesson), { headers: headers });
    }
    
    getSuggestedLesson(token: string, page: number): Observable<any> {
        let headers = new HttpHeaders().set('Content-Type', 'application/json')
                                        .set('Authorization', token);
        return this._http.get(this.url + 'lessons/false/' + page, { headers: headers });
    }

    deleteLesson(token: string, lessonId: string): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.delete(this.url + 'lesson/' + lessonId, { headers: headers });
    }
}
