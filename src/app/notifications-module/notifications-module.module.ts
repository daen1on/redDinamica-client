import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationsComponent } from './notifications/notifications.component';

@NgModule({
  declarations: [NotificationsComponent],
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', component: NotificationsComponent }
    ])
  ],
  exports: [NotificationsComponent]
})
export class NotificationsModule { }
