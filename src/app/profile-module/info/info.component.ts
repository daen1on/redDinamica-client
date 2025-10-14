import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { UserService } from 'src/app/services/user.service';

import { INFO_FIELDS } from '../services/profileData';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
    selector: 'info',
    templateUrl: './info.component.html',
    styleUrls: ['./info.component.css'],
    standalone: false
})
export class InfoComponent implements AfterViewInit {
    @ViewChild('infoCard') infoCard!: ElementRef;
    
    public title: string;
    public fieldsForm;
    public identity;
    public viewer; // usuario autenticado (puede ser null)

    constructor(
        private _userService: UserService,
        private _router:Router,
        private _route: ActivatedRoute,
    ) {
        // Guardar el usuario autenticado (si existe) por separado
        this.viewer = _userService.getIdentity();
        this.identity = this.viewer;
        this.title = 'Información';
        this.fieldsForm = INFO_FIELDS;
    }    

    ngOnInit(): void {        
        this.loadPage();      
        
    }

    ngAfterViewInit(): void {
        // Hacer scroll automático hacia el formulario después de que la vista se haya inicializado
        setTimeout(() => {
            if (this.infoCard && this.infoCard.nativeElement) {
                this.infoCard.nativeElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        }, 300);
    }

    loadPage(){
        // Refrescar el viewer por si hubo cambios de sesión
        this.viewer = this._userService.getIdentity();     

        this._route.parent.params.subscribe(params => {
            let id = params['id'];
            
            this.getUser(id);
        })
    }

    getUser(userId){
        this._userService.getUser(userId).subscribe(
            response => {
                if(response.user){
                    this.identity = response.user;

                    // Regla de visibilidad:
                    // - Siempre permitir vista completa al dueño del perfil
                    // - Permitir vista completa a usuarios con actived === true
                    // - En cualquier otro caso, limitar a solo nombre y apellido
                    const isOwner = this.viewer && this.identity && this.viewer._id === this.identity._id;
                    const isActivatedViewer = !!(this.viewer && this.viewer.actived === true);
                    if (isOwner || isActivatedViewer) {
                        this.fieldsForm = INFO_FIELDS;
                    } else {
                        this.fieldsForm = INFO_FIELDS.filter(f => f.id === 'name' || f.id === 'surname');
                    }
                }else{
                    
                    this.identity = this.identity;              
                    this._router.navigate(['/perfil/'+ this.identity._id]);
                }

            },
            error => {
                console.log(<any>error);  
                this.identity = this.identity;              
                this._router.navigate(['/perfil/'+ this.identity._id]);
            }
        );
    }

    // Método para separar las redes sociales por punto y coma
    getSocialLinks(socialNetworks: string | String): string[] {
        if (!socialNetworks) return [];
        
        // Convertir a string primitivo si es necesario
        const networksStr = socialNetworks.toString();
        
        return networksStr.split(';')
            .map(link => link.trim())
            .filter(link => link.length > 0);
    }

    // Método para formatear los enlaces y asegurar que tengan protocolo
    formatLink(link: string): string {
        if (!link) return '';
        
        const trimmedLink = link.trim();
        
        // Si ya tiene protocolo, devolverlo tal como está
        if (trimmedLink.startsWith('http://') || trimmedLink.startsWith('https://')) {
            return trimmedLink;
        }
        
        // Si no tiene protocolo, agregar https://
        return 'https://' + trimmedLink;
    }

}
