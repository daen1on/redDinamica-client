import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { SecurityOptionsComponent } from './securityOptions.component';
import { SecurityOptionsRoutingModule } from './security-options-routing.module';

@NgModule({
  declarations: [SecurityOptionsComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SecurityOptionsRoutingModule
  ]
})
export class SecurityOptionsModule { }
