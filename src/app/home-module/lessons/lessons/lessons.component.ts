import { Component, OnInit } from '@angular/core';
import { LessonService } from 'src/app/services/lesson.service';
import { UserService } from 'src/app/services/user.service';

import { Router, ActivatedRoute } from '@angular/router';

import { UntypedFormControl } from '@angular/forms';
import { GLOBAL } from 'src/app/services/GLOBAL';
import { BasicDataService } from 'src/app/services/basicData.service';
import { ACADEMIC_LEVEL, LESSON_STATES } from 'src/app/services/DATA';

@Component({
    selector: 'lessons',
    templateUrl: './lessons.component.html',
    standalone: false
})
export class LessonsComponent implements OnInit {
    public title: string;
    public identity;
    public token;
    public url;

    public allLessons = [];
    public lessons = [];

    public level = { basic: "Básico", medium: "Medio", advanced: "Avanzado" };
    public type = { consideration: "Consideración", development: "Desarrollo" };
    public academic_level = ACADEMIC_LEVEL;
    
    public lesson_states = LESSON_STATES;


    public visible = new UntypedFormControl();

    // Pagination
    public page; // Actual page
    public pages; // Number of pages
    public total; // Total of records
    public prevPage;
    public nextPage;

    // Filter
    public filter;    
    public selectedAreas = [];
    public selectedLevels = [];
    public orderControl;

    public loading = true;
    private openModalRetries = 0;

    public states = [
        {
            label: "Propuesta",
            value: "proposed",
            class: "secondary"
        },
        {
            label: "Asignada",
            value: "assigned",
            class: "warning"
        },
        {
            label: "Desarrollo",
            value: "development",
            class: "info"
        },
        {
            label: "Prueba",
            value: "test",
            class: "primary"
        },
        {
            label: "Terminada",
            value: "completed",
            class: "success"
        }
    ];

    public areas;
    public levels = [
        {
            label: "Preescolar",
            value: "garden",
        },
        {
            label: "Primaria",
            value: "school"
        },
        {
            label: "Secundaria",
            value: "midddleschool"
        },
        {
            label: "Bachillerato",
            value: "highschool"
        },
        {
            label: "Universitario",
            value: "university"
        }
    ];

    constructor(
        private _userService: UserService,
        private _lessonService: LessonService,
        private _bDService: BasicDataService,
        private _router: Router,
        private _route: ActivatedRoute
    ) {
        this.title = 'Lecciones';
        this.url = GLOBAL.url;
        this.token = this._userService.getToken();
        this.identity = this._userService.getIdentity();
        this.areas;

        this.orderControl = new UntypedFormControl('');
        this.filter = new UntypedFormControl('');

        this.orderBy = 'created_at'; // Valor por defecto válido


    }

    private normalizeLessonForPrefill(raw: any): any {
        console.log('[LessonsComponent] normalize input:', raw);
        const clone = JSON.parse(JSON.stringify(raw || {}));
        // Asegurar que knowledge_area sea array de nombres para matching sencillo
        try {
            const areas = Array.isArray(clone.knowledge_area) ? clone.knowledge_area : [];
            clone.knowledge_area = areas.map((a: any) => (typeof a === 'string' ? a : (a?.name || ''))).filter((s: string) => !!s);
        } catch { clone.knowledge_area = []; }
        // Justificación: conservar tanto objeto como texto
        if (clone.justification && typeof clone.justification !== 'string') {
            try {
                const parts: string[] = [];
                if (clone.justification.methodology) parts.push(String(clone.justification.methodology));
                if (clone.justification.objectives) parts.push(String(clone.justification.objectives));
                clone.justificationText = parts.join('\n\n');
            } catch {}
        }
        console.log('[LessonsComponent] normalize output:', clone);
        return clone;
    }

    ngOnInit(): void {
        this.getAllLessons();        
        this.getAllAreas();
        this.actualPage();
        // Abrir modal de sugerencia si viene desde notificación
        this._route.queryParams.subscribe((params) => {
            console.log('[LessonsComponent] queryParams:', params);
            const open = String(params['openSuggestModal'] || '').toLowerCase() === 'true';
            // ID desde query o, si no existe, desde el param de ruta (cuando /lecciones/:lessonId)
            let lessonId = params['lessonId'] || params['lesson_id'] || '';
            if (!lessonId) {
                const routeParam = this._route.snapshot.params['page'];
                if (routeParam && isNaN(parseInt(routeParam, 10))) {
                    lessonId = routeParam;
                }
            }
            console.log('[LessonsComponent] openSuggestModal=', open, ' lessonId=', lessonId);
            if (open && lessonId) {
                // Garantizar que las lecciones estén cargadas
                const tryOpen = () => {
                    const found = [...this.allLessons, ...this.lessons].find((l: any) => String(l._id) === String(lessonId));
                    if (found) {
                        // Prellenar y abrir el modal
                        const normalized = this.normalizeLessonForPrefill(found);
                        console.log('[LessonsComponent] found normalized:', normalized);
                        try { localStorage.setItem('resuggestLessonPayload', JSON.stringify(normalized)); } catch {}
                        this.openSuggestModal();
                    } else {
                        // Si aún no está en memoria, intentar cargarla desde API y luego abrir
                        this._lessonService.getLesson(this.token, lessonId).subscribe({
                            next: (res) => {
                                const l = (res && (res.lesson || res.data)) || null;
                                const normalized = l ? this.normalizeLessonForPrefill(l) : null;
                                console.log('[LessonsComponent] fetched normalized:', normalized);
                                try { if (normalized) { localStorage.setItem('resuggestLessonPayload', JSON.stringify(normalized)); } } catch {}
                                this.openSuggestModal();
                            },
                            error: () => {
                                // Fallback: abrir modal vacío
                                this.openSuggestModal();
                            }
                        });
                    }
                };
                // Dar un pequeño tiempo para que getAllLessons complete
                setTimeout(tryOpen, 300);
            }
        });
    }

    setArea(selectedArea) {
        if (this.selectedAreas.indexOf(selectedArea) >= 0) {
            this.selectedAreas.splice(this.selectedAreas.indexOf(selectedArea), 1);

        } else {
            this.selectedAreas.push(selectedArea);

        }

        this.getAllLessons();
    }

    setLevel(selectedLevel) {

        if (this.selectedLevels.indexOf(selectedLevel) >= 0) {
            this.selectedLevels.splice(this.selectedLevels.indexOf(selectedLevel), 1);
        } else {
            this.selectedLevels.push(selectedLevel);
        }

        this.getAllLessons();
    }

    getAllAreas() {
        this.areas = JSON.parse(localStorage.getItem('areas'));

        if (!this.areas) {
            this._bDService.getAllKnowledgeAreas().subscribe({
                next: (response) => {
                    if (response.areas) {
                        // Guardar con { used: false } según lo esperado en los tests
                        this.areas = response.areas.map(a => ({ ...a, used: false }));
                        localStorage.setItem('areas', JSON.stringify(this.areas));
                    }
                }, error: (error) => {
                    console.log(<any>error);
                }});
        }
    }

    public orderBy;
    getAllLessons() {
        let filteredLessons = [];
        let res;
        
        // Asegurar que orderBy tenga un valor válido por defecto
        const orderBy = this.orderBy || 'created_at';
        this.loading = true;

        this._lessonService.getAllLessons(this.token, orderBy, true).subscribe({
            next: (response) => {
                if (response && response.lessons) {
                    this.allLessons = response.lessons;

                    // Base filter: only completed and visible lessons
                    this.allLessons = this.allLessons.filter((lesson) =>
                        lesson?.state === 'completed' && lesson?.visible === true
                    );

                    // Filter by area
                    if (this.selectedAreas.length > 0) {
                        this.selectedAreas.forEach((area) => {
                            filteredLessons = filteredLessons.concat(this.allLessons.filter((lesson) => {
                                res = false;

                                if (lesson.knowledge_area && lesson.knowledge_area.length > 0) {
                                    lesson.knowledge_area.some(function (knowledge_area) {
                                        res = knowledge_area.name == area;
                                        if (res) {
                                            return true;
                                        }
                                    });
                                }

                                return res;
                            }));
                        });

                        this.allLessons = Array.from(new Set(filteredLessons));
                        filteredLessons = [];
                    }

        // Filter by level (aceptar tanto level como development_level, arrays o string)
                    if (this.selectedLevels.length > 0) {
                        this.selectedLevels.forEach((level) => {
                            filteredLessons = filteredLessons.concat(this.allLessons.filter((lesson) => {
                                const levelArray = Array.isArray(lesson?.level)
                                    ? lesson.level
                                    : (lesson?.level ? [lesson.level] : []);
                                const devLevelArray = Array.isArray(lesson?.development_level)
                                    ? lesson.development_level
                                    : (lesson?.development_level ? [lesson.development_level] : []);
                                const combinedLevels = levelArray.concat(devLevelArray);
                                console.log("levelArray: ", levelArray);
                                console.log("devLevelArray: ", devLevelArray);
                                console.log("combinedLevels: ", combinedLevels);
                                console.log("level: ", level);
                                return combinedLevels.includes(level);
                            }));
                        });

                        this.allLessons = Array.from(new Set(filteredLessons));
                        filteredLessons = [];
                    }
                    
                    console.log('Lessons loaded successfully:', this.allLessons.length);
                } else {
                    console.warn('No lessons data received');
                    this.allLessons = [];
                }
                this.loading = false;
            },
            error: (error) => {
                console.error('Error fetching lessons:', error);
                this.loading = false;
                this.allLessons = [];
            }
        });
    }

    getLessons(page = 1) {

        this._lessonService.getLessons(this.token, page, true).subscribe({
            next: (response) => {
                if (response.lessons) {
                    // Base filter: only completed and visible lessons
                    this.lessons = response.lessons.filter((lesson) =>
                        lesson?.state === 'completed' && lesson?.visible === true
                    );
                    this.total = response.total;
                    this.pages = response.pages;  
                    this.page = response.currentPage; 
                                 
                    if (page > this.pages) {
                        this._router.navigate(['/inicio/lecciones']);
                    }

                    this.loading = false;
                }
            }, error: (error) => {
                this.loading = false;
                console.log(<any>error);
            }
    });
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

            this.getLessons(this.page);
        });
    }

    reloadLessons() {
        if (this.orderControl.value == 'views') {
            this.orderBy = 'views';
        } else if (this.orderControl.value == 'score') {
            this.orderBy = 'score';
        } else {
            this.orderBy = 'created_at'; // Valor por defecto
        }

        this.getAllLessons();
        // Solo recargar la página si el servicio tiene implementado getLessons (evitar fallos en tests)
        if ((this._lessonService as any).getLessons) {
            this.getLessons(this.page || 1);
        }
    }    

    public needReloadData;
    setNeedReload(event){
        this.needReloadData = true;
    }

    public showAreas = false; 
    setShowAreas(){
        if(this.showAreas){
            this.showAreas = false;
        }else{
            this.showAreas = true;
        }
    }

    public showLevels = false; 
    setShowLevels(){
        if(this.showLevels){
            this.showLevels = false;
        }else{
            this.showLevels = true;
        }
    }

    increaseViews(lesson){
        lesson.views = (lesson.views ?? 0) + 1;

        this._lessonService.editLesson(this.token, lesson).subscribe({
            next: (response) =>{                
                if(response && response.lesson._id){
                    if ((this._lessonService as any).getLessons) {
                        this.getLessons(this.page || 1);
                    }
                }
             },
             error: (error) => {
                 console.log(<any>error);
             }
    })
    }

    // Métodos para abrir modales con manejo correcto del DOM
    openSuggestModal() {
        // Intentar abrir cuando el DOM ya tenga el modal disponible
        const tryOpen = () => {
            try {
                const modal = document.getElementById('add');
                if (!modal) {
                    if (this.openModalRetries < 20) {
                        this.openModalRetries++;
                        return setTimeout(tryOpen, 100);
                    }
                    return;
                }
                // Limpiar cualquier instancia previa
                const existingInstance = (window as any).bootstrap?.Modal?.getInstance(modal);
                if (existingInstance) {
                    existingInstance.dispose();
                }
                // Crear nueva instancia
                const BootstrapModal = (window as any).bootstrap?.Modal;
                if (!BootstrapModal) {
                    // Bootstrap JS no cargado todavía; reintentar brevemente
                    if (this.openModalRetries < 20) {
                        this.openModalRetries++;
                        return setTimeout(tryOpen, 100);
                    }
                    return;
                }
                const bootstrapModal = new BootstrapModal(modal, {
                    backdrop: 'static',
                    keyboard: false
                });
                bootstrapModal.show();
                this.openModalRetries = 0;
            } catch (error) {
                console.log('Error al abrir modal de sugerir lección:', error);
            }
        };
        setTimeout(tryOpen, 0);
    }

    openSendExperienceModal() {
        // Esperar a que Angular actualice el DOM
        setTimeout(() => {
            try {
                const modal = document.getElementById('send');
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
                console.log('Error al abrir modal de enviar experiencia:', error);
            }
        }, 0);
    }

    // Normaliza y obtiene los niveles (level y development_level) como arreglo de claves
    public extractLevels(lesson): string[] {
        const collectedValues: string[] = [];

        const collect = (value: any) => {
            if (value === null || value === undefined || value === '') {
                return;
            }
            collectedValues.push(String(value));
        };

        if (Array.isArray(lesson?.level)) {
            lesson.level.forEach(collect);
        } else {
            collect(lesson?.level);
        }

        if (Array.isArray(lesson?.development_level)) {
            lesson.development_level.forEach(collect);
        } else {
            collect(lesson?.development_level);
        }

        const normalized = collectedValues
            .map((v) => this.mapLevelKey(v))
            .filter((v) => !!v);

        return Array.from(new Set(normalized));
    }

    private mapLevelKey(value: string): string {
        const upper = String(value).toUpperCase().trim();
        const aliasMap: { [key: string]: string } = {
            'GARDEN': 'GARDEN',
            'PRESCHOOL': 'GARDEN',
            'PREESCOLAR': 'GARDEN',
            'SCHOOL': 'SCHOOL',
            'PRIMARIA': 'SCHOOL',
            'HIGHSCHOOL': 'HIGHSCHOOL',
            'SECUNDARIA': 'HIGHSCHOOL',
            'UNIVERSITY': 'GRADUATE',
            'UNIVERSITARIO': 'GRADUATE',
            'GRADUATE': 'GRADUATE'
        };
        return aliasMap[upper] || upper;
    }
}
