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
import { CallsComponent } from './lessons/calls/calls.component';
import { ResourcesComponent } from './resources/resources/resources.component';
import { ProposedResourceComponent } from './resources/proposed/proposed-resource.component';
import { AddResourceComponent } from './resources/resources/add/add-resource.component';

@NgModule({
    declarations: [
        AdminComponent,
        NewUsersComponent,
        LessonsComponent,
        ExperiencesComponent,
        ProposedComponent,        
        CallsComponent,
        ResourcesComponent,
        AddResourceComponent,
        ProposedResourceComponent,
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
        
    ],
    exports: [
        AdminComponent
    ],
    providers: [AdminGuard],
})
export class AdminModule { }