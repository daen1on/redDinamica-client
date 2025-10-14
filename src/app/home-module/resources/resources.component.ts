import { Component, OnInit } from '@angular/core';
import { UserService } from 'src/app/services/user.service';
import { ResourceService } from 'src/app/services/resource.service';

import { UntypedFormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { GLOBAL } from 'src/app/services/GLOBAL';
import { TYPE_OF_RESOURCES } from './resourcesData';
import { ICON_STYLE } from 'src/app/services/DATA';

@Component({
    selector: 'resources',
    templateUrl: './resources.component.html',
    standalone: false
})
export class ResourcesComponent implements OnInit {
    public title: string;
    public identity;
    public token;
    public url;

    public types;

    public allResources = [];
    public resources = [];
    public iconResource = ICON_STYLE;

    public visible = new UntypedFormControl();

    // Pagination
    public page; // Actual page
    public pages; // Number of pages
    public total; // Total of records
    public prevPage;
    public nextPage;

    // Filter
    public filter;
    public allUsers;
    public selectedTypes = [];
    public selectedOrder = [];
    public orderControl;

    public areas;    

    public loading = true;
    private resubmitRequested: boolean = false;

    constructor(
        private _userService: UserService,
        private _resourceService: ResourceService,
        private _router: Router,
        private _route: ActivatedRoute
    ) {
        this.title = 'Repositorio';
        this.url = GLOBAL.url;
        this.token = this._userService.getToken();
        this.identity = this._userService.getIdentity();
        this.areas = localStorage.getItem('areas');

        this.types = TYPE_OF_RESOURCES;        

        this.orderControl = new UntypedFormControl('');
        this.filter = new UntypedFormControl('');
    }

    ngOnInit(): void {
        this.getAllResources();
        this.actualPage();
        // Abrir modal de edición si viene un resourceId en query param (tras rechazo)
        this._route.queryParams.subscribe(params => {
            const resourceId = params['resourceId'];
            this.resubmitRequested = (params['resubmit'] === 'true' || params['resubmit'] === true);
            if (resourceId) {
                // Esperar a que carguen los recursos paginados
                const tryOpen = () => {
                    const all = [...(this.allResources || []), ...(this.resources || [])];
                    const found = all.find((r: any) => r && (r._id === resourceId));
                    if (found) {
                        // Marcar el recurso como objetivo de re-sugerencia si aplica
                        if (this.resubmitRequested) {
                            found._resubmit = true;
                        }
                        this.openDetailsModal(found);
                        return true;
                    }
                    return false;
                };
                setTimeout(() => {
                    if (!tryOpen()) {
                        // Si aún no está, reintentar brevemente tras siguiente tick
                        setTimeout(() => tryOpen(), 300);
                    }
                }, 0);
            }
        });
    }

    ngDoCheck(): void {
        if(this.needReloadData){
            this.actualPage();
            this.needReloadData = false;
        }
    }

    setOrder(){
        
        if(this.orderControl){
            
            if(this.orderControl.value == 'downloads'){
                return 'downloads';
            }else if(this.orderControl.value == 'score'){
                return 'score';
            }
            
        }
        return '';
    }

    getAllResources() {
        let filteredResources = [];
        let orderBy = this.setOrder();

        this._resourceService.getAllResources(this.token, orderBy, true).subscribe(
            response => {                
                if (response.resources) {
                    this.allResources = response.resources;

                    // Filter by category
                    if (this.selectedTypes.length > 0) {
                        this.selectedTypes.forEach((type) => {
                            filteredResources = filteredResources.concat(this.allResources.filter((resource) => {
                                return resource.type == type;
                            }));
                        });                     

                        this.allResources = filteredResources;
                    }                    
                }
            }, error => {
                console.log(<any>error);
            });
    }

    getResources(page = 1) {        

        this._resourceService.getResources(this.token, page, true).subscribe(
            response => {               
                
                if (response.resources) {
                    this.resources = response.resources;
                    this.total = response.total;
                    this.pages = response.pages;

                    if (page > this.pages) {
                        this._router.navigate(['/inicio/recursos']);
                    }

                    this.loading = false;
                }
            }, error => {
                console.log(<any>error);
            }
        );
    }

    actualPage() {

        this._route.params.subscribe(params => {
            let page = +params['page'];

            this.page = page;

            if (!page) {
                this.page = 1;
                this.nextPage = this.page + 1;
            } else {
                this.nextPage = page + 1;
                this.prevPage = page - 1;

                if (this.prevPage <= 0) {
                    this.prevPage = 1;
                }
            }

            this.getResources(this.page);
        });
    }

    setType(selectedType) {
        if (this.selectedTypes.indexOf(selectedType) >= 0) {
            this.selectedTypes.splice(this.selectedTypes.indexOf(selectedType), 1);

        } else {
            this.selectedTypes.push(selectedType);

        }        
        this.getAllResources();
    }

    reloadResources(){        
        this.getAllResources();
    }

    goToUrl(url){

        if(url.includes('http://') || url.includes('https://')){
            window.open(url, '_blank');            
        }else{
            window.open(`http://${url}`, '_blank');
        }
    }

    public detailsResourceItem;
    setDetailResource(resource){
        this.detailsResourceItem = resource;
    }

    public ratingResourceItem;    
    setRatingResource(resource){
        this.ratingResourceItem = resource;
    }

    // Métodos para abrir modales con manejo correcto del DOM
    openDetailsModal(resource) {
        this.setDetailResource(resource);
        
        // Esperar a que Angular actualice el DOM
        setTimeout(() => {
            try {
                const modal = document.getElementById('details');
                if (modal) {
                    // Limpiar cualquier instancia previa
                    const existingInstance = (window as any).bootstrap?.Modal?.getInstance(modal);
                    if (existingInstance) {
                        existingInstance.dispose();
                    }
                    
                    // Crear nueva instancia
                    const bootstrapModal = new (window as any).bootstrap.Modal(modal, {
                        backdrop: 'static',
                        keyboard: false
                    });
                    bootstrapModal.show();
                }
            } catch (error) {
                console.log('Error al abrir modal de detalles:', error);
                // Fallback: mostrar detalles en alert o console
                alert(`Detalles del recurso: ${resource.name}\nDescripción: ${resource.description}`);
            }
        }, 0);
    }

    openRatingModal(resource) {
        if (!resource.accepted) {
            alert('Este recurso está pendiente de aprobación y no se puede calificar aún.');
            return;
        }
        
        this.setRatingResource(resource);
        
        // Esperar a que Angular actualice el DOM
        setTimeout(() => {
            try {
                const modal = document.getElementById('rating');
                if (modal) {
                    // Limpiar cualquier instancia previa
                    const existingInstance = (window as any).bootstrap?.Modal?.getInstance(modal);
                    if (existingInstance) {
                        existingInstance.dispose();
                    }
                    
                    // Crear nueva instancia
                    const bootstrapModal = new (window as any).bootstrap.Modal(modal, {
                        backdrop: 'static',
                        keyboard: false
                    });
                    bootstrapModal.show();
                }
            } catch (error) {
                console.log('Error al abrir modal de rating:', error);
                // Fallback: redirigir a una página de calificación
                alert('Error al abrir el modal de calificación. Intenta recargar la página.');
            }
        }, 0);
    }

    public needReloadData;
    setNeedReload(event){
        this.needReloadData = true;
    }

    onResourceSubmitted(event: any) {
        // Recargar la lista de recursos cuando se envía un nuevo recurso
        this.getAllResources();
        this.actualPage();
    }

    increaseDownloads(resource){
        resource.downloads += 1;

        this._resourceService.editResource(this.token, resource).subscribe(
            response =>{                
                if(response && response.resource._id){
                    this.getResources(this.page);
                }
             },
             error => {
                 console.log(<any>error);
             }
        )
    }
}
