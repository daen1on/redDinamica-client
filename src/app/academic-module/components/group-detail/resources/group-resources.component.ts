import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GLOBAL } from '../../../../services/GLOBAL';
import { ICON_STYLE } from '../../../../services/DATA';
import { ResourceService } from '../../../../services/resource.service';
import { AcademicGroupService } from '../../../services/academic-group.service';

@Component({
  selector: 'app-group-resources',
  templateUrl: './group-resources.component.html',
  styleUrls: ['./group-resources.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class GroupResourcesComponent implements OnInit {
  @Input() groupId: string = '';
  @Input() groupResources: any[] = [];
  @Input() userRole: string = 'student';
  @Input() token: string = '';
  @Input() teacherId: any = '';
  @Input() currentUserId: string = '';
  @Output() resourcesUpdated = new EventEmitter<void>();

  url: string = GLOBAL.url;
  iconResource = ICON_STYLE;
  
  // Modal de selección de recursos
  showResourcesModal = false;
  availableResources: any[] = [];
  selectedResourcesToAdd: any[] = [];
  loadingResources = false;
  addingResource = false;

  constructor(
    private resourceService: ResourceService,
    private academicGroupService: AcademicGroupService
  ) { }

  ngOnInit(): void {
    // Initialization if needed
  }

  private getGroupTeacherId(): string {
    const t: any = this.teacherId;
    if (!t) return '';
    if (typeof t === 'object' && t._id) return String(t._id);
    return String(t);
  }

  isGroupTeacher(): boolean {
    return this.getGroupTeacherId() === String(this.currentUserId || '');
  }

  openResourcesModal(): void {
    if (!this.isGroupTeacher()) {
      return; // Protección extra en UI
    }
    this.showResourcesModal = true;
    this.selectedResourcesToAdd = [];
    this.loadAvailableResources();
    document.body.style.overflow = 'hidden';
  }

  closeResourcesModal(): void {
    this.showResourcesModal = false;
    this.selectedResourcesToAdd = [];
    document.body.style.overflow = 'auto';
  }

  loadAvailableResources(): void {
    this.loadingResources = true;
    this.resourceService.getAllResources(this.token, '', true).subscribe({
      next: (response) => {
        const allRes = response.resources || [];
        const groupIds = new Set(this.groupResources.map(r => r._id));
        this.availableResources = allRes.filter((r: any) => 
          r.accepted && r.visible && !groupIds.has(r._id)
        );
        this.loadingResources = false;
      },
      error: () => {
        this.loadingResources = false;
      }
    });
  }

  toggleResourceSelection(resource: any): void {
    const index = this.selectedResourcesToAdd.findIndex(r => r._id === resource._id);
    if (index >= 0) {
      this.selectedResourcesToAdd.splice(index, 1);
    } else {
      this.selectedResourcesToAdd.push(resource);
    }
  }

  isResourceSelected(resource: any): boolean {
    return this.selectedResourcesToAdd.some(r => r._id === resource._id);
  }

  removeFromSelection(resource: any): void {
    const index = this.selectedResourcesToAdd.findIndex(r => r._id === resource._id);
    if (index >= 0) {
      this.selectedResourcesToAdd.splice(index, 1);
    }
  }

  importSelectedResources(): void {
    if (this.selectedResourcesToAdd.length === 0) {
      alert('Selecciona al menos un recurso para importar');
      return;
    }

    this.addingResource = true;
    let completed = 0;
    const total = this.selectedResourcesToAdd.length;

    this.selectedResourcesToAdd.forEach(resource => {
      this.academicGroupService.addGroupResource(this.groupId, resource._id).subscribe({
        next: () => {
          completed++;
          if (completed === total) {
            this.addingResource = false;
            this.resourcesUpdated.emit();
            this.closeResourcesModal();
            alert(`${total} recurso(s) importado(s) exitosamente`);
          }
        },
        error: () => {
          completed++;
          if (completed === total) {
            this.addingResource = false;
            this.resourcesUpdated.emit();
            this.closeResourcesModal();
            alert('Algunos recursos no pudieron ser importados');
          }
        }
      });
    });
  }

  removeResourceFromGroup(resourceId: string): void {
    if (!confirm('¿Remover este recurso del grupo?')) return;
    this.academicGroupService.removeGroupResource(this.groupId, resourceId).subscribe({
      next: () => this.resourcesUpdated.emit(),
      error: () => {}
    });
  }

  goToUrl(url: string): void {
    if (url.includes('http://') || url.includes('https://')) {
      window.open(url, '_blank');
    } else {
      window.open(`http://${url}`, '_blank');
    }
  }

  increaseDownloads(resource: any): void {
    resource.downloads = (resource.downloads || 0) + 1;
    this.resourceService.editResource(this.token, resource).subscribe({
      next: () => this.resourcesUpdated.emit(),
      error: (err) => console.error('Error incrementando descargas:', err)
    });
  }
}

