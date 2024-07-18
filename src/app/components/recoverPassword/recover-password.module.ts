import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RecoverPasswordComponent } from './recoverPassword.component';
import { RecoverPasswordRoutingModule } from './recover-password-routing.module';

@NgModule({
  declarations: [RecoverPasswordComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RecoverPasswordRoutingModule
  ]
})
export class RecoverPasswordModule { }
