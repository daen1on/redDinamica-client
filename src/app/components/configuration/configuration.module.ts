import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ConfigurationComponent } from './configuration.component';
import { ConfigurationRoutingModule } from './configuration-routing.module';

@NgModule({
  declarations: [ConfigurationComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ConfigurationRoutingModule]
})
export class ConfigurationModule {}


