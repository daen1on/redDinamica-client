import { Component, OnInit, Input } from '@angular/core';
import { GLOBAL } from 'src/app/services/global';
import { LESSON_STATES } from 'src/app/services/DATA';
import { ActivatedRoute } from '@angular/router';
import { UserService } from 'src/app/services/user.service';
import { LessonService } from 'src/app/services/lesson.service';
import { UntypedFormGroup, UntypedFormControl, Validators } from '@angular/forms';
import { LABEL_PROFILE } from 'src/app/profile-module/services/profileData';


@Component({
    selector: 'group',
    templateUrl: './group.component.html',
    standalone: false
})
export class GroupComponent implements OnInit {
    public title: string;
    public url;
    @Input() users;

    public lesson_states = LESSON_STATES;

    public groupForm;

    @Input() lesson;
    private token: any;

    public errorMsg;
    public successMsg;
    public labelP = LABEL_PROFILE;
    constructor(
        private _route: ActivatedRoute,
        private _userService: UserService,
        private _lessonService: LessonService
    ) {
        this.token = this._userService.getToken();

        this.title = 'Grupo de desarrollo';
        this.url = GLOBAL.url;

        this.errorMsg = 'Hubo un error agregando el grupo de desarrollo a la lección. Intentalo de nuevo más tarde.';
        this.successMsg = 'Se ha agregado el grupo de desarrallo de la lección correctamente.';

        this.groupForm = new UntypedFormGroup({
            expert: new UntypedFormControl(''),
            leader: new UntypedFormControl(''),
            members: new UntypedFormControl('')
        });
    }

    public parentUrl;
    public expertUsers;
    initExpertSelect() {
        this.expertUsers = this.users.filter(user => {
            return user.role == 'expert' || user.role == 'admin' || user.role == 'delegated_admin' || user.canAdvise;
        });
    }

    initLeaderSelect() {
        if (this.lesson.development_group.length == 0) {
            this.leaderUsers = [];
        } else {
            this.leaderUsers = this.groupForm.value.members;
        }
    }

    public leaderUsers;
    public readonly = false;
    setSelectedLeader() {

        if (this.lesson.development_group.length > 0) {
            if (this.lesson.leader) {
                let leader = this.lesson.development_group.filter(member => {
                    return member._id == this.lesson.leader._id;
                });

                if (leader.length > 0) {
                    this.groupForm.patchValue({
                        leader: this.lesson.leader
                    });
                } else {
                    this.groupForm.patchValue({
                        leader: null
                    });
                }
            }

        } else {
            this.groupForm.patchValue({
                leader: null
            });
        }

        if (this.groupForm.value.members.length > 0) {
            this.groupForm.controls.leader.enable(); 

            if (this.groupForm.value.leader) {
                let leader = this.groupForm.value.members.filter(member => {
                    return member._id == this.groupForm.value.leader._id;
                });

                if (leader.length > 0) {
                      
                    this.groupForm.patchValue({
                        leader: this.groupForm.value.leader
                    });
                } else {
                    this.groupForm.patchValue({
                        leader: null
                    });
                }
            }

        } else {
            this.groupForm.controls.leader.disable();
            this.groupForm.patchValue({
                leader: null
            });
        }
    }

    ngOnInit(): void {
        this.initExpertSelect(); 

        this._route.parent.url.subscribe(value => {
            this.parentUrl = value[0].path;
        });

        if (this.lesson.development_group) {
            this.groupForm.patchValue({
                members: this.lesson.development_group
            });
        }

        if (this.lesson.expert) {
            this.groupForm.patchValue({
                expert: this.lesson.expert,
            });
        }

        this.setSelectedLeader();

        this.initLeaderSelect();

    }

    public submitted;
    public status;

    //asks if the expert belongs to the lesson, if not, it will add him/her. 
    belongsTo(expert):void{
        let found = this.lesson.development_group.find(item => {
            
            return item._id == expert._id; 
        });
        //console.log("found",found);
        if (!found){

            this.lesson.development_group.push(expert);
            this.groupForm.patchValue({
                members: this.lesson.development_group
            });
        }    
        else{
            console.log("ya pertenece al grupo");
        }

    }
    onSubmit() {
        this.submitted = true;

        this.lesson.development_group = this.groupForm.value.members;
        this.lesson.expert = this.groupForm.value.expert._id;
        this.lesson.leader = this.groupForm.value.leader;
        this.belongsTo(this.groupForm.value.expert);
        //console.log(this.lesson.expert);
        this._lessonService.editLesson(this.token, this.lesson).subscribe(
            response => {

                if (response.lesson && response.lesson._id) {
                    this.status = 'success';
                    this.submitted = false;

                } else {
                    this.status = 'error';
                }
            },
            error => {
                if (error != null) {
                    this.status = 'error';
                    console.error(<any>error);
                }
            }
        );

        document.scrollingElement.scrollTop = 0;
    }

    onChanges() {
        this.status = null;
        this.submitted = false;
        


    }

    membersChanges() {
        this.leaderUsers = this.groupForm.value.members;
        this.setSelectedLeader();
    }

}
