import { Component, OnInit, Input } from '@angular/core';
import { Location } from '@angular/common';
import { LESSON_STATES } from 'src/app/services/DATA';

@Component({
    selector: 'rating',
    templateUrl: './rating.component.html'
    
})
export class RatingComponent implements OnInit {
    public title: string;
    
    public lesson_states = LESSON_STATES;
    
    @Input() lesson;
    
    constructor(private _location:Location) {
        this.title = 'Calificaciones y comentarios';
        
    }

    ngOnInit(): void {
        
    }

    onBackButton(){
        this._location.back();
    }
}
