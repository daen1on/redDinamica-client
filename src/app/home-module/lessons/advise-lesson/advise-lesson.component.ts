import { Component, OnInit } from '@angular/core';
import { ACADEMIC_LEVEL, LESSON_STATES } from 'src/app/services/DATA';
import { FormControl } from '@angular/forms';
import { UserService } from 'src/app/services/user.service';
import { LessonService } from 'src/app/services/lesson.service';
import { BasicDataService } from 'src/app/services/basicData.service';
import { Router, ActivatedRoute } from '@angular/router';
import { GLOBAL } from 'src/app/services/GLOBAL';

@Component({
    selector: 'advise-lesson',
    templateUrl: './advise-lesson.component.html',
    standalone: false
})
export class AdviseLessonComponent implements OnInit {
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

    // Pagination
    public page; // Actual page
    public pages; // Number of pages
    public total; // Total of records
    public prevPage;
    public nextPage;

    // Filter
    public filter;
    public selectedStates = [];

    public states = [
        {
            label: "Invitaciones",
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
            value: "highschool"
        },
        {
            label: "Universitario",
            value: "university"
        }
    ];

    public loading = true;
    public focusedLessonId: string | null = null;
    public actionType: string | null = null;
    public showFocusedLesson = false;
    
    // Modal properties
    public showPreviewModal = false;
    public selectedLessonForPreview: any = null;

    constructor(
        private _userService: UserService,
        private _lessonService: LessonService,
        private _bDService: BasicDataService,
        private _router: Router,
        private _route: ActivatedRoute
    ) {
        this.title = 'Asesorar lecciones';
        this.url = GLOBAL.url;
        this.token = this._userService.getToken();
        this.identity = this._userService.getIdentity();
        this.areas;
    }

    ngOnInit(): void {
        // Verificar si viene desde una notificación con parámetros específicos
        this._route.queryParams.subscribe(params => {
            this.focusedLessonId = params['lesson'] || null;
            this.actionType = params['action'] || null;

            // Flujo original: aprobar
            if (this.focusedLessonId && this.actionType === 'approve') {
                console.log('Enfocando lección desde notificación:', this.focusedLessonId);
                this.showFocusedLesson = true;
                this.title = 'Aprobar Lección como Facilitador';
            }

            // Nuevo flujo: abrir modal de previsualización directo
            const openPreview = String(params['openPreview'] || '').toLowerCase() === 'true';
            const lessonId = params['lessonId'] || params['lesson_id'] || null;
            if (openPreview && lessonId) {
                this._lessonService.getLesson(this.token, lessonId).subscribe({
                    next: (response) => {
                        const lesson = response?.lesson || response?.data || null;
                        if (lesson) {
                            this.openPreviewModal(lesson);
                        }
                    },
                    error: (error) => {
                        console.error('Error cargando lección para openPreview:', error);
                    }
                });
            }
        });
        
        // Si hay una lección enfocada, cargar solo esa lección
        if (this.showFocusedLesson && this.focusedLessonId) {
            this.getFocusedLesson();
        } else {
            this.getAllLessonsToAdvise();
            this.actualPage();
        }
        
        this.getAllAreas();
    }

    setState(selectedState) {
        if (this.selectedStates.indexOf(selectedState) >= 0) {
            this.selectedStates.splice(this.selectedStates.indexOf(selectedState), 1);

        } else {
            this.selectedStates.push(selectedState);

        }

        this.getAllLessonsToAdvise();
    }
    
    getAllAreas() {
        this.areas = JSON.parse(localStorage.getItem('areas'));


        if (!this.areas) {

            this._bDService.getAllKnowledgeAreas().subscribe({
                next: response => {
                    if (response.areas) {
                        this.areas = response.areas;

                        localStorage.setItem('areas', JSON.stringify(this.areas));
                    }
                },
                error: error => {
                    console.log(<any>error);
                }
            });
        }
    }

    getAllLessonsToAdvise() {
        console.log('=== getAllLessonsToAdvise called ===');
        let filteredLessons = [];

        this._lessonService.getAllLessonsToAdvise(this.token).subscribe({
            next: response => {
                console.log('getAllLessonsToAdvise response:', response);
                if (response.lessons) {
                    // Mantener la lista base completa en `lessons`
                    this.lessons = response.lessons;
                    console.log('All lessons to advise (base list):', this.lessons.length);
                    
                    // Log each lesson details
                    this.allLessons.forEach(lesson => {
                        console.log(`- ${lesson.title} (state: ${lesson.state}) - suggested_facilitator: ${lesson.suggested_facilitator?._id} - expert: ${lesson.expert?._id}`);
                    });

                 
                    // Por defecto, mostrar todas en `allLessons` (resultado de vista)
                    this.allLessons = this.lessons;

                    // Filter by state
                    if (this.selectedStates.length > 0) {
                        console.log('Filtering by selected states:', this.selectedStates);
                        const selectedStatesSet = new Set(this.selectedStates);
                        this.allLessons = this.lessons.filter(lesson => selectedStatesSet.has(lesson.state));
                        console.log('Filtered lessons:', this.allLessons.length);
                        console.log('Selected states:', this.selectedStates);
                    } else {
                        console.log('No states selected, showing all lessons');
                    }

                    this.loading = false;
                }
            },
            error: error => {
                console.log('Error in getAllLessonsToAdvise:', error);
                this.loading = false;
            }
        });
    }

    getLessonsToAdvise(page = 1) {

        this._lessonService.getLessonsToAdvise(this.token, page).subscribe({
            next: response => {
                if (response.lessons) {
                    this.lessons = response.lessons;
                    this.total = response.total;
                    this.pages = response.pages;

                    if (page > this.pages) {
                        this._router.navigate(['/inicio/asesorar-lecciones']);
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

            this.getLessonsToAdvise(this.page);
        });
    }

    reloadLessons() {
        this.getAllLessonsToAdvise();
    }

    // Obtener lección específica para enfoque desde notificación
    getFocusedLesson() {
        if (!this.focusedLessonId) return;
        
        this._lessonService.getLesson(this.token, this.focusedLessonId).subscribe({
            next: response => {
                if (response.lesson) {
                    // Crear un array con solo la lección enfocada
                    this.lessons = [response.lesson];
                    this.loading = false;
                    console.log('Lección enfocada cargada:', response.lesson.title);
                    console.log('Datos completos de la lección:', response.lesson);
                    
                    // Si viene desde notificación y es una lección propuesta, abrir el modal automáticamente
                    if (this.actionType === 'approve' && response.lesson.state === 'proposed') {
                        this.openPreviewModal(response.lesson);
                    }
                } else {
                    console.error('No se pudo cargar la lección enfocada');
                    this.loading = false;
                }
            },
            error: error => {
                console.error('Error cargando lección enfocada:', error);
                this.loading = false;
            }
        });
    }

    // Verificar si el usuario actual es el facilitador sugerido para esta lección
    isSuggestedFacilitator(lesson: any): boolean {
   
        return lesson.suggested_facilitator && lesson.suggested_facilitator._id === this.identity._id;
    }

    // Verificar si la lección está en estado 'proposed'
    isProposedLesson(lesson: any): boolean {
  
        return lesson.state === 'proposed';
    }

    // Aprobar lección como facilitador y crear convocatoria automáticamente
    approveLesson(lesson: any) {
        if (!this.isSuggestedFacilitator(lesson) || !this.isProposedLesson(lesson)) {
            console.error('No tienes permisos para aprobar esta lección');
            return;
        }

        if (confirm(`¿Estás seguro de que quieres avalar la lección "${lesson.title}" ? Esta acción notificará al líder para que abra la convocatoria.`)) {
            
            this._lessonService.approveFacilitatorSuggestion(this.token, lesson._id).subscribe({
                next: response => {
                    alert('¡Lección aprobada exitosamente! El líder ha sido notificado para abrir la convocatoria.');
                    
                    // Cerrar modal si está abierto
                    this.closePreviewModal();
                    
                    // Redirigir de vuelta a la lista general y recargar
                    this._router.navigate(['/inicio/asesorar-lecciones']).then(() => {
                        try { (window as any).location?.reload(); } catch {}
                    });
                },
                error: error => {
                    console.error('Error aprobando lección:', error);
                    alert('Hubo un error al aprobar la lección. Por favor, inténtalo de nuevo.');
                }
            });
        }
    }

    // Métodos para el modal de previsualización
    openPreviewModal(lesson: any) {
        this.selectedLessonForPreview = lesson;
        this.showPreviewModal = true;
        console.log('Abriendo modal de previsualización para:', lesson.title);
    }

    closePreviewModal() {
        this.showPreviewModal = false;
        this.selectedLessonForPreview = null;
    }

    // Manejar click en el botón "Ver lección" para lecciones propuestas
    handleViewLesson(lesson: any) {
        if (lesson.state === 'proposed' && this.isSuggestedFacilitator(lesson)) {
            // Si es una lección propuesta y el usuario es el facilitador sugerido, abrir modal
            this.openPreviewModal(lesson);
        } else {
            // Para otras lecciones, navegar normalmente
            this._router.navigate(['/inicio/leccion', lesson._id]);
        }
    }

    // Rechazar lección como facilitador
    rejectLessonSuggestion(lesson: any) {
        if (!this.isSuggestedFacilitator(lesson) || !this.isProposedLesson(lesson)) {
            console.error('No tienes permisos para rechazar esta lección');
            return;
        }

        // Determinar mensaje según si la lección ya fue aceptada por admin
        const isAccepted = lesson.accepted === true;
        const confirmMessage = isAccepted 
            ? `¿Estás seguro de que quieres retirarte de la lección "${lesson.title}"? La lección ya fue aceptada, por lo que un administrador deberá asignar un nuevo facilitador.`
            : `¿Estás seguro de que quieres rechazar la lección "${lesson.title}"? Esta acción notificará al autor que debe buscar otro facilitador.`;

        if (confirm(confirmMessage)) {
            console.log('Rechazando/Retirándose de lección:', lesson._id);
            
            const reason = prompt('Por favor, indica el motivo (opcional):') || 'El facilitador ha decidido no participar en esta lección.';
            
            this._lessonService.rejectFacilitatorSuggestion(this.token, lesson._id, reason).subscribe({
                next: response => {
                    console.log('Respuesta del servidor:', response);
                    
                    // Verificar si fue retiro (lección ya aceptada) o rechazo completo
                    if (response.withdrawn) {
                        alert('Te has retirado de la lección exitosamente. Un administrador asignará un nuevo facilitador.');
                    } else {
                        alert('Lección rechazada. El autor ha sido notificado para que busque otro facilitador.');
                    }
                    
                    // Cerrar modal
                    this.closePreviewModal();
                    
                    // Redirigir de vuelta a la lista general y recargar la página
                    this._router.navigate(['/inicio/asesorar-lecciones']).then(() => {
                        window.location.reload();
                    });
                },
                error: error => {
                    console.error('Error rechazando lección:', error);
                    alert('Hubo un error al procesar tu solicitud. Por favor, inténtalo de nuevo.');
                }
            });
        }
    }

}

