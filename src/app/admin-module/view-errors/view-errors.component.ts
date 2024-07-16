import { Component, OnInit } from '@angular/core';
import { ErrorService } from '../../services/error.service'; // Ajusta la ruta según tu estructura
import { GLOBAL } from '../../services/global'; // Ajusta la ruta según tu estructura
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EditErrorComponent } from '../edit-error/edit-error.component';
@Component({
  selector: 'app-view-errors',
  templateUrl: './view-errors.component.html',
  styleUrls: ['./view-errors.component.css']
})
export class ViewErrorsComponent implements OnInit {
  public errorReports: any[] = [];
  public loading: boolean = false;
  public url: string;
  public currentPage: number = 1;
  public pageSize: number = 10;
  public totalPages: number = 0;
  public filterType: string[] = [];
  public filterModule: string[] = [];
  public errorTypes: string[] = ['Fallo / Bug', 'Mejora', 'Característica deseada'];
  public modules: string[] = ['Modulo Inicio', 'Modulo Lecciones', 'Repositorio', 'Publicaciones', 'Perfil', 'Mensajes'];


  constructor(private errorService: ErrorService, private modalService: NgbModal) {
    this.url = GLOBAL.url;
  }

  ngOnInit(): void {
    this.loadErrorReports();
  }

  loadErrorReports(page: number = 1): void {
    this.loading = true;
    const typeFilter = this.filterType.length > 0 ? this.filterType.join(',') : '';
    const moduleFilter = this.filterModule.length > 0 ? this.filterModule.join(',') : '';
    this.errorService.getErrorReports(page, this.pageSize, typeFilter, moduleFilter).subscribe({
      next: (response) => {
        this.errorReports = response.data;
        this.totalPages = Math.ceil(response.total / this.pageSize);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener los reportes de error:', err);
        this.loading = false;
      }
    });
  }
nextPage(): void {
  if (this.currentPage < this.totalPages) {
    this.currentPage++;
    this.loadErrorReports(this.currentPage);
  }
}

previousPage(): void {
  if (this.currentPage > 1) {
    this.currentPage--;
    this.loadErrorReports(this.currentPage);
  }
}



toggleFilterType(type: string): void {
  const index = this.filterType.indexOf(type);
  if (index > -1) {
    this.filterType.splice(index, 1);
  } else {
    this.filterType.push(type);
  }
  this.filterErrors();
}

toggleFilterModule(module: string): void {
  const index = this.filterModule.indexOf(module);
  if (index > -1) {
    this.filterModule.splice(index, 1);
  } else {
    this.filterModule.push(module);
  }
  this.filterErrors();
}
filterErrors(): void {
  this.currentPage = 1;
  this.loadErrorReports();
}


openEditModal(report: any): void {
  const modalRef = this.modalService.open(EditErrorComponent, { size: 'lg' });
  modalRef.componentInstance.errorReport = report;
  console.log('trying to  load Edit');

  modalRef.result.then((result) => {
    if (result === 'success') {
      console.log('success loading Edit');
      this.loadErrorReports(this.currentPage);
    }
  }).catch((error) => {
    console.log('failed to  load Edit');
    console.error('Error al abrir el modal:', error);
  });
}


confirmDeleteReport(report: any): void {
  if (confirm('¿Estás seguro de que deseas eliminar este reporte?')) {
    this.deleteReport(report._id);
  }
}

deleteReport(id: string): void {
  this.errorService.deleteErrorReport(id).subscribe({
    next: () => this.loadErrorReports(this.currentPage),
    error: (err) => console.error('Error al eliminar el reporte:', err)
  });
}

getFile(fileName: string): void {
  this.errorService.getFile(fileName).subscribe({
    next: (blob) => {
      const url = window.URL.createObjectURL(blob);
      window.open(url);
    },
    error: (err) => {
      console.error('Error al obtener el archivo:', err);
    }
  });
}

filePath(fileName: string): string {
  return `${this.url}/files/${fileName}`;
}
}
