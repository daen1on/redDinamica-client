import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MomentModule } from 'ngx-moment';
import { ProfileRoutingModule } from './profile.routing';

import { ProfileComponent } from './profile.component';
import { EditInfoComponent } from './editInfo/editInfo.component';
import { InfoComponent } from './info/info.component';
import { LessonsComponent } from './lessons/lessons.component';
import { FollowsComponent } from './follows/follows.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { ProfileGuard } from './guards/profile.guard';
import { PublicationsComponent } from './publications/publications.component';
import { NgxLinkifyjsModule } from 'ngx-linkifyjs';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';

@NgModule({
    declarations: [
        ProfileComponent,
        EditInfoComponent,
        InfoComponent,
        LessonsComponent,
        FollowsComponent,
        PublicationsComponent
        
        
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        HttpClientModule,
        NgxLinkifyjsModule,
        ProfileRoutingModule,
        MomentModule,
        NgSelectModule,
        InfiniteScrollModule
        
        
    ],
    exports: [
        ProfileComponent
    ],
    providers: [
        ProfileGuard,        
    ],
})
export class ProfileModule { }