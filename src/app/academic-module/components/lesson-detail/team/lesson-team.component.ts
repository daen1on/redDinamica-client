import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicLesson } from '../../../models/academic-lesson.model';

@Component({
  selector: 'app-lesson-team',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lesson-team.component.html',
  styleUrls: ['./lesson-team.component.css']
})
export class LessonTeamComponent {
  @Input() lesson: AcademicLesson | null = null;
  @Input() loading = false;
  @Input() canEdit = false;
  @Input() groupStudents: Array<{ _id: string; name: string; surname?: string; email?: string } > = [];
  @Input() inviteStudentId: string = '';
  @Input() inviteMessage: string = '';
  @Output() inviteStudentIdChange = new EventEmitter<string>();
  @Output() inviteMessageChange = new EventEmitter<string>();
  @Output() invite = new EventEmitter<void>();

  displayUserName(user: any): string {
    if (!user) return 'Usuario';
    if (typeof user === 'string') return user;
    return user.name || user.fullname || user.username || user.email || 'Usuario';
  }

  /**
   * Returns the list of group students excluding those who are already members
   * of the lesson's development group. Supports when `member.user` can be an id string or a user object.
   */
  getAvailableGroupStudents(): Array<{ _id: string; name: string; surname?: string; email?: string }> {
    if (!this.groupStudents || !this.groupStudents.length) return [];
    const currentMemberIds = new Set<string>(
      (this.lesson?.development_group || []).map(member => {
        const userRef = member.user as any;
        return typeof userRef === 'string' ? userRef : userRef?._id;
      }).filter(Boolean) as string[]
    );
    return this.groupStudents.filter(st => !currentMemberIds.has(st._id));
  }

  /**
   * Translates role keys to Spanish labels for display in the badge.
   */
  translateRole(role: string | undefined | null): string {
    if (!role) return 'miembro';
    switch (role) {
      case 'leader':
        return 'líder';
      case 'collaborator':
        return 'colaborador';
      case 'reviewer':
        return 'revisor';
      default:
        return role;
    }
  }
}


