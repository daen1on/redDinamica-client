import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { GLOBAL } from './global';
import { Institution } from '../models/institution.model';
import { City } from '../models/city.model';
import { Profession } from '../models/profession.model';
import { KnowledgeArea } from '../models/knowledge-area.model';

@Injectable()
export class BasicDataService {
    public url: string;
    public identity;
    public token;

    constructor(private _http: HttpClient) {
        this.url = GLOBAL.url;
    }

    // *************** Institution methods *********************************
    addInstitution(institution: Institution): Observable<any> {
        const params = JSON.stringify(institution);
        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });

        return this._http.post(this.url + 'institution', params, { headers: headers })
            .pipe(catchError(this.handleError));
    }

    getInstitutions(page = null): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': this.getToken()
        });

        return this._http.get(this.url + 'institutions/' + page, { headers: headers })
            .pipe(catchError(this.handleError));
    }

    getAllInstitutions(): Observable<any> {
        return this._http.get(this.url + 'all-institutions')
            .pipe(catchError(this.handleError));
    }

    editInstitution(institutionId, institution: Institution): Observable<any> {
        const params = JSON.stringify(institution);
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': this.getToken()
        });

        return this._http.put(this.url + 'institution/' + institutionId, params, { headers: headers })
            .pipe(catchError(this.handleError));
    }

    deleteInstitution(institutionId): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': this.getToken()
        });

        return this._http.delete(this.url + 'institution/' + institutionId, { headers: headers })
            .pipe(catchError(this.handleError));
    }

    // *************** Cities methods *********************************
    addCity(city: City): Observable<any> {
        const params = JSON.stringify(city);
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': this.getToken()
        });

        return this._http.post(this.url + 'city', params, { headers: headers })
            .pipe(catchError(this.handleError));
    }

    getCities(page = null): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': this.getToken()
        });

        return this._http.get(this.url + 'cities/' + page, { headers: headers })
            .pipe(catchError(this.handleError));
    }

    getAllCities(): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': this.getToken()
        });

        return this._http.get(this.url + 'all-cities', { headers: headers })
            .pipe(catchError(this.handleError));
    }

    editCity(cityId, city: City): Observable<any> {
        const params = JSON.stringify(city);
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': this.getToken()
        });

        return this._http.put(this.url + 'city/' + cityId, params, { headers: headers })
            .pipe(catchError(this.handleError));
    }

    deleteCity(cityId): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': this.getToken()
        });

        return this._http.delete(this.url + 'city/' + cityId, { headers: headers })
            .pipe(catchError(this.handleError));
    }

    // *************** Knowledge Area methods *********************************
    addKnowledgeArea(knowledgeArea: KnowledgeArea): Observable<any> {
        const params = JSON.stringify(knowledgeArea);
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': this.getToken()
        });

        return this._http.post(this.url + 'area', params, { headers: headers })
            .pipe(catchError(this.handleError));
    }

    addKnowledgeAreas(knowledgeAreas): Observable<any> {
        const params = JSON.stringify(knowledgeAreas);
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': this.getToken()
        });

        return this._http.post(this.url + 'areas', params, { headers: headers })
            .pipe(catchError(this.handleError));
    }

    getKnowledgeAreas(): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': this.getToken()
        });
    
        return this._http.get(this.url + 'all-areas', { headers: headers })
            .pipe(catchError(this.handleError));
    }
    
    

    getAllKnowledgeAreas(): Observable<{ areas: KnowledgeArea[] }> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': this.getToken()
        });

        return this._http.get<{ areas: KnowledgeArea[] }>(this.url + 'all-areas', { headers: headers })
            .pipe(
                catchError(this.handleError)
            );
    }

    editKnowledgeArea(areaId, area: KnowledgeArea): Observable<any> {
        const params = JSON.stringify(area);
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': this.getToken()
        });

        return this._http.put(this.url + 'area/' + areaId, params, { headers: headers })
            .pipe(catchError(this.handleError));
    }

    deleteKnowledgeArea(areaId): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': this.getToken()
        });

        return this._http.delete(this.url + 'area/' + areaId, { headers: headers })
            .pipe(catchError(this.handleError));
    }

    // *************** Professions methods *********************************
    addProfession(profession: Profession): Observable<any> {
        const params = JSON.stringify(profession);
        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });

        return this._http.post(this.url + 'profession', params, { headers: headers })
            .pipe(catchError(this.handleError));
    }

    getProfessions(page = null): Observable<any> {
        return this._http.get(this.url + 'professions/' + page)
            .pipe(catchError(this.handleError));
    }

    getAllProfessions(): Observable<any> {
        return this._http.get(this.url + 'all-professions')
            .pipe(catchError(this.handleError));
    }

    editProfession(professionId, profession: Profession): Observable<any> {
        const params = JSON.stringify(profession);
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': this.getToken()
        });

        return this._http.put(this.url + 'profession/' + professionId, params, { headers: headers })
            .pipe(catchError(this.handleError));
    }

    deleteProfession(professionId): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': this.getToken()
        });

        return this._http.delete(this.url + 'profession/' + professionId, { headers: headers })
            .pipe(catchError(this.handleError));
    }

    // *************** /Professions methods *********************************

    private handleError(error: any): Observable<never> {
        console.error('An error occurred:', error);
        return throwError(() => new Error(error.message || 'Server Error'));
    }

    getToken() {
        const token = localStorage.getItem('token');
        this.token = token ? token : null;
        return this.token;
    }
}
