import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'search',
    templateUrl: './search.component.html',
    standalone: false
})
export class SearchComponent implements OnInit {
    public title:string;
    

    constructor() { 
        this.title = 'search Component';
        
    }

    ngOnInit(){
        
    }
}
