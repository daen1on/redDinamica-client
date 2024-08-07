import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminComponent } from './admin.component';
import { NewUsersComponent } from './users/newUsers/newUsers.component';
import { UsersComponent } from './users/users/users.component';
import { LessonsComponent } from './lessons/lessons/lessons.component';
import { CitiesComponent } from './basicData/cities/cities.component';
import { InstitutionsComponent } from './basicData/institutions/institutions.component';
import { ProfessionsComponent } from './basicData/professions/professions.component';
import { KnowledgeAreasComponent } from './basicData/knowledgeAreas/knowledgeAreas.component';
import { ExperiencesComponent } from './lessons/experiences/experiences.component';
import { ProposedComponent } from './lessons/proposed/proposed.component';
import { ResourcesComponent } from './resources/resources/resources.component';
import { ProposedResourceComponent } from './resources/proposed/proposed-resource.component';
import { ViewErrorsComponent } from './view-errors/view-errors.component';
import { AdminGuard } from './guards/admin.guard';
import { LessonComponent } from '../lesson-module/lesson.component';

const adminRoutes: Routes = [
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [AdminGuard],
    children: [
      { path: '', component: NewUsersComponent },
      { path: 'usuarios-nuevos', component: NewUsersComponent },
      { path: 'usuarios-nuevos/:page', component: NewUsersComponent },
      { path: 'usuarios', component: UsersComponent },
      { path: 'usuarios/:page', component: UsersComponent },
      { path: 'lecciones', component: LessonsComponent },
      { path: 'lecciones/:page', component: LessonsComponent },
      { path: 'ciudades', component: CitiesComponent },
      { path: 'ciudades/:page', component: CitiesComponent },
      { path: 'instituciones', component: InstitutionsComponent },
      { path: 'instituciones/:page', component: InstitutionsComponent },
      { path: 'leccion/:id', component: LessonComponent},
      { path: 'lecciones-propuestas', component: ProposedComponent },
      { path: 'lecciones-propuestas/:page', component: ProposedComponent },
      { path: 'experiencias', component: ExperiencesComponent },
      { path: 'experiencias/:page', component: ExperiencesComponent },
      { path: 'recursos', component: ResourcesComponent },
      { path: 'recursos/:page', component: ResourcesComponent },
      { path: 'recursos-propuestos', component: ProposedResourceComponent },
      { path: 'recursos-propuestos/:page', component: ProposedResourceComponent },
      { path: 'areas', component: KnowledgeAreasComponent },
      { path: 'areas/:page', component: KnowledgeAreasComponent },
      { path: 'profesiones', component: ProfessionsComponent },
      { path: 'profesiones/:page', component: ProfessionsComponent },
      { path: 'view-errors', component: ViewErrorsComponent },
      { path: '**', component: NewUsersComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(adminRoutes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
