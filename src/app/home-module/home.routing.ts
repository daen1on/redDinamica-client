import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';

import { HomeComponent } from './home.component';
import { MainComponent } from './main/main.component';
import { SinglePublicationComponent } from './single-publication/single-publication.component';
import { UsersComponent } from './users/users.component';
import { LessonsComponent } from './lessons/lessons/lessons.component';
import { ResourcesComponent } from './resources/resources.component';
import { MyLessonsComponent } from './lessons/my-lessons/my-lessons.component';
import { CallsComponent } from './lessons/calls/calls.component';
import { LessonComponent } from '../lesson-module/lesson.component';
import { AdviseLessonComponent } from './lessons/advise-lesson/advise-lesson.component';
import { homeGuard } from './guards/home.guard';
import { activatedUserGuard } from './guards/activated-user.guard';


const homeRoutes: Routes = [
    {
        path: '',
        component: HomeComponent,
        canActivate: [homeGuard],
        children: [
            //{ path: '', redirectTo: 'add', pathMatch: 'full'},
            { path: '', component: MainComponent },
            { path: 'post', component: MainComponent },
            { path: 'post/:page', component: MainComponent },
            { path: 'publicacion/:id', component: SinglePublicationComponent },
            { path: 'usuarios', component: UsersComponent },
            { path: 'usuarios/:page', component: UsersComponent },
            // Rutas protegidas por GDPR - solo usuarios activados
            { path: 'lecciones', component: LessonsComponent, canActivate: [activatedUserGuard] },
            { path: 'lecciones/:page', component: LessonsComponent, canActivate: [activatedUserGuard] },
            { path: 'leccion/:id', component: LessonComponent, canActivate: [activatedUserGuard] },
            { path: 'mis-lecciones', component: MyLessonsComponent, canActivate: [activatedUserGuard] },
            { path: 'mis-lecciones/:page', component: MyLessonsComponent, canActivate: [activatedUserGuard] },
            { path: 'asesorar-lecciones', component: AdviseLessonComponent, canActivate: [activatedUserGuard] },
            { path: 'asesorar-lecciones/:page', component: AdviseLessonComponent, canActivate: [activatedUserGuard] },
            { path: 'convocatorias', component: CallsComponent, canActivate: [activatedUserGuard] },
            { path: 'convocatorias/:page', component: CallsComponent, canActivate: [activatedUserGuard] },
            { path: 'recursos', component: ResourcesComponent, canActivate: [activatedUserGuard] },
            { path: 'recursos/:page', component: ResourcesComponent, canActivate: [activatedUserGuard] },
            { path: '**', component: MainComponent }
        ]
    }
];

@NgModule({
    imports: [RouterModule.forChild(homeRoutes)],
    exports: [RouterModule]
})
export class HomeRoutingModule { }
