import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NgSelectModule } from '@ng-select/ng-select';

import { AdminRoutingModule } from './admin.routing';

import { AdminComponent } from './admin.component';
import { LessonsComponent } from './lessons/lessons/lessons.component';

import { CitiesComponent } from './basicData/cities/cities.component';
import { InstitutionsComponent } from './basicData/institutions/institutions.component';
import { KnowledgeAreasComponent } from './basicData/knowledgeAreas/knowledgeAreas.component';
import { NewUsersComponent } from './users/newUsers/newUsers.component';
import { UsersComponent } from './users/users/users.component';
import { ProfessionsComponent } from './basicData/professions/professions.component';
import { AdminGuard } from './guards/admin.guard';
import { FilterPipe } from './pipes/filter.pipe';
import { ExperiencesComponent } from './lessons/experiences/experiences.component';
import { ProposedComponent } from './lessons/proposed/proposed.component';

import { ResourcesComponent } from './resources/resources/resources.component';
import { ProposedResourceComponent } from './resources/proposed/proposed-resource.component';
import { AddResourceComponent } from './resources/resources/add/add-resource.component';
import { DetailsResourceComponent } from './resources/details/details-resource.component';
import { EditResourceComponent } from './resources/edit/edit-resource.component';
import { DeleteResourceComponent } from './resources/delete/delete-resource.component';
import { DetailsLessonComponent } from './lessons/details/details-lesson.component';
import { DeleteLessonComponent } from './lessons/delete/delete-lesson.component';
import { LessonModule } from '../lesson-module/lesson.module';
import { AddCallComponent } from './lessons/add-call/add-call.component';
import { CallComponent } from './lessons/call/call.component';
import { SuggestLessonComponent } from './lessons/suggest/suggest-lesson.component';
import { LinkifyService } from '../services/linkify.service';

@NgModule({
    declarations: [
        AdminComponent,
        NewUsersComponent,
        LessonsComponent,
        SuggestLessonComponent,
        DetailsLessonComponent,
        AddCallComponent,
        DeleteLessonComponent,
        ExperiencesComponent,
        ProposedComponent,        
        CallComponent,
        ResourcesComponent,
        AddResourceComponent,
        ProposedResourceComponent,
        DetailsResourceComponent,
        EditResourceComponent,
        DeleteResourceComponent,
        CitiesComponent,
        InstitutionsComponent,
        KnowledgeAreasComponent,
        ProfessionsComponent,
        UsersComponent,
        FilterPipe
        
    ],
    imports: [
        CommonModule,
        FormsModule,
        HttpClientModule,
        ReactiveFormsModule,
        NgSelectModule,
        AdminRoutingModule,
        LessonModule
        
    ],
    exports: [
        AdminComponent
    ],
    providers: [AdminGuard, LinkifyService],
})
export class AdminModule { }