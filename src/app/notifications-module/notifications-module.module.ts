import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NotificationsComponent } from './notifications/notifications.component';

@NgModule({
  imports: [
    RouterModule.forChild([
      { path: '', component: NotificationsComponent }
    ])
  ]
})
export class NotificationsModule { }
