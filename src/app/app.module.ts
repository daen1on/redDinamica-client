import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'; 
import { AppComponent } from './app.component';
import { FooterComponent } from './components/footer/footer.component';

import { HomeModule } from './home-module/home.module';
import { AdminModule } from './admin-module/admin.module';
import { ProfileModule } from './profile-module/profile.module';
import { MessageModule } from './message-module/message.module';

import { UserService } from './services/user.service';
import { UploadService } from './services/upload.service';
import { BasicDataService } from './services/basicData.service';
import { FollowService } from './services/follow.service';
import { PublicationService } from './services/publication.service';
import { MessageService } from './services/message.service';
import { CommentService } from './services/comment.service';
import { ResourceService } from './services/resource.service';
import { LessonService } from './services/lesson.service';

import { FilterPipe } from './pipes/filter.pipe';

import { AppRoutingModule } from './app.routing'; // Asegúrate de que esto esté correcto
import { AuthInterceptor } from './AuthInterceptor'; // Asegúrate de que esto esté correcto
import { NotificationsModule } from './notifications-module/notifications-module.module';

@NgModule({
  declarations: [
    AppComponent,
    FooterComponent,
    FilterPipe,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    NgSelectModule,
    HomeModule,
    AdminModule,
    ProfileModule,
    MessageModule,
    NotificationsModule,
    AppRoutingModule,
    NgbModule
  ],
  providers: [
    UserService,
    FollowService,
    UploadService,
    PublicationService,
    BasicDataService,
    MessageService,
    CommentService,
    ResourceService,
    LessonService,
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
