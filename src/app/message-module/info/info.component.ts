import { Component } from '@angular/core';
import { UserService } from 'src/app/services/user.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
    selector: 'info',
    templateUrl: './info.component.html'
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
        
    }    

//


}
