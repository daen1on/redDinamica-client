import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicLesson, LessonFile } from '../../../models/academic-lesson.model';

@Component({
  selector: 'app-lesson-files',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lesson-files.component.html'
})
export class LessonFilesComponent {
  @Input() lesson: AcademicLesson | null = null;
  @Input() userRole: string = '';
  @Input() uploading = false;
  @Input() selectedFile: File | null = null;
  @Input() resourceDescription = '';
  @Output() resourceDescriptionChange = new EventEmitter<string>();
  @Output() fileSelected = new EventEmitter<File | null>();
  @Output() upload = new EventEmitter<void>();
  @Output() deleteFile = new EventEmitter<LessonFile>();
  @Output() downloadFile = new EventEmitter<LessonFile>();

  onFileSelected(event: any): void {
    const file = event?.target?.files?.[0] || null;
    this.fileSelected.emit(file);
  }
  onDownload(file: LessonFile): void {
    this.downloadFile.emit(file);
  }
  onDelete(file: LessonFile): void {
    this.deleteFile.emit(file);
  }
  getUploaderName(uploader: any): string {
    // Verificamos si 'uploader' es un objeto y no es nulo
    if (typeof uploader === 'object' && uploader !== null) {
      return uploader.name || 'Usuario desconocido';
    }
    // Si no es un objeto, es un string, así que lo devolvemos
    return uploader;
  }
}


