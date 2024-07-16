import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ReportErrorComponent } from './report-error/report-error.component';
import { ErrorRoutingModule } from './error-routing.module';

@NgModule({
  declarations: [ReportErrorComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ErrorRoutingModule
  ]
})
export class ErrorModule { }
