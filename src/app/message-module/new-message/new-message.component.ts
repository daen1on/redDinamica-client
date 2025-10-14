import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService } from 'src/app/services/message.service';
import { UntypedFormGroup, UntypedFormControl, Validators } from '@angular/forms';

import { UserService } from 'src/app/services/user.service';

import { GLOBAL } from 'src/app/services/GLOBAL';
import { LABEL_ROLE } from '../services/messageData';
import { User } from 'src/app/models/user.model';
import { Message } from 'src/app/models/message.model';


@Component({
    selector: 'newMessage',
    templateUrl: './new-message.component.html',
    standalone: false
})
export class NewMessageComponent {
    public title: string;
    public identity;
    public token;
    public url;

    public messageForm;
    public message;
    public allUsers;
    public items = [{name:null, surname:null}];
    
    public status;
    public submitted;
    public categories;

    constructor(
        private _userService: UserService,
        private _messageService: MessageService,
        private _route: ActivatedRoute,
        private _router: Router,

    ) {
        this.title = 'Mensaje nuevo';
        this.identity = this._userService.getIdentity();
        this.token = this._userService.getToken();
        this.url = GLOBAL.url;

        this.categories = LABEL_ROLE;
        
        this.messageForm = new UntypedFormGroup({
            to: new UntypedFormControl('', Validators.required),
            message: new UntypedFormControl('', Validators.required)
        });

        this.getAllUsers();
    }

    onChanges(): void {
        this.messageForm.valueChanges.subscribe(val => {

            if (val) {
                this.status = null;
                this.submitted = false;
            }
        });
    }

    // Get controls form
    get f() { return this.messageForm.controls; }

 
    public formError = false;
    onSubmit() {

        this.submitted = true;

        if (this.messageForm.invalid) {            
            return;
        }


        this.message = new Message(
            this.identity._id,
            this.messageForm.value.to,
            this.messageForm.value.message
        );

        this._messageService.addMessage(this.token, this.message).subscribe(
            response => {
                
                if(response && response.message._id){
                    this.messageForm.reset(); //reset message recipe
                    this.status = 'success';
                    
                }else{
                    this.status = 'error';

                }
            },
            error => {
                this.status = 'error';
                console.log(<any>error);
            }
        )
    }

    getAllUsers() { 
        let index;       
        this._userService.getAllUsers().subscribe(
            response => {
                if (response.users) {                    
                    this.allUsers = response.users;

                    this.allUsers = this.allUsers.filter( (user) => {
                        return user._id != this.identity._id;
                    });
                    
                    this.items = this.allUsers;
                }
            }, error => {
                console.log(<any>error);
            });
    }

    customSearchFn(term: string, item: User) {
        if (!item) { return false; }

        const roleKey = (item as any)?.role as string | undefined;
        const userRoleLabel = (roleKey && LABEL_ROLE[roleKey]?.label) ? LABEL_ROLE[roleKey].label : (roleKey || '');

        term = (term || '').toLocaleLowerCase();
        const name = (item.name || '').toLocaleLowerCase();
        const surname = (item.surname || '').toLocaleLowerCase();
        const roleLabel = userRoleLabel.toLocaleLowerCase();

        return name.indexOf(term) > -1 || surname.includes(term) || roleLabel.includes(term);
    }
}
