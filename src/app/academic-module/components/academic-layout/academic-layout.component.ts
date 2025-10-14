import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-academic-layout',
  templateUrl: './academic-layout.component.html',
  styleUrls: ['./academic-layout.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class AcademicLayoutComponent {
  constructor(private router: Router) {}

  switchToMainRedDinamica(): void {
    this.router.navigate(['/inicio']);
  }

  private getCurrentRole(): string {
    try {
      const raw = localStorage.getItem('identity') || localStorage.getItem('user') || '{}';
      const user = JSON.parse(raw);
      const rawRole: string = (user?.role || user?.rol || '').toString().toLowerCase();
      if (rawRole === 'facilitador' || rawRole === 'facilitator') return 'expert';
      if (rawRole === 'docente') return 'teacher';
      return rawRole || '';
    } catch {
      return '';
    }
  }

  navigateToAcademicDashboard(): void {
    const role = this.getCurrentRole();
    if (role === 'teacher' || role === 'admin' || role === 'expert' || role === 'lesson_manager' || role === 'delegated_admin') {
      this.router.navigate(['/academia/teacher']);
    } else {
      this.router.navigate(['/academia/student']);
    }
  }
}


