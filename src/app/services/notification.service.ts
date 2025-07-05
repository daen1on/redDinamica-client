import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Notification } from '../models/notification.model';
import { GLOBAL } from '../services/global';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  public url: string;

  constructor(
    private http: HttpClient,
    private userService: UserService
  ) {
    this.url = GLOBAL.url;
  }

  private getHeaders(): HttpHeaders {
    const token = this.userService.getToken();
    
    if (!token) {
      console.error('Token no disponible para notificaciones');
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }

    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token
    });
  }

  getNotifications(page: number = 1, limit: number = 10, unreadOnly: boolean = false): Observable<any> {
    const headers = this.getHeaders();
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(unreadOnly && { unread: 'true' })
    });

    return this.http.get<any>(`${this.url}notifications?${params}`, { headers });
  }

  getUnreadCount(): Observable<any> {
    const headers = this.getHeaders();
    return this.http.get<any>(`${this.url}notifications/unread-count`, { headers });
  }

  markAsRead(notificationId: string): Observable<any> {
    const headers = this.getHeaders();
    return this.http.put(`${this.url}notifications/${notificationId}/read`, {}, { headers });
  }

  markAllAsRead(): Observable<any> {
    const headers = this.getHeaders();
    return this.http.put(`${this.url}notifications/mark-all-read`, {}, { headers });
  }

  deleteNotification(notificationId: string): Observable<any> {
    const headers = this.getHeaders();
    return this.http.delete(`${this.url}notifications/${notificationId}`, { headers });
  }
} 