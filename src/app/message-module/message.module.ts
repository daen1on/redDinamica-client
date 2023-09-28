import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MessageComponent } from './message.component';
import { MessageRoutingModule } from './message.routing';
import { NewMessageComponent } from './new-message/new-message.component';
import { ReceivedComponent } from './received/received.component';
import { SendedComponent } from './sended/sended.component';
import { InfoComponent } from './info/info.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { MessageGuard } from './guards/message.guard';
import { LinkifyService } from '../services/linkify.service';




@NgModule({
    declarations: [
        MessageComponent,
        NewMessageComponent,
        ReceivedComponent,
        SendedComponent,
        InfoComponent
        
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        HttpClientModule,
        MessageRoutingModule,
        NgSelectModule
        
    ],
    exports: [
        MessageComponent
    ],
    providers: [
        MessageGuard,
        LinkifyService
    ],
})
export class MessageModule { }