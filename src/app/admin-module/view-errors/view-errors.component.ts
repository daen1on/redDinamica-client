import { Component, OnInit } from '@angular/core';
import { ErrorService } from '../../services/error.service'; // Ajusta la ruta según tu estructura
import { GLOBAL } from '../../services/global'; // Ajusta la ruta según tu estructura
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EditErrorComponent } from '../edit-error/edit-error.component';
import { PublicationService } from '../../services/publication.service';
import { UserService } from '../../services/user.service';

declare var bootstrap: any;

@Component({
    selector: 'app-view-errors',
    templateUrl: './view-errors.component.html',
    styleUrls: ['./view-errors.component.css'],
    standalone: false
})
export class ViewErrorsComponent implements OnInit {
  // Reportes técnicos (errores y sugerencias)
  public technicalReports: any[] = [];
  public loadingTechnical: boolean = false;
  public currentTechnicalPage: number = 1;
  public totalTechnicalPages: number = 0;
  
  // Denuncias (publicaciones y usuarios)
  public complaints: any[] = [];
  public loadingComplaints: boolean = false;
  public currentComplaintsPage: number = 1;
  public totalComplaintsPages: number = 0;
  public complaintFilter: string[] = ['publication', 'user'];

  // Configuración general
  public url: string;
  public pageSize: number = 10;
  public filterType: string[] = [];
  public filterModule: string[] = [];
  public errorTypes: string[] = ['Fallo / Bug', 'Mejora', 'Característica deseada'];
  public modules: string[] = ['Modulo Inicio', 'Modulo Lecciones', 'Repositorio', 'Publicaciones', 'Perfil', 'Mensajes'];

  // Variables para denuncias
  public selectedComplaint: any = null;
  public warningMessage: string = '';
  private token: string = '';

  // Variables obsoletas (mantenidas para retrocompatibilidad temporal)
  public errorReports: any[] = [];
  public loading: boolean = false;
  public currentPage: number = 1;
  public totalPages: number = 0;

  constructor(
    private errorService: ErrorService, 
    private modalService: NgbModal,
    private publicationService: PublicationService,
    private userService: UserService
  ) {
    this.url = GLOBAL.url;
    this.token = this.userService.getToken() || '';
  }

  ngOnInit(): void {
    this.loadTechnicalReports();
    this.loadComplaints();
    // Mantener compatibilidad
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

// ======= NUEVOS MÉTODOS PARA REPORTES TÉCNICOS =======

loadTechnicalReports(page: number = 1): void {
  this.loadingTechnical = true;
  const typeFilter = this.filterType.length > 0 ? this.filterType.join(',') : '';
  const moduleFilter = this.filterModule.length > 0 ? this.filterModule.join(',') : '';
  
  this.errorService.getErrorReports(page, this.pageSize, typeFilter, moduleFilter, 'technical').subscribe({
    next: (response) => {
      this.technicalReports = response.data;
      this.totalTechnicalPages = Math.ceil(response.total / this.pageSize);
      this.loadingTechnical = false;
    },
    error: (err) => {
      console.error('Error al obtener los reportes técnicos:', err);
      this.loadingTechnical = false;
    }
  });
}

nextTechnicalPage(): void {
  if (this.currentTechnicalPage < this.totalTechnicalPages) {
    this.currentTechnicalPage++;
    this.loadTechnicalReports(this.currentTechnicalPage);
  }
}

previousTechnicalPage(): void {
  if (this.currentTechnicalPage > 1) {
    this.currentTechnicalPage--;
    this.loadTechnicalReports(this.currentTechnicalPage);
  }
}

// ======= NUEVOS MÉTODOS PARA DENUNCIAS =======

loadComplaints(page: number = 1): void {
  this.loadingComplaints = true;
  const categoryFilter = this.complaintFilter.length > 0 ? this.complaintFilter.join(',') : '';
  
  this.errorService.getErrorReports(page, this.pageSize, '', '', categoryFilter).subscribe({
    next: (response) => {
      this.complaints = response.data;
      this.totalComplaintsPages = Math.ceil(response.total / this.pageSize);
      this.loadingComplaints = false;
    },
    error: (err) => {
      console.error('Error al obtener las denuncias:', err);
      this.loadingComplaints = false;
    }
  });
}

nextComplaintsPage(): void {
  if (this.currentComplaintsPage < this.totalComplaintsPages) {
    this.currentComplaintsPage++;
    this.loadComplaints(this.currentComplaintsPage);
  }
}

previousComplaintsPage(): void {
  if (this.currentComplaintsPage > 1) {
    this.currentComplaintsPage--;
    this.loadComplaints(this.currentComplaintsPage);
  }
}

toggleComplaintFilter(category: string): void {
  const index = this.complaintFilter.indexOf(category);
  if (index > -1) {
    this.complaintFilter.splice(index, 1);
  } else {
    this.complaintFilter.push(category);
  }
  this.currentComplaintsPage = 1;
  this.loadComplaints();
}

// ======= MÉTODOS PARA GESTIONAR DENUNCIAS =======

confirmDeletePublication(complaint: any): void {
  if (confirm('¿Estás seguro de que deseas eliminar esta publicación? Esta acción no se puede deshacer.')) {
    this.deletePublicationFromComplaint(complaint);
  }
}

deletePublicationFromComplaint(complaint: any): void {
  if (!complaint.publicationId) {
    alert('No se encontró el ID de la publicación.');
    return;
  }

  this.publicationService.removePost(this.token, complaint.publicationId).subscribe({
    next: (response) => {
      console.log('Publicación eliminada correctamente');
      // Resolver la denuncia automáticamente tras eliminar la publicación
      this.resolveComplaint(complaint, true);
      alert('La publicación ha sido eliminada correctamente y el denunciante ha sido notificado.');
    },
    error: (err) => {
      console.error('Error al eliminar la publicación:', err);
      alert('Error al eliminar la publicación. Por favor, inténtalo nuevamente.');
    }
  });
}

openWarningModal(complaint: any): void {
  this.selectedComplaint = complaint;
  this.warningMessage = `Estimado/a usuario/a,\n\nHemos recibido una denuncia sobre tu comportamiento en la plataforma RedDinámica. Te recordamos que es importante mantener un ambiente respetuoso y colaborativo.\n\nSi continúas con este tipo de comportamiento, tu cuenta podría ser suspendida o eliminada de forma permanente.\n\nPor favor, revisa nuestras políticas de uso y asegúrate de cumplirlas.\n\nAtentamente,\nEquipo de Administración de RedDinámica`;
  
  const modalElement = document.getElementById('warningModal');
  if (modalElement) {
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  }
}

sendWarning(): void {
  if (!this.selectedComplaint || !this.selectedComplaint.reportedUserId) {
    alert('No se encontró el usuario denunciado.');
    return;
  }

  if (!this.warningMessage || this.warningMessage.trim() === '') {
    alert('Por favor, escribe un mensaje de advertencia.');
    return;
  }

  // Enviar advertencia al usuario mediante el servicio de errores
  this.errorService.sendWarningToUser(this.selectedComplaint.reportedUserId, this.warningMessage).subscribe({
    next: (response) => {
      console.log('Advertencia enviada correctamente');
      // Cerrar modal
      const modalElement = document.getElementById('warningModal');
      if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal?.hide();
      }
      // Resolver la denuncia tras enviar la advertencia
      this.resolveComplaint(this.selectedComplaint, true);
      alert('La advertencia ha sido enviada correctamente y el denunciante ha sido notificado.');
      this.warningMessage = '';
      this.selectedComplaint = null;
    },
    error: (err) => {
      console.error('Error al enviar la advertencia:', err);
      alert('Error al enviar la advertencia. Por favor, inténtalo nuevamente.');
    }
  });
}

resolveComplaint(complaint: any, actionTaken: boolean): void {
  if (!complaint._id) {
    alert('No se encontró el ID de la denuncia.');
    return;
  }

  const message = actionTaken 
    ? 'Se ha tomado acción sobre tu denuncia. Gracias por ayudarnos a mantener un ambiente seguro.' 
    : 'Hemos revisado tu denuncia. Tras una evaluación cuidadosa, hemos determinado que no se requiere acción adicional en este momento.';

  this.errorService.resolveComplaint(complaint._id, complaint.reporter, message).subscribe({
    next: (response) => {
      console.log('Denuncia resuelta y notificación enviada');
      // Recargar denuncias para actualizar la lista
      this.loadComplaints(this.currentComplaintsPage);
      if (!actionTaken) {
        alert('La denuncia ha sido marcada como resuelta y el denunciante ha sido notificado.');
      }
    },
    error: (err) => {
      console.error('Error al resolver la denuncia:', err);
      alert('Error al resolver la denuncia. Por favor, inténtalo nuevamente.');
    }
  });
}
}
