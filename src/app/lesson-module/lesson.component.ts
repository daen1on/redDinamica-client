import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Lesson } from '../models/lesson.model';
import { UserService } from '../services/user.service';
import { Router, ActivatedRoute } from '@angular/router';
import { LessonService } from '../services/lesson.service';
import { GLOBAL } from '../services/GLOBAL';
import { BasicDataService } from '../services/basicData.service';

@Component({
    selector: 'lesson',
    templateUrl: './lesson.component.html',
    styleUrls: ['./lesson.component.css'],
    standalone: false
})
export class LessonComponent implements OnInit {
    public title: string;
    public identity;
    public token;
    public url;

    public status;
    
    public selectedOption = 'details';

    public lesson = new Lesson();

    public parentUrl;
    
    constructor(
        private _userService:UserService,
        private _lessonService: LessonService,
        private _router: Router,
        private _route: ActivatedRoute,
        private _bDService: BasicDataService,
    ) {
        this.title = 'Leccion en';
        this.url = GLOBAL.url;
        this.token = this._userService.getToken();
        this.identity = this._userService.getIdentity();
        
    }

    ngOnInit(): void {
        this.loadLesson();
        this.getUsers();
        this.getAllAreas();
        
        // Determinar contexto principal (admin/inicio) de forma robusta
        const currentUrl = this._router.url || '';
        if (currentUrl.startsWith('/admin')) {
            this.parentUrl = 'admin';
        } else if (currentUrl.startsWith('/inicio')) {
            this.parentUrl = 'inicio';
        } else {
            // Fallback: inspeccionar el árbol de rutas para detectar prefijo conocido
            const rootPaths = (this._route.snapshot.pathFromRoot || [])
                .map(r => r.routeConfig?.path)
                .filter(Boolean) as string[];
            const top = rootPaths.find(p => p.startsWith('admin') || p.startsWith('inicio'));
            this.parentUrl = (top && top.split('/')?.[0]) || 'inicio';
        }
    }

    ngDoCheck(): void {
        if (this.needReloadData) {
            this.loadLesson();
            this.needReloadData = false;
        }
    }

    public areas;
    getAllAreas() {
        this.areas = JSON.parse(localStorage.getItem('areas'));

        if (!this.areas) {

            this._bDService.getAllKnowledgeAreas().subscribe(
                response => {
                    if (response.areas) {
                        this.areas = response.areas;

                        localStorage.setItem('areas', JSON.stringify(this.areas));
                    }
                }, error => {
                    console.log(<any>error);
                });
        }
    }
    

    loadLesson(){
        this._route.params.subscribe(params => {
            let id = params['id'];

            this.getLesson(id);
        });
    }

    getLesson(lessonId){
        this._lessonService.getLesson(this.token,lessonId).subscribe(
            response => {
                if (response.lesson) {
                    this.status = 'success';
                    this.lesson = response.lesson;
                } else {
                    this.status = 'error';
                    this._router.navigate([this.parentUrl,'lecciones']);
                }
            },
            error => {
                console.error('Error loading lesson:', error);
                this._router.navigate([this.parentUrl,'lecciones']);
            }
        );       
    }
    
    setSelectedOption(selectedOption){
        // Si estamos en la vista de recursos, intentemos respetar su guardado/bloqueo
        if (this.selectedOption === 'resources') {
            try {
                const resourcesCmpEl = document.querySelector('resources') as any;
                const ngCmp = (resourcesCmpEl as any) ? (resourcesCmpEl as any).__ngContext__ : null;
                // Fallback: simplemente cambiamos. La protección real la hace el guard y beforeunload
            } catch (e) {}
        }

        this.selectedOption = selectedOption;
        this.needReloadData = true;
    }

    public needReloadData;
    setNeedReload(event){   
        this.needReloadData = true;
    }

    isInTheDevelopmentGroup(){
        let response;

        if(this.lesson.development_group){
            response = this.lesson.development_group.find(user => {
                return this.identity._id == user._id;
            })
        }
 
        if(response || this.lesson.expert && this.lesson.expert._id == this.identity){
            return true;
        }else{            
            return false;
        }
    }

    showCommentsOrConversations(){
        // Si la lección está terminada, sólo permitir desde panel admin y con rol autorizado
        if (this.lesson?.state === 'completed') {
            return this.isAdminPanelViewerAllowed();
        }

        // Para otros estados, permitir a grupo de desarrollo o vista admin
        const baseAccess = this.isInTheDevelopmentGroup() || this.isInAdminContext();
        if (!baseAccess) { return false; }

        // Bloquear en estado 'proposed'
        if (this.lesson?.state === 'proposed') { return false; }

        // Requiere asignación de experto y líder
        return !!(this.lesson?.expert && this.lesson?.leader);
    }

    private isAdminPanelViewerAllowed(): boolean {
        const role = this.identity?.role || '';
        const allowedRoles = ['admin', 'delegated_admin', 'lesson_manager'];
        return this.isInAdminContext() && allowedRoles.includes(role);
    }

    private isInAdminContext(): boolean {
        try {
            const currentUrl = this._router.url || '';
            if (currentUrl.startsWith('/admin')) { return true; }
            const paths = (this._route.snapshot.pathFromRoot || [])
                .map(r => r.routeConfig?.path)
                .filter(Boolean) as string[];
            return paths.some(p => p.startsWith('admin'));
        } catch (e) {
            return false;
        }
    }

    showEdit(){
        let response;

        if(this.lesson.leader && this.identity._id == this.lesson.leader._id 
            && ['proposed', 'assigned', 'development', 'test'].includes(this.lesson.state)){
            response = true;
        }else{
            response = false;
            if(this.parentUrl == 'admin'){
                response = true;
            }
        }

        return response;

    }

    public users =[];
    getUsers() {
        this._userService.getAllUsers().subscribe(
            response => {
                // this.users = response.users.filter(user => {
                //     return user.role == 'expert' || user.role == 'admin' || user.role == 'delegated_admin' || user.canAdvise;
                // });
                this.users = response.users;
            },
            error => {
                console.log(<any>error);
            }
        )
    }
}
