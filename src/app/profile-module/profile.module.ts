import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProfileRoutingModule } from './profile.routing';
import { MomentModule } from 'ngx-moment';
import { ProfileComponent } from './profile.component';
import { EditInfoComponent } from './editInfo/editInfo.component';
import { InfoComponent } from './info/info.component';
import { LessonsComponent } from './lessons/lessons.component';
import { FollowsComponent } from './follows/follows.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { ProfileGuard } from './guards/profile.guard';
import { PublicationsComponent } from './publications/publications.component';
import { LinkyModule } from 'ngx-linky';
import { PublicationCardComponent } from '../shared/publication-card/publication-card.component';
import { InfiniteScrollDirective } from './directives/infinite-scroll.directive';
import { UserLessonsService } from '../services/user-lessons.service';

@NgModule({
    declarations: [
        ProfileComponent,
        EditInfoComponent,
        InfoComponent,
        LessonsComponent,
        FollowsComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ProfileRoutingModule,
        NgSelectModule,
        MomentModule,
        LinkyModule,
        PublicationCardComponent,
        PublicationsComponent,
        InfiniteScrollDirective
    ],
    exports: [
        ProfileComponent
    ],
    providers: [
        ProfileGuard,
        UserLessonsService
    ],
})
export class ProfileModule { }