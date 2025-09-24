import { Component, Input, OnInit } from '@angular/core';
import { FormControl, UntypedFormControl } from '@angular/forms';
import { UserService } from 'src/app/services/user.service';
import { LessonService } from 'src/app/services/lesson.service';
import { BasicDataService } from 'src/app/services/basicData.service';
import { Router, ActivatedRoute } from '@angular/router';
import { GLOBAL } from 'src/app/services/global';

@Component({
    selector: 'calls',
    templateUrl: './calls.component.html',
    standalone: false
})
export class CallsComponent implements OnInit {
    public title: string;
    public identity;
    public token;
    public url;

    public filteredLessons: any[] = [];
    public allLessons = [];
    public lessons = [];

    public academic_level: Object = {
        GARDEN: "Preescolar",
        SCHOOL: "Primaria",
        MIDDLESCHOOL: "Secundaria",
        HIGHSCHOOL: "Bachillerato",
        UNIVERSITY: "Universitario",
        GRADUATE: "Posgrado"
    };

    // Pagination
    public page; // Actual page
    public pages; // Number of pages
    public total; // Total of records
    public prevPage;
    public nextPage;

    // Filter
    public filter = new FormControl('');
    public selectedAreas = [];
    public selectedLevels = [];

    public levels = [
        {
            label: 'Preescolar',
            value: 'GARDEN'
        },
        {
            label: 'Primaria',
            value: 'SCHOOL'
        },
        {
            label: 'Secundaria',
            value: 'MIDDLESCHOOL'
        },
        {
            label: 'Bachillerato',
            value: 'HIGHSCHOOL'
        },
        {
            label: 'Universitario',
            value: 'UNIVERSITY'
        },
        { label: 'Posgrado', value: 'GRADUATE' }
    ];

    public areas;

    public loading = true;
    @Input() isJoin: boolean; // You can adjust the data type as needed

    // Nuevas propiedades para el flujo autónomo
    public focusedLessonId: string | null = null;
    public actionType: string | null = null;
    public showFocusedLesson = false;
    public isLeaderManagement = false;

    constructor(
        private _userService: UserService,
        private _lessonService: LessonService,
        private _bDService: BasicDataService,
        private _router: Router,
        private _route: ActivatedRoute
    ) {
        this.title = 'Convocatorias';
        this.url = GLOBAL.url;
        this.token = this._userService.getToken();
        this.identity = this._userService.getIdentity();

    }

    ngDoCheck(): void {
        if (this.needReloadData) {
            this.actualPage();
            this.needReloadData = false;
        }
    }

    ngOnInit(): void {
        // Verificar si viene desde una notificación con parámetros específicos
        this._route.queryParams.subscribe(params => {
            this.focusedLessonId = params['lesson'] || null;
            this.actionType = params['action'] || null;
            
            if (this.focusedLessonId && this.actionType === 'manage') {
                console.log('Enfocando convocatoria desde notificación:', this.focusedLessonId);
                this.showFocusedLesson = true;
                this.isLeaderManagement = true;
                this.title = 'Gestionar Convocatoria - Lección Aprobada';
            }
        });

        // Si hay una lección enfocada, cargar solo esa lección
        if (this.showFocusedLesson && this.focusedLessonId) {
            this.loadFocusedLesson();
        } else {
            this.loadInitialData();
        }
        
        this.getAllAreas();
    }

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

    loadInitialData(): void {
        this.actualPage(); // Carga las lecciones paginadas
        this.fetchAllCalls(); // Carga todas las lecciones para el filtro

        this.filter.valueChanges.subscribe(() => {
            this.applyFilters();
        });
    }


    getCalls(page = 1) {

        this._lessonService.getCalls(this.token, page).subscribe({
            next: response => {
                if (response.lessons) {
                    this.lessons = response.lessons;
                    this.total = response.total;
                    this.pages = response.pages;

                    if (page > this.pages) {
                        this._router.navigate(['/inicio/convocatorias']);
                    }

                    this.loading = false;
                }
            },
            error: error => {
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

            this.getCalls(this.page);
        });
    }

    fetchAllCalls() {
        let res;

        this._lessonService.getAllCalls(this.token).subscribe(
            response => {
                if (response.lessons) {
                    this.allLessons = response.lessons;
                    this.applyFilters(); // Aplicar filtros iniciales
                }
            }, error => {
                console.log(<any>error);
            });
    }

    applyFilters() {
        let lessons = [...this.allLessons];

        // Filtro por texto
        const filterValue = this.filter.value?.toLowerCase();
        if (filterValue) {
            lessons = lessons.filter(lesson => lesson.title.toLowerCase().includes(filterValue));
        }

        // Filtro por áreas
        if (this.selectedAreas.length > 0) {
            lessons = lessons.filter(lesson =>
                lesson.knowledge_area.some(area => this.selectedAreas.includes(area.name))
            );
        }

        // Filtro por niveles
        if (this.selectedLevels.length > 0) {
            lessons = lessons.filter(lesson => 
                lesson.level && lesson.level.some(level => this.selectedLevels.includes(level))
            );
        }

        this.filteredLessons = lessons;
    }

    hasActiveFilters(): boolean {
        return !!this.filter.value || this.selectedAreas.length > 0 || this.selectedLevels.length > 0;
    }

    setArea(selectedArea) {
        if (this.selectedAreas.indexOf(selectedArea) >= 0) {
            this.selectedAreas.splice(this.selectedAreas.indexOf(selectedArea), 1);
        } else {
            this.selectedAreas.push(selectedArea);
        }

        this.applyFilters();
    }

    setLevel(selectedLevel) {

        if (this.selectedLevels.indexOf(selectedLevel) >= 0) {
            this.selectedLevels.splice(this.selectedLevels.indexOf(selectedLevel), 1);
        } else {
            this.selectedLevels.push(selectedLevel);
        }

        this.applyFilters();
    }

    public showAreas = false;
    setShowAreas() {
        if (this.showAreas) {
            this.showAreas = false;
        } else {
            this.showAreas = true;
        }
    }

    public showLevels = false;
    setShowLevels() {
        if (this.showLevels) {
            this.showLevels = false;
        } else {
            this.showLevels = true;
        }
    }

    hasJoined(lesson) {
        let tempArray = [];
        
        // Si es el líder de la lección, siempre está "unido"
        if (this.isLessonLeader(lesson)) {
            return true;
        }
        
        if (lesson && lesson.call && lesson.call.interested && lesson.call.interested.length > 0) {
            lesson.call.interested.forEach(interested => {
                // Manejar tanto objetos populados como IDs directos
                const interestedId = interested._id || interested;
                tempArray.push(interestedId);
            });

            return tempArray.indexOf(this.identity._id) >= 0;
        }
        
        return false;
    }
    
    public Templesson;
    getLesson(lesson){
        this.Templesson = lesson;
    }
    abandonLesson(){
        this.editLesson(this.Templesson, 'remove');
    }
    editLesson(lesson, action) {
        // Evitar que el líder/autor se retire de su propia lección
        if (action === 'remove' && this.isLessonLeader(lesson)) {
            alert('Como líder de la lección, no puedes retirarte de tu propia convocatoria.');
            return;
        }

        let editLesson = { ...lesson };
        
        if (action === 'remove') {
            // Buscar el índice del usuario en la lista de interesados
            const interestedIds = editLesson.call.interested.map(interested => 
                interested._id || interested
            );
            const ix = interestedIds.indexOf(this.identity._id);
            
            if (ix >= 0) {
                editLesson.call.interested.splice(ix, 1);
            } else {
                console.warn('Usuario no encontrado en la lista de interesados');
                return;
            }

        } else if (action === 'add') {
            // Verificar si ya está en la lista
            const interestedIds = editLesson.call.interested.map(interested => 
                interested._id || interested
            );
            
            if (interestedIds.indexOf(this.identity._id) >= 0) {
                console.warn('El usuario ya está en la lista de interesados');
                return;
            }

            editLesson.call.interested.push(this.identity._id);
        }

        this._lessonService.editLesson(this.token, editLesson).subscribe(
            (response: any) => {
                if (response && response.lesson._id) {
                    this.getCalls(this.page);
                    this.fetchAllCalls();
                    
                    // Mostrar mensaje de confirmación
                    const actionText = action === 'add' ? 'unido a' : 'retirado de';
                    console.log(`Te has ${actionText} la convocatoria "${lesson.title}"`);
                }
            },
            error => {
                console.error('Error al actualizar la lección:', error);
                const actionText = action === 'add' ? 'unirse a' : 'retirarse de';
                alert(`Hubo un error al ${actionText} la convocatoria. Por favor, inténtalo de nuevo.`);
            }
        );
    }

    public callLesson;
    openDetailsModal(lesson: any) {
        this.callLesson = lesson;
        setTimeout(() => {
            try {
                const modal = document.getElementById('details');
                if (modal) {
                    const existingInstance = (window as any).bootstrap?.Modal?.getInstance(modal);
                    if (existingInstance) {
                        existingInstance.dispose();
                    }
                    const bootstrapModal = new (window as any).bootstrap.Modal(modal);
                    bootstrapModal.show();
                }
            } catch (error) {
                console.log('Error al abrir modal de detalles:', error);
            }
        }, 0);
    }

    openLeaveModal(lesson: any) {
        this.getLesson(lesson);
        setTimeout(() => {
            try {
                const modal = document.getElementById('leftconvo');
                if (modal) {
                    const existingInstance = (window as any).bootstrap?.Modal?.getInstance(modal);
                    if (existingInstance) {
                        existingInstance.dispose();
                    }
                    const bootstrapModal = new (window as any).bootstrap.Modal(modal);
                    bootstrapModal.show();
                }
            } catch (error) {
                console.log('Error al abrir modal de retirarse:', error);
            }
        }, 0);
    }

    public needReloadData;
    setNeedReload(event){
        this.needReloadData = true;
    }

    // NUEVOS MÉTODOS PARA FLUJO AUTÓNOMO

    // Obtener lección específica para enfoque desde notificación
    loadFocusedLesson() {
        if (!this.focusedLessonId) return;
        
        this._lessonService.getLesson(this.token, this.focusedLessonId).subscribe(
            response => {
                if (response.lesson) {
                    // Crear un array con solo la lección enfocada
                    this.lessons = [response.lesson];
                    this.loading = false;
                    console.log('Convocatoria enfocada cargada:', response.lesson.title);
                } else {
                    console.error('No se pudo cargar la convocatoria enfocada');
                    this.loading = false;
                }
            },
            error => {
                console.error('Error cargando convocatoria enfocada:', error);
                this.loading = false;
            }
        );
    }

    // Verificar si el usuario actual es el líder/autor de la lección
    isLessonLeader(lesson: any): boolean {
        if (!lesson || !this.identity) {
            return false;
        }
        
        // Manejar tanto autor populado como ID directo
        const authorId = lesson.author && lesson.author._id ? lesson.author._id : lesson.author;
        const leaderId = lesson.leader && lesson.leader._id ? lesson.leader._id : lesson.leader;
        
        return authorId === this.identity._id || leaderId === this.identity._id;
    }

    // Verificar si la lección está en estado 'approved_by_expert'
    isApprovedByFacilitator(lesson: any): boolean {
        return lesson.state === 'approved_by_expert';
    }

    // Activar lección (cambiar estado de approved_by_expert a assigned)
    activateLesson(lesson: any) {
        if (!this.isLessonLeader(lesson) || !this.isApprovedByFacilitator(lesson)) {
            console.error('No tienes permisos para activar esta lección');
            return;
        }

        const participantCount = lesson.call?.interested?.length || 0;
        const confirmMessage = `¿Estás seguro de que quieres activar la lección "${lesson.title}"?\n\nParticipantes actuales: ${participantCount}\n\nEsta acción iniciará oficialmente el desarrollo de la lección y notificará a todos los participantes.`;

        if (confirm(confirmMessage)) {
            console.log('Activando lección:', lesson._id);
            
            // Actualizar el estado de la lección
            const updatedLesson = { ...lesson };
            updatedLesson.state = 'assigned';
            
            this._lessonService.editLesson(this.token, updatedLesson).subscribe({
                next: response => {
                    console.log('Lección activada exitosamente:', response);
                    alert('¡Lección activada exitosamente! Todos los participantes han sido notificados.');
                    
                    // Actualizar la lección en la vista actual
                    const lessonIndex = this.lessons.findIndex(l => l._id === lesson._id);
                    if (lessonIndex !== -1) {
                        this.lessons[lessonIndex] = { ...this.lessons[lessonIndex], state: 'assigned' };
                    }
                    
                    // Si estamos en vista enfocada, redirigir a Mis Lecciones
                    if (this.showFocusedLesson) {
                        this._router.navigate(['/inicio/mis-lecciones']);
                    }
                },
                error: error => {
                    console.error('Error activando lección:', error);
                    let errorMessage = 'Hubo un error al activar la lección. Por favor, inténtalo de nuevo.';
                    
                    if (error.status === 403) {
                        errorMessage = 'No tienes permisos para activar esta lección.';
                    } else if (error.status === 404) {
                        errorMessage = 'La lección no fue encontrada.';
                    } else if (error.status === 400) {
                        errorMessage = 'La lección no puede ser activada en su estado actual.';
                    }
                    
                    alert(errorMessage);
                }
            });
        }
    }

    // Obtener el número de participantes interesados
    getParticipantCount(lesson: any): number {
        return lesson.call?.interested?.length || 0;
    }

    // Verificar si hay suficientes participantes (mínimo sugerido)
    hasSufficientParticipants(lesson: any): boolean {
        return this.getParticipantCount(lesson) >= 2; // Mínimo 2 participantes incluyendo el autor
    }
}
