import { Pipe, PipeTransform } from '@angular/core';

@Pipe({name: 'filter'})
export class FilterPipe implements PipeTransform {
    transform(items: any, term: any): any {
        if (!term) {
            return items;
        }

        term = term.toLowerCase();

        return items.filter((item) => {
            if (item.name) {
                return item.name.toLowerCase().includes(term);
            } else if (item.title) {
                return item.title.toLowerCase().includes(term);
            }
            return false; // return false if neither name nor title is defined
        });
    }
}
