import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-lesson-rating',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lesson-rating.component.html'
})
export class LessonRatingComponent {
  @Input() show = false;
  @Input() loading = false;
  @Input() gradeData: { grade: number; feedback: string } = { grade: 0, feedback: '' };
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
}


