import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GLOBAL } from '../../services/global';
import { UserService } from '../../services/user.service';

export interface TasksSummary {
  convocatoriasPorAbrir: number;
  sugerenciasPorHacer: number;
  recursosPorAprobar: number;
  leccionesPorMover: number;
}

@Injectable({ providedIn: 'root' })
export class AdminTasksService {
  private url = GLOBAL.url;

  constructor(private http: HttpClient, private userService: UserService) {}

  private authHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': this.userService.getToken() || ''
    });
  }

  getSummary(): Observable<TasksSummary> {
    return this.http.get<TasksSummary>(`${this.url}admin/tasks/summary`, { headers: this.authHeaders() });
  }

  listConvocatorias(): Observable<any> {
    return this.http.get(`${this.url}admin/tasks/convocatorias`, { headers: this.authHeaders() });
  }

  listConvocatoriasAbiertas(): Observable<any> {
    return this.http.get(`${this.url}admin/tasks/convocatorias-abiertas`, { headers: this.authHeaders() });
  }

  listSugerencias(): Observable<any> {
    return this.http.get(`${this.url}admin/tasks/sugerencias`, { headers: this.authHeaders() });
  }

  listRecursosPendientes(): Observable<any> {
    return this.http.get(`${this.url}admin/tasks/recursos`, { headers: this.authHeaders() });
  }

  listLeccionesAcademicas(): Observable<any> {
    return this.http.get(`${this.url}admin/tasks/lecciones-academicas`, { headers: this.authHeaders() });
  }

  aprobarRecurso(id: string): Observable<any> {
    return this.http.put(`${this.url}resource/${id}/approve`, {}, { headers: this.authHeaders() });
  }

  rechazarRecurso(id: string, reason: string): Observable<any> {
    return this.http.put(`${this.url}resource/${id}/reject`, { reason }, { headers: this.authHeaders() });
  }

  moverLeccionAcademica(id: string): Observable<any> {
    return this.http.post(`${this.url}admin/tasks/lecciones/${id}/mover-a-reddinamica`, {}, { headers: this.authHeaders() });
  }

  avalarYabrirConvocatoria(id: string): Observable<any> {
    return this.http.post(`${this.url}admin/tasks/lecciones/${id}/avalar-y-abrir`, {}, { headers: this.authHeaders() });
  }
}
