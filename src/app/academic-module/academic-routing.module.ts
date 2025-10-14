import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AcademicLayoutComponent } from './components/academic-layout/academic-layout.component';

const routes: Routes = [
  {
    path: '',
    component: AcademicLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./components/academic-dashboard/academic-dashboard.component').then(m => m.AcademicDashboardComponent)
      },
      {
        path: 'teacher',
        loadComponent: () => import('./components/teacher-dashboard/teacher-dashboard.component').then(m => m.TeacherDashboardComponent)
      },
      {
        path: 'student',
        loadComponent: () => import('./components/student-dashboard/student-dashboard.component').then(m => m.StudentDashboardComponent)
      },
      {
        path: 'groups',
        loadComponent: () => import('./components/group-management/group-management.component').then(m => m.GroupManagementComponent)
      },
      {
        path: 'groups/create',
        loadComponent: () => import('./components/create-group/create-group.component').then(m => m.CreateGroupComponent)
      },
      {
        path: 'groups/:id',
        loadComponent: () => import('./components/group-detail/group-detail.component').then(m => m.GroupDetailComponent)
      },
      {
        path: 'lessons',
        loadComponent: () => import('./components/lesson-management/lesson-management.component').then(m => m.LessonManagementComponent)
      },
      {
        path: 'lessons/create',
        loadComponent: () => import('./components/create-lesson/create-lesson.component').then(m => m.CreateLessonComponent)
      },
      {
        path: 'lessons/:id/edit',
        loadComponent: () => import('./components/edit-lesson/edit-lesson.component').then(m => m.EditLessonComponent)
      },
      {
        path: 'lessons/:id',
        loadComponent: () => import('./components/lesson-detail/lesson-detail.component').then(m => m.LessonDetailComponent)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AcademicRoutingModule { }
