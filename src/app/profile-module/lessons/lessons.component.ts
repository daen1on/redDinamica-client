import { Component } from '@angular/core';

@Component({
    selector: 'lessons',
    templateUrl: './lessons.component.html',
    standalone: false
})
export class LessonsComponent {
    public title: string;
    

    constructor() {
        this.title = 'Lecciones';

    }


}
