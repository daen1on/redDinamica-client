import { Component, OnInit } from '@angular/core';
import { NotificationService } from '../../services/notification.service';
import { Notification } from '../../models/notification.model';

@Component({
    selector: 'app-notifications',
    templateUrl: './notifications.component.html',
    styleUrls: ['./notifications.component.css'],
    standalone: false
})
export class NotificationsComponent implements OnInit {
  public notifications: Notification[] = [];
  public unreadCount: number = 0;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.notificationService.getNotifications().subscribe((data: any) => {
      this.notifications = data.notifications;
      this.unreadCount = this.notifications.filter(notification => !notification.read).length;
    });
  }

  markAsRead(notification: Notification): void {
    this.notificationService.markAsRead(notification._id).subscribe(() => {
      notification.read = true;
      this.unreadCount--;
    });
  }
}
