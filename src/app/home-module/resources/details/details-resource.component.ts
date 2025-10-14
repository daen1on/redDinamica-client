import { Component, Input, AfterViewInit, OnDestroy } from '@angular/core';
import { UserService } from 'src/app/services/user.service';
import { GLOBAL } from 'src/app/services/GLOBAL';
import { ResourceService } from 'src/app/services/resource.service';

import { FIELDS_DETAILS } from '../resourcesData';
import { ICON_STYLE } from 'src/app/services/DATA';


@Component({
    selector: 'details-resource',
    templateUrl: './details-resource.component.html',
    standalone: false
})
export class DetailsResourceComponent implements AfterViewInit, OnDestroy {
    public title;
    public identity;
    public token;
    public url;

    public fields;
    public types;
    public saving: boolean = false;

    @Input() resource;

    constructor(
        private _userService: UserService,
        private _resourceService: ResourceService
    ){
        this.title = 'Agregar recurso';
        this.identity = this._userService.getIdentity();
        this.token = this._userService.getToken();
        this.url = GLOBAL.url;

        this.fields = FIELDS_DETAILS;
        this.types = ICON_STYLE;
    }

    private modalEventListeners: (() => void)[] = [];

    ngOnInit(): void {
    }

    saveAndResuggest() {
        if (!this.resource) { return; }
        this.saving = true;
        const updated = { ...this.resource, accepted: false, rejected: false, visible: false };
        this._resourceService.editResource(this.token, updated).subscribe({
            next: (resp: any) => {
                this.saving = false;
                try {
                    this.resource.rejected = false;
                    this.resource.accepted = false;
                    // limpiar flag interno
                    delete this.resource._resubmit;
                } catch {}
                alert('Cambios guardados. El recurso fue vuelto a sugerir.');
                this.closeModal();
            },
            error: () => {
                this.saving = false;
                alert('No se pudo guardar el recurso. Inténtalo de nuevo.');
            }
        });
    }

    ngAfterViewInit(): void {
        this.setupModalEvents();
    }

    ngOnDestroy(): void {
        // Limpiar event listeners
        this.modalEventListeners.forEach(cleanup => cleanup());
    }

    setupModalEvents() {
        const modal = document.getElementById('details');
        if (modal) {
            // Función para manejar cuando el modal se oculta completamente
            const onHidden = () => {
                // Limpiar la referencia del recurso cuando se cierra el modal
                // Esto ayuda a evitar problemas de memoria y estado
                setTimeout(() => {
                    // No manipular aria-hidden manualmente, Bootstrap lo maneja
                }, 100);
            };

            // Agregar solo el event listener necesario
            modal.addEventListener('hidden.bs.modal', onHidden);

            // Guardar función de limpieza
            this.modalEventListeners.push(
                () => modal.removeEventListener('hidden.bs.modal', onHidden)
            );
        }
    }

    getLink(url) {
        if (url.includes('http://') || url.includes('https://')) {
            return url;
        } else {
            return `http://${url}`;
        }
    }

    closeModal() {
        try {
            const modal = document.getElementById('details');
            if (modal) {
                const bootstrapModal = (window as any).bootstrap?.Modal?.getInstance(modal);
                if (bootstrapModal) {
                    bootstrapModal.hide();
                } else {
                    // Si no hay instancia, usar el método de Bootstrap directamente
                    (window as any).bootstrap?.Modal?.getOrCreateInstance(modal)?.hide();
                }
            }
        } catch (error) {
            console.log('Error al cerrar modal de detalles:', error);
        }
    }

}
