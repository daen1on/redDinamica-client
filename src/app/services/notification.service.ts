import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Notification } from '../models/notification.model';
import { GLOBAL } from '../services/global';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  public url: string;

  constructor(private http: HttpClient) {
    this.url = GLOBAL.url;
  }

  getNotifications(): Observable<Notification[]> {
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.get<Notification[]>(`${this.url}/notifications`, { headers: headers });
  }

  markAsRead(notificationId: string): Observable<any> {
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.put(`${this.url}/notifications/${notificationId}/read`, {}, { headers: headers });
  }
}
