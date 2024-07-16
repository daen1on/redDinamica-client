import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GLOBAL } from './global'; // Ajusta la ruta según tu estructura

@Injectable({
  providedIn: 'root'
})
export class ErrorService {
  public url: string;

  constructor(private _http: HttpClient) {
    this.url = GLOBAL.url;
  }

  getToken() {
    return localStorage.getItem('token');
  }
  updateErrorReport(id: string, errorReport: any, file: File | null): Observable<any> {
    const formData = new FormData();
    formData.append('type', errorReport.type);
    formData.append('module', errorReport.module);
    formData.append('description', errorReport.description);
    formData.append('steps', errorReport.steps);
  
    if (file) {
      formData.append('file', file);
    }
  
    let headers = new HttpHeaders({
      'Authorization': this.getToken() || ''
    });
  
    return this._http.put(`${this.url}/error-reports/${id}`, formData, { headers: headers });
  }
  

  addErrorReport(errorReport: any, file: File | null): Observable<any> {
    const formData = new FormData();
    formData.append('type', errorReport.type);
    formData.append('module', errorReport.module);
    formData.append('description', errorReport.description);
    formData.append('steps', errorReport.steps);

    if (file) {
      formData.append('file', file);
    }

    let headers = new HttpHeaders({
      'Authorization': this.getToken() || ''
    });

    return this._http.post(this.url + 'error-report', formData, { headers: headers });
  }

  getErrorReports(page: number, pageSize: number, type: string, module: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': this.getToken() || ''
    });

    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    if (type) params = params.set('type', type);
    if (module) params = params.set('module', module);

    return this._http.get<any>(`${this.url}/error-reports`, { params, headers: headers });
  }

  deleteErrorReport(id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Authorization': this.getToken() || ''
    });

    return this._http.delete(`${this.url}/error-reports/${id}`, { headers: headers });
  }

  getFile(fileName: string): Observable<Blob> {
    let headers = new HttpHeaders({
      'Authorization': this.getToken() || ''
    });
  
    return this._http.get(`${this.url}/files/${fileName}`, { headers: headers, responseType: 'blob' });
  }

  
}
