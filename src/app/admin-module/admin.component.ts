import { Component, OnInit } from '@angular/core';
import { ADMIN_MENU } from './services/adminMenu';

@Component({
    selector: 'admin',
    templateUrl: './admin.component.html',
    styleUrls: ['./admin.component.css'],
    standalone: false
})
export class AdminComponent implements OnInit {
  public title: String = 'Administración';
  public menuOptions;
  public isMenuCollapsed: boolean = true;

  constructor() {
    this.menuOptions = ADMIN_MENU;
  }

  ngOnInit(): void {
  }

  toggleMenu(): void {
    this.isMenuCollapsed = !this.isMenuCollapsed;
  }
}
