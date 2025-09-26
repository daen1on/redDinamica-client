import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { MomentModule } from 'ngx-moment';

import { LessonComponent } from './lesson.component';
import { ActivityComponent } from './activity/activity.component';
import { EditComponent } from './edit/edit.component';
import { GroupComponent } from './group/group.component';
import { RatingComponent } from './rating/rating.component';
import { LessonDetailsComponent } from './details/lesson-details.component';
import { RouterModule } from '@angular/router';
import { ReviewComponent } from './review/review.component';
import { ConversationComponent } from './conversation/conversation.component';
import { ResourcesComponent } from './resources/resources.component';
import { LinkyModule } from 'ngx-linky';



@NgModule({
    declarations: [
        LessonComponent,
        ActivityComponent,
        ReviewComponent,
        ConversationComponent,
        ResourcesComponent,
        EditComponent,
        GroupComponent,
        RatingComponent,
        LessonDetailsComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule,
        NgSelectModule,
        MomentModule,
        LinkyModule,
        NgbModule
    ],
    exports: [
        LessonComponent,
        ConversationComponent,
        ResourcesComponent,
        LessonDetailsComponent
    ],
    providers: [
   ],
})
export class LessonModule { }