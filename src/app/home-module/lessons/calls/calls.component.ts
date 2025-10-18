import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormControl, UntypedFormControl } from '@angular/forms';
import { UserService } from 'src/app/services/user.service';
import { LessonService } from 'src/app/services/lesson.service';
import { BasicDataService } from 'src/app/services/basicData.service';
import { Router, ActivatedRoute } from '@angular/router';
import { NotificationService } from 'src/app/services/notification.service';
import { GLOBAL } from 'src/app/services/GLOBAL';

@Component({
    selector: 'calls',
    templateUrl: './calls.component.html',
    standalone: false
})
export class CallsComponent implements OnInit, OnDestroy {
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

    // Borradores de convocatoria por lección
    private callDraftByLessonId: { [lessonId: string]: { text: string; visible: boolean } } = {};
    public isSavingCall: { [lessonId: string]: boolean } = {};
    // Polling de actualizaciones cuando el listado está visible
    private realtimeTimer: any;

    constructor(
        private _userService: UserService,
        private _lessonService: LessonService,
        private _bDService: BasicDataService,
        private _router: Router,
        private _route: ActivatedRoute,
        private notificationService: NotificationService
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
                this.loadFocusedLesson();
            } else {
                this.showFocusedLesson = false;
                this.isLeaderManagement = false;
                this.title = 'Convocatorias';
                this.loadInitialData();
            }
        });

        this.getAllAreas();
        // Iniciar polling para ver cambios de interesados en tiempo casi real
        this.startRealtimeSync();
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
                    // Reemplazar la lección actualizada en memoria para efecto inmediato
                    const updated = response.lesson;
                    const ix = this.lessons.findIndex(l => l._id === updated._id);
                    if (ix >= 0) {
                        this.lessons[ix] = { ...this.lessons[ix], ...updated };
                    }
                    // Actualizar listados auxiliares
                    this.getCalls(this.page);
                    this.fetchAllCalls();
                    
                    // Mostrar mensaje de confirmación
                    const actionText = action === 'add' ? 'unido a' : 'retirado de';
                    console.log(`Te has ${actionText} la convocatoria "${lesson.title}"`);

                    // Notificar al líder cuando alguien se une
                    if (action === 'add') {
                        this.notifyLeaderUserJoined(lesson);
                        
                    } else if (action === 'remove') {
                        this.notifyLeaderUserLeft(lesson);
                    }
                }
            },
            error => {
                console.error('Error al actualizar la lección:', error);
                const actionText = action === 'add' ? 'unirse a' : 'retirarse de';
                alert(`Hubo un error al ${actionText} la convocatoria. Por favor, inténtalo de nuevo.`);
            }
        );
    }

    private notifyLeaderUserJoined(lesson: any): void {
        try {
            // Resolver ID del líder (preferir leader, luego author)
            const leaderId = (lesson.leader && (lesson.leader._id || lesson.leader)) ||
                             (lesson.author && (lesson.author._id || lesson.author));

            if (!leaderId) {
                console.warn('No se pudo determinar el líder para notificar.');
                return;
            }
            // Evitar auto-notificación si quien se une es el líder
            if (leaderId === this.identity?._id) {
                return;
            }

            const notificationPayload = {
                user: leaderId,
                type: 'lesson',
                title: 'Nuevo participante en tu convocatoria',
                content: `${this.identity?.name || 'Alguien'} ${this.identity?.surname || ''} se ha unido a la convocatoria "${lesson.title}"`,
                link: `/inicio/convocatorias?lesson=${lesson._id}&action=manage`,
                relatedId: lesson._id,
                relatedModel: 'Lesson',
                from: this.identity?._id,
                priority: 'medium'
            };

            this.notificationService.createNotification(notificationPayload).subscribe({
                next: () => console.log('Notificación enviada al líder por nuevo participante'),
                error: (err) => console.warn('No se pudo enviar la notificación al líder:', err)
            });
        } catch (err) {
            console.warn('Error preparando notificación al líder:', err);
        }
    }

    private notifyLeaderUserLeft(lesson: any): void {
        try {
            const leaderId = (lesson.leader && (lesson.leader._id || lesson.leader)) ||
                             (lesson.author && (lesson.author._id || lesson.author));

            if (!leaderId) {
                console.warn('No se pudo determinar el líder para notificar salida.');
                return;
            }
            if (leaderId === this.identity?._id) {
                return;
            }

            const notificationPayload = {
                user: leaderId,
                type: 'lesson',
                title: 'Un participante se retiró de tu convocatoria',
                content: `${this.identity?.name || 'Alguien'} ${this.identity?.surname || ''} se retiró de la convocatoria "${lesson.title}"`,
                link: `/inicio/convocatorias?lesson=${lesson._id}&action=manage`,
                relatedId: lesson._id,
                relatedModel: 'Lesson',
                from: this.identity?._id,
                priority: 'low'
            };

            this.notificationService.createNotification(notificationPayload).subscribe({
                next: () => console.log('Notificación enviada al líder por retiro de participante'),
                error: (err) => console.warn('No se pudo enviar la notificación de retiro al líder:', err)
            });
        } catch (err) {
            console.warn('Error preparando notificación de retiro al líder:', err);
        }
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
                    modal.addEventListener('hidden.bs.modal', () => {
                        // limpiar lección enfocada al cerrar
                        this.callLesson = null;
                        // refrescar datos tras cerrar para evitar formularios rotos
                        this.actualPage();
                    }, { once: true });
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
                    // Evitar cierre inmediato por propagación de eventos
                    modal.addEventListener('hidePrevented.bs.modal', (e: any) => e.preventDefault());
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
        // Fuerza una recarga completa cuando la acción lo requiere
        try {
            if (event === 'forceReload') {
                (window as any).location?.reload();
            }
        } catch (e) {
            console.warn('No se pudo forzar la recarga:', e);
        }
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
                    // Inicializar borrador si aplica
                    const lesson = response.lesson;
                    if (this.isLessonLeader(lesson) && this.isApprovedByFacilitator(lesson)) {
                        this.ensureCallDraft(lesson);
                    }
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

    // Verificar si la lección está avalada por facilitador (accepted=true) o estado approved_by_expert
    isApprovedByFacilitator(lesson: any): boolean {
        return lesson?.accepted === true || lesson?.state === 'approved_by_expert';
    }

    // -------- Formulario para abrir/editar convocatoria --------
    private ensureCallDraft(lesson: any): void {
        const id = lesson._id;
        if (!this.callDraftByLessonId[id]) {
            const baseText = lesson.call?.text || this.generateDefaultCallText(lesson);
            const baseVisible = (lesson.call && typeof lesson.call.visible === 'boolean') ? lesson.call.visible : true;
            this.callDraftByLessonId[id] = { text: baseText, visible: baseVisible };
        }
    }

    getCallDraftText(lesson: any): string {
        this.ensureCallDraft(lesson);
        return this.callDraftByLessonId[lesson._id].text;
    }

    setCallDraftText(lesson: any, value: string): void {
        this.ensureCallDraft(lesson);
        this.callDraftByLessonId[lesson._id].text = value;
    }

    getCallDraftVisible(lesson: any): boolean {
        this.ensureCallDraft(lesson);
        return this.callDraftByLessonId[lesson._id].visible;
    }

    setCallDraftVisible(lesson: any, value: boolean): void {
        this.ensureCallDraft(lesson);
        this.callDraftByLessonId[lesson._id].visible = value;
        // Si se desactiva la visibilidad, guardar inmediatamente y recargar
        if (value === false) {
            this.submitCall(lesson, { forceReload: true });
        } else if (value === true && !lesson.call?.text) {
            // Si se habilita visibilidad y aún no existe convocatoria: crearla automáticamente
            const draft = this.callDraftByLessonId[lesson._id];
            if (!draft.text || draft.text.trim().length < 10) {
                // Generar texto por defecto si el borrador es muy corto
                draft.text = this.generateDefaultCallText(lesson);
            }
            this.submitCall(lesson);
        }
    }

    // Compara si el borrador es idéntico a lo guardado (solo descripción)
    isDraftSameAsSaved(lesson: any): boolean {
        this.ensureCallDraft(lesson);
        const normalize = (s: string) => (s || '').replace(/\r\n/g, '\n').trim();
        const savedText = normalize(lesson?.call?.text || '');
        const draftText = normalize(this.callDraftByLessonId[lesson._id]?.text || '');
        return savedText === draftText;
    }

    generateDefaultCallText(lesson: any): string {
        const areas = (lesson.knowledge_area || []).map(a => a.name).join(', ');
        const levels = (lesson.level || [])
         .map(key => this.academic_level[key]) 
         .join(', '); 
        const lines = [
            `El facilitador ha aprobado esta lección. ¡Abrimos convocatoria para el desarrollo!`,
            `Título: ${lesson.title}`,
            areas ? `Áreas: ${areas}` : '',
            levels ? `Niveles: ${levels}` : '',
            `Si te interesa participar, únete al grupo desde esta convocatoria.`
        ].filter(Boolean);
        return lines.join('\n');
    }

    submitCall(lesson: any, options?: { forceReload?: boolean }): void {
        if (!this.isLessonLeader(lesson) || !this.isApprovedByFacilitator(lesson)) {
            alert('Solo el líder puede abrir/editar la convocatoria en este estado.');
            return;
        }
        const draft = this.callDraftByLessonId[lesson._id];
        if (!draft?.text || draft.text.trim().length < 10) {
            alert('La descripción de la convocatoria es muy corta. Añade más detalles.');
            return;
        }
        this.isSavingCall[lesson._id] = true;
        this._lessonService.createCall(this.token, lesson._id, { text: draft.text, visible: draft.visible })
            .subscribe({
                next: (response: any) => {
                    if (response?.lesson) {
                        // Actualizar la lección en la vista preservando campos no populados
                        const ix = this.lessons.findIndex(l => l._id === lesson._id);
                        if (ix >= 0) {
                            const previous = this.lessons[ix];
                            const incoming = response.lesson;

                            // Si el backend no retornó áreas/levels populados, conservar los existentes
                            const incomingAreas = Array.isArray(incoming?.knowledge_area) ? incoming.knowledge_area : [];
                            const areasAreObjects = incomingAreas.length > 0 && typeof incomingAreas[0] === 'object';
                            const mergedAreas = areasAreObjects && incomingAreas?.length ? incomingAreas : previous?.knowledge_area;

                            const mergedLevels = (incoming?.level && incoming.level.length) ? incoming.level : previous?.level;

                            this.lessons[ix] = {
                                ...previous,
                                ...incoming,
                                knowledge_area: mergedAreas,
                                level: mergedLevels,
                                call: incoming.call ?? previous.call
                            };
                        }
                        alert('Convocatoria guardada correctamente.');
                    }
                    this.isSavingCall[lesson._id] = false;
                    // Recargar si se desactivó visibilidad o si se solicitó forzar
                    if (draft.visible === false || options?.forceReload) {
                        try { (window as any).location?.reload(); } catch {}
                    }
                },
                error: (err) => {
                    console.error('Error al guardar convocatoria', err);
                    this.isSavingCall[lesson._id] = false;
                    alert('No se pudo guardar la convocatoria.');
                }
            });
    }

    // Forzar abrir convocatoria: visible = true (manteniendo/creando el texto)
    openCall(lesson: any): void {
        if (!this.isLessonLeader(lesson) || !this.isApprovedByFacilitator(lesson)) {
            alert('Solo el líder puede abrir la convocatoria en este estado.');
            return;
        }

        this.ensureCallDraft(lesson);
        const draft = this.callDraftByLessonId[lesson._id];
        if (!draft.text || draft.text.trim().length < 10) {
            draft.text = this.generateDefaultCallText(lesson);
        }
        draft.visible = true;

        this.isSavingCall[lesson._id] = true;
        this._lessonService.createCall(this.token, lesson._id, { text: draft.text, visible: true })
            .subscribe({
                next: (response: any) => {
                    this.isSavingCall[lesson._id] = false;
                    if (response?.lesson) {
                        // Actualiza la lección local con call.visible=true
                        const ix = this.lessons.findIndex(l => l._id === lesson._id);
                        if (ix >= 0) {
                            const previous = this.lessons[ix];
                            const incoming = response.lesson;
                            this.lessons[ix] = {
                                ...previous,
                                ...incoming,
                                call: { ...(incoming.call || previous.call || {}), text: draft.text, visible: true }
                            };
                        }
                        alert('Convocatoria abierta correctamente.');
                    }
                },
                error: (err) => {
                    console.error('Error al abrir convocatoria', err);
                    this.isSavingCall[lesson._id] = false;
                    alert('No se pudo abrir la convocatoria.');
                }
            });
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

                    // Crear conversación General por defecto con un primer mensaje
                    const initialText = 'comienza a hablar';
                    this._lessonService.addLessonMessage(this.token, lesson._id, { text: initialText, conversationTitle: 'General' })
                        .subscribe({
                            next: () => {
                                alert('¡Lección activada! Se creó el chat General automáticamente.');
                            },
                            error: (err) => {
                                console.error('No se pudo crear la conversación General por defecto:', err);
                                alert('Lección activada, pero hubo un problema creando el chat General.');
                            }
                        });

                    // Actualizar la lección en la vista actual
                    const lessonIndex = this.lessons.findIndex(l => l._id === lesson._id);
                    if (lessonIndex !== -1) {
                        this.lessons[lessonIndex] = { ...this.lessons[lessonIndex], state: 'assigned' };
                    }
                    
                    // Si estamos en vista enfocada, redirigir a Mis Lecciones
                    if (this.showFocusedLesson) {
                        this._router.navigate(['/inicio/mis-lecciones']);
                    }
                    // Forzar recarga para reflejar cambios en todas las vistas
                    try { (window as any).location?.reload(); } catch {}
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

    ngOnDestroy(): void {
        this.stopRealtimeSync();
    }

    private startRealtimeSync(): void {
        this.stopRealtimeSync();
        this.realtimeTimer = setInterval(() => {
            // Refrescar sin bloquear UI
            this.getCalls(this.page || 1);
        }, 7000);
    }

    private stopRealtimeSync(): void {
        if (this.realtimeTimer) {
            clearInterval(this.realtimeTimer);
            this.realtimeTimer = null;
        }
    }
}
