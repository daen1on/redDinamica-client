import { BrowserModule } from '@angular/platform-browser';
import { NgModule, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

// Registrar el locale español
registerLocaleData(localeEs, 'es'); 
import { AppComponent } from './app.component';
import { FooterComponent } from './components/footer/footer.component';

// Importación de módulos de características removida del AppModule
// Estos módulos ya se cargan de forma perezosa vía AppRoutingModule

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
// El módulo de notificaciones se carga por lazy-load en '/notificaciones'
import { NotificationsComponent } from './notifications-module/notifications/notifications.component';

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
    NgSelectModule,
    NotificationsComponent,
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
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: LOCALE_ID, useValue: 'es' },
    provideHttpClient(withInterceptorsFromDi())
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
