import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReportErrorComponent } from './report-error/report-error.component';

const routes: Routes = [
  { path: 'report-error', component: ReportErrorComponent } 
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ErrorRoutingModule { }
