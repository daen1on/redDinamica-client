import { Component, Input} from '@angular/core';

import { UserService } from 'src/app/services/user.service';

import { GLOBAL } from 'src/app/services/GLOBAL';


@Component({
    selector: 'details-lesson',
    templateUrl: './details-lesson.component.html',
    standalone: false
})
export class DetailsLessonComponent {
    public title;
    public identity;
    public token;
    public url;

    public level = { basic: "Básico", medium: "Medio", advanced: "Avanzado"};
    public type = { consideration: "Consideración", development: "Desarrollo"};

    @Input() lesson;
    @Input() parent;

    constructor(
        private _userService: UserService

    ) {
        this.title = 'Agregar recurso';
        this.identity = this._userService.getIdentity();
        this.token = this._userService.getToken();
        this.url = GLOBAL.url;

        
    }
    
    ngOnInit(): void {
        
        
    }


}
