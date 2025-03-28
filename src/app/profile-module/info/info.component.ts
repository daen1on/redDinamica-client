import { Component } from '@angular/core';
import { UserService } from 'src/app/services/user.service';

import { INFO_FIELDS } from '../services/profileData';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
    selector: 'info',
    templateUrl: './info.component.html',
    standalone: false
})
export class InfoComponent {
    public title: string;
    public fieldsForm;
    public identity;

    constructor(
        private _userService: UserService,
        private _router:Router,
        private _route: ActivatedRoute,
    ) {
        this.identity = _userService.getIdentity();
        this.title = 'Información';
        this.fieldsForm = INFO_FIELDS;
    }    

    ngOnInit(): void {        
        this.loadPage();      
        
    }

    loadPage(){
        this.identity = this._userService.getIdentity();     

        this._route.parent.params.subscribe(params => {
            let id = params['id'];
            
            this.getUser(id);
        })
    }

    getUser(userId){
        this._userService.getUser(userId).subscribe(
            response => {
                if(response.user){
                    this.identity = response.user;
                }else{
                    
                    this.identity = this.identity;              
                    this._router.navigate(['/perfil/'+ this.identity._id]);
                }

            },
            error => {
                console.log(<any>error);  
                this.identity = this.identity;              
                this._router.navigate(['/perfil/'+ this.identity._id]);
            }
        );
    }


}
