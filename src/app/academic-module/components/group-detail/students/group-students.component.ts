import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GLOBAL } from '../../../../services/GLOBAL';
import { UserService } from '../../../../services/user.service';
import { AcademicGroupService } from '../../../services/academic-group.service';

@Component({
  selector: 'app-group-students',
  templateUrl: './group-students.component.html',
  styleUrls: ['./group-students.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class GroupStudentsComponent implements OnInit, OnChanges {
  @Input() groupId: string = '';
  @Input() students: any[] = [];
  @Input() userRole: string = 'student';
  @Input() currentUserRole: string = '';
  @Input() teacherId: string = '';
  @Input() currentUserId: string = '';
  @Output() studentsUpdated = new EventEmitter<void>();

  url: string = GLOBAL.url;
  newStudentEmail: string = '';
  allUsers: any[] = [];
  filteredUsers: any[] = [];
  showSuggestions = false;
  selectedUser: any | null = null;
  searchSeq: number = 0;
  
  // Filtro de búsqueda de estudiantes
  searchFilter: string = '';
  filteredStudents: any[] = [];

  constructor(
    private userService: UserService,
    private academicGroupService: AcademicGroupService
  ) { }

  ngOnInit(): void {
    // Inicializar lista filtrada con todos los estudiantes
    this.filteredStudents = [...this.students];
  }

  ngOnChanges(): void {
    // Actualizar lista filtrada cuando cambian los estudiantes
    this.applyFilter();
  }

  onFilterChange(): void {
    this.applyFilter();
  }

  applyFilter(): void {
    const filter = (this.searchFilter || '').toLowerCase().trim();
    
    if (!filter) {
      this.filteredStudents = [...this.students];
      return;
    }

    this.filteredStudents = this.students.filter(student => {
      const name = (student.name || '').toLowerCase();
      const surname = (student.surname || '').toLowerCase();
      const email = (student.email || '').toLowerCase();
      const fullName = `${name} ${surname}`.trim();
      
      return fullName.includes(filter) || 
             name.includes(filter) || 
             surname.includes(filter) || 
             email.includes(filter);
    });
  }

  clearFilter(): void {
    this.searchFilter = '';
    this.applyFilter();
  }

  isTeacher(): boolean {
    // Es teacher si el currentUserId coincide con el teacherId del grupo o tiene rol privilegiado
    return this.teacherId === this.currentUserId || 
           this.userRole === 'teacher' || 
           ['admin', 'delegated_admin', 'lesson_manager'].includes(this.currentUserRole);
  }

  isCurrentUser(studentId: string): boolean {
    return this.currentUserId === studentId;
  }

  canRemoveStudent(studentId: string): boolean {
    // Puede remover si es teacher del grupo O si es el mismo estudiante (para auto-remover)
    return this.isTeacher() || this.isCurrentUser(studentId);
  }

  canAddStudents(): boolean {
    return this.isTeacher();
  }

  canRemoveStudents(): boolean {
    return this.isTeacher();
  }

  onSearchTermChange(): void {
    console.log('[GroupStudents] onSearchTermChange input', { raw: this.newStudentEmail });
    this.selectedUser = null;
    const term = (this.newStudentEmail || '').toLowerCase().trim();
    console.log('[GroupStudents] normalized term', { term });
    if (!term) {
      console.log('[GroupStudents] empty term -> clear suggestions');
      this.filteredUsers = [];
      this.showSuggestions = false;
      return;
    }
    
    const seq = ++this.searchSeq;
    const expectedTerm = term;
    this.filteredUsers = [];
    this.showSuggestions = false;
    console.log('[GroupStudents] search start', { seq, term: expectedTerm });
    
    this.userService.searchUsers(term, 8).subscribe({
      next: (res: any) => {
        const currentTerm = (this.newStudentEmail || '').toLowerCase().trim();
        const stillCurrent = currentTerm === expectedTerm;
        const usersLen = Array.isArray(res?.users) ? res.users.length : 0;
        console.log('[GroupStudents] search response', { seq, expectedTerm, currentTerm, stillCurrent, usersLen, res });
        if (!stillCurrent) {
          console.log('[GroupStudents] stale response ignored', { seq });
          return;
        }
        const list = (res?.users || []).map((u: any) => ({
          _id: u._id,
          name: `${u.name || ''} ${u.surname || ''}`.trim(),
          email: u.email,
          role: u.role,
          picture: u.picture
        }));
        const alreadyIds = new Set((this.students || []).map((s: any) => s._id || s.id));
        this.filteredUsers = list.filter(u => !alreadyIds.has(u._id));
        this.showSuggestions = this.filteredUsers.length > 0;
        console.log('[GroupStudents] suggestions updated', { seq, count: this.filteredUsers.length });
      },
      error: (err) => {
        const currentTerm = (this.newStudentEmail || '').toLowerCase().trim();
        const stillCurrent = currentTerm === expectedTerm;
        console.error('[GroupStudents] search error', { seq, expectedTerm, currentTerm, stillCurrent, err });
        if (!stillCurrent) return;
        this.filteredUsers = [];
        this.showSuggestions = false;
      }
    });
  }

  selectUserToAdd(user: any): void {
    this.selectedUser = user;
    this.newStudentEmail = `${user.name} <${user.email}>`;
    this.filteredUsers = [];
    this.showSuggestions = false;
  }

  addOrInvite(): void {
    if (this.selectedUser?._id) {
      this.academicGroupService.addStudentToGroup(this.groupId, this.selectedUser._id).subscribe({
        next: () => {
          this.studentsUpdated.emit();
          this.newStudentEmail = '';
          this.selectedUser = null;
          this.filteredUsers = [];
          this.showSuggestions = false;
          alert('Estudiante agregado exitosamente');
        },
        error: (error) => {
          console.error('Error agregando estudiante:', error);
          alert(error.error?.message || 'No se pudo agregar al estudiante');
        }
      });
      return;
    }
    this.inviteStudentByEmail();
  }

  inviteStudentByEmail(): void {
    const email = (this.newStudentEmail || '').trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      alert('Ingresa un correo válido');
      return;
    }
    this.academicGroupService.inviteStudentByEmail(this.groupId, email).subscribe({
      next: () => {
        this.studentsUpdated.emit();
        this.newStudentEmail = '';
        this.selectedUser = null;
        this.filteredUsers = [];
        this.showSuggestions = false;
        alert('Estudiante agregado/invitado');
      },
      error: (error) => {
        console.error('Error invitando/agregando estudiante:', error);
        alert(error.error?.message || 'No se pudo agregar/invitar al estudiante');
      }
    });
  }

  removeStudent(studentId: string): void {
    const isLeavingGroup = this.isCurrentUser(studentId);
    const message = isLeavingGroup 
      ? '¿Estás seguro de que quieres abandonar este grupo?' 
      : '¿Estás seguro de que quieres remover a este estudiante del grupo?';
    
    if (confirm(message)) {
      this.academicGroupService.removeStudentFromGroup(this.groupId, studentId).subscribe({
        next: () => {
          this.studentsUpdated.emit();
          const successMessage = isLeavingGroup 
            ? 'Has abandonado el grupo exitosamente' 
            : 'Estudiante removido exitosamente';
          alert(successMessage);
        },
        error: (error) => {
          console.error('Error removing student:', error);
          alert(error.error?.message || 'Error al remover el estudiante');
        }
      });
    }
  }
}

