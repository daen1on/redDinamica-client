import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AcademicRoutingModule } from './academic-routing.module';
import { AcademicDashboardComponent } from './components/academic-dashboard/academic-dashboard.component';
import { TeacherDashboardComponent } from './components/teacher-dashboard/teacher-dashboard.component';
import { StudentDashboardComponent } from './components/student-dashboard/student-dashboard.component';
import { GroupManagementComponent } from './components/group-management/group-management.component';
import { LessonManagementComponent } from './components/lesson-management/lesson-management.component';
import { CreateGroupComponent } from './components/create-group/create-group.component';
import { CreateLessonComponent } from './components/create-lesson/create-lesson.component';
import { GroupDetailComponent } from './components/group-detail/group-detail.component';
import { LessonDetailComponent } from './components/lesson-detail/lesson-detail.component';
import { AcademicLayoutComponent } from './components/academic-layout/academic-layout.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    AcademicRoutingModule,
    // En Angular 19, todos los componentes son standalone por defecto
    AcademicDashboardComponent,
    TeacherDashboardComponent,
    StudentDashboardComponent,
    GroupManagementComponent,
    LessonManagementComponent,
    CreateGroupComponent,
    CreateLessonComponent,
    GroupDetailComponent,
    LessonDetailComponent
  ]
})
export class AcademicModule { }
