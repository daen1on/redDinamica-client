import { Injectable } from '@angular/core';
import * as linkify from 'linkifyjs';

@Injectable({
  providedIn: 'root'
})
export class LinkifyService {

  constructor() { }

  linkify(text: string): string {
    // Use linkifyjs to convert plain text with URLs into clickable links
    return linkify.find(text).map(token => {
      if (token.type === 'url') {
        return `<a href="${token.href}" target="_blank">${token.value}</a>`;
      } else {
        return token.value;
      }
    }).join('');
  }
}
