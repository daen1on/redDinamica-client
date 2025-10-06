import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Mantener TasksDashboardComponent si se usa en otros lugares
import { TasksDashboardComponent } from './views/tasks-dashboard.component';

const routes: Routes = [];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    TasksDashboardComponent,
  ],
})
export class TasksModule {}


