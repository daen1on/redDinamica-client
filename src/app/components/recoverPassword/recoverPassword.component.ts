import { Component, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { UserService } from 'src/app/services/user.service';
import { User } from 'src/app/models/user.model';

import { Observer } from 'rxjs';


@Component({
    selector: 'recoverPassword',
    templateUrl: './recoverPassword.component.html'    
})
export class RecoverPasswordComponent implements OnInit {
    public title:string;
    public status:string;
    public recoverPassForm: UntypedFormGroup;
    public submitted = false;
     // Define your observer
    public observer: Observer<any> = {
        next: (response) => {
            if (response.user && response.user._id) {
                this.status = 'success';
            } else {
                console.log("error entró x aca");
                this.status = 'error';
            }
        },
        error: (error) => {
            this.status = 'error';
            console.log(error);
            },
        complete: () => {
  // This is optional
        }
    };
    

    constructor(
        private _formBuilder: UntypedFormBuilder,
        private _userService: UserService
    ) { 
        this.title = '¿Olvidaste tu contraseña?';       
    }

    ngOnInit(): void{
        this.recoverPassForm = this._formBuilder.group({
            email: ['', [Validators.required,Validators.email]]
        })
       
    }

    get f() { return this.recoverPassForm.controls; }

    onSubmit() {
        this.submitted = true;
        let user = new User();

        // stop here if form is invalid
        if (this.recoverPassForm.invalid) {
            return;
        }

        user.email = this.recoverPassForm.value.email;

        this._userService.recoverPass(user).subscribe(this.observer)
        
    }    
}
