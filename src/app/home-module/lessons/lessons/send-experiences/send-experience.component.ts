import { Component, OnInit, Output, EventEmitter, AfterViewInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormControl, Validators } from '@angular/forms';

import { UserService } from 'src/app/services/user.service';
import { LessonService } from 'src/app/services/lesson.service';
import { BasicDataService } from 'src/app/services/basicData.service';
import { NotificationService } from 'src/app/services/notification.service';
import { GLOBAL } from 'src/app/services/GLOBAL';
import { Lesson } from 'src/app/models/lesson.model';
import { User } from 'src/app/models/user.model';
import { KnowledgeArea } from 'src/app/models/knowledge-area.model';
import { ACADEMIC_LEVEL } from 'src/app/services/DATA';


@Component({
    selector: 'send-experience',
    templateUrl: './send-experience.component.html',
    standalone: false
})
export class SendExperienceComponent implements OnInit, AfterViewInit {
    public title: string;
    public identity: any;
    public token: string;
    public url: string;

    public fields: any[];
    public sendForm: UntypedFormGroup;

    public status: string;
    public submitted: boolean;
    public loading = false;

    public errorMsg: string;
    public successMsg: string;

    public lesson: Lesson;

    public knowledgeAreas: KnowledgeArea[] = [];
    public academicLevels = Object.entries(ACADEMIC_LEVEL).map(([key, value]) => ({ key, value }));
    public facilitators: User[] = [];
    public showSuccessActions = false;
    
    // Para autocompletado de áreas
    public knowledgeAreaInput = '';
    public filteredKnowledgeAreas: KnowledgeArea[] = [];
    public selectedKnowledgeAreas: KnowledgeArea[] = [];
    public showKnowledgeAreaDropdown = false;
    
    // Para autocompletado de niveles
    public levelInput = '';
    public filteredLevels: any[] = [];
    public selectedLevels: any[] = [];
    public showLevelDropdown = false;

    // Para mostrar facilitador sugerido
    public showFacilitatorField = false;

    @Output() added = new EventEmitter();

    constructor(
        private _userService: UserService,
        private _lessonService: LessonService,
        private _bDService: BasicDataService,
        private _notificationService: NotificationService
    ) {
        this.title = 'Enviar experiencia';
        this.identity = this._userService.getIdentity();
        this.token = this._userService.getToken();
        this.url = GLOBAL.url;

        this.fields = [
            { id: "title", label: "Título", type: "text", required: true },
            { id: "resume", label: "Resumen", type: "textarea", required: true },
            { id: "references", label: "Referencias", type: "textarea", required: true },
            { id: "type", label: "Tipo", type: "select", required: true, options: [
                { value: "", label: "Selecciona el tipo" },
                { value: "Desarrollo", label: "Desarrollo" },
                { value: "Consideración", label: "Consideración" }
            ]}
        ];

        this.errorMsg = 'Hubo un error al enviar la experiencia. Inténtalo de nuevo más tarde.';
        this.successMsg = 'Se ha enviado la experiencia correctamente. Será revisada por el administrador y recibirás una notificación cuando sea aprobada.';

        this.sendForm = new UntypedFormGroup({
            title: new UntypedFormControl('', Validators.required),
            resume: new UntypedFormControl('', Validators.required),
            references: new UntypedFormControl('', Validators.required),
            type: new UntypedFormControl('', Validators.required),
            knowledge_area: new UntypedFormControl([], Validators.required),
            level: new UntypedFormControl([], Validators.required),
            suggested_facilitator: new UntypedFormControl('')
        });
    }

    ngOnInit(): void {
        this.loadKnowledgeAreas();
        this.loadFacilitators();
        this.setupFormWatchers();
    }

    ngAfterViewInit(): void {
        this.setupModalEvents();
        this.setupClickOutsideListener();
    }

    setupModalEvents() {
        const modal = document.getElementById('send');
        if (modal) {
            modal.addEventListener('shown.bs.modal', () => {
                modal.removeAttribute('aria-hidden');
            });
            modal.addEventListener('hidden.bs.modal', () => {
                modal.setAttribute('aria-hidden', 'true');
            });
            modal.addEventListener('show.bs.modal', () => {
                modal.removeAttribute('aria-hidden');
            });
        }
    }

    setupFormWatchers() {
        // Observar cambios en el tipo para mostrar/ocultar facilitador sugerido
        this.sendForm.get('type')?.valueChanges.subscribe(value => {
            this.showFacilitatorField = value === 'Desarrollo';
            if (!this.showFacilitatorField) {
                this.sendForm.get('suggested_facilitator')?.setValue('');
            }
        });
    }

    loadKnowledgeAreas(): void {
        this._bDService.getKnowledgeAreas().subscribe({
            next: (response) => {
                if (response && Array.isArray(response.areas)) {
                    this.knowledgeAreas = response.areas;
                } else {
                    this.knowledgeAreas = [];
                    console.error('La respuesta de áreas de conocimiento no es un array:', response);
                }
            },
            error: (error) => {
                console.error("Error al cargar las áreas de conocimiento:", error);
                this.knowledgeAreas = [];
            }
        });
    }

    loadFacilitators(): void {
        this._userService.getAllUsers().subscribe({
            next: (response) => {
                if (response && response.users) {
                    this.facilitators = response.users.filter(user => {
                        return user.role === 'expert' || user.role === 'admin' || user.role === 'delegated_admin' || user.canAdvise;
                    });
                }
            },
            error: (error) => {
                console.error('Error al cargar facilitadores:', error);
                this.facilitators = [];
            }
        });
    }

    get f() { return this.sendForm.controls; }

    restartValues() {
        this.status = null;
        this.submitted = false;
        this.showSuccessActions = false;
        this.showFacilitatorField = false;
        this.sendForm.reset();
        this.sendForm.patchValue({
            knowledge_area: [],
            level: []
        });
        
        // Limpiar autocompletado
        this.selectedKnowledgeAreas = [];
        this.selectedLevels = [];
        this.knowledgeAreaInput = '';
        this.levelInput = '';
        this.showKnowledgeAreaDropdown = false;
        this.showLevelDropdown = false;
    }

    onSubmit() {
        this.submitted = true;
        this.loading = true;

        if (this.sendForm.invalid) {
            this.loading = false;
            return;
        }

        this.lesson = new Lesson();
        this.lesson.title = this.sendForm.value.title;
        this.lesson.resume = this.sendForm.value.resume;
        this.lesson.references = this.sendForm.value.references;
        this.lesson.type = this.sendForm.value.type;
        this.lesson.accepted = false;
        this.lesson.author = this.identity._id;
        this.lesson.class = 'experience';
        
        // Convertir áreas de conocimiento seleccionadas
        this.lesson.knowledge_area = Array.isArray(this.sendForm.value.knowledge_area) 
            ? this.sendForm.value.knowledge_area 
            : [this.sendForm.value.knowledge_area];
        
        // Convertir niveles académicos de valores a claves
        const selectedLevels = Array.isArray(this.sendForm.value.level) 
            ? this.sendForm.value.level 
            : [this.sendForm.value.level];
        
        this.lesson.level = Object.entries(ACADEMIC_LEVEL)
            .filter(([key, value]) => selectedLevels.includes(value))
            .map(([key, value]) => key);
        
        // Facilitador sugerido (opcional)
        if (this.showFacilitatorField && this.sendForm.value.suggested_facilitator) {
            this.lesson.suggested_facilitator = this.sendForm.value.suggested_facilitator;
        }

        this._lessonService.addLesson(this.token, this.lesson).subscribe({
            next: (response) => {
                if (response.lesson && response.lesson._id) {
                    this.status = 'success';
                    this.showSuccessActions = true;
                    this.sendNotifications(response.lesson);
                } else {
                    this.status = 'error';
                    console.log(<any>response);
                }
                this.loading = false;
            },
            error: (error) => {
                this.status = 'error';
                this.loading = false;
                console.log(<any>error);
            }
        });

        document.querySelector('.modal-body')?.scrollTo(0, 0);
        this.submitted = false;
    }

    closeModal() {
        try {
            const modal = document.getElementById('send');
            if (modal) {
                const bootstrapModal = (window as any).bootstrap?.Modal?.getInstance(modal);
                if (bootstrapModal) {
                    bootstrapModal.hide();
                }
            }
        } catch (error) {
            console.log('Error al cerrar modal:', error);
        }
    }

    createAnotherExperience() {
        this.status = null;
        this.showSuccessActions = false;
        this.sendForm.reset();
        this.sendForm.patchValue({
            knowledge_area: [],
            level: []
        });
        this.submitted = false;
        this.loading = false;
        this.showFacilitatorField = false;
        
        // Limpiar autocompletado
        this.selectedKnowledgeAreas = [];
        this.selectedLevels = [];
        this.knowledgeAreaInput = '';
        this.levelInput = '';
        this.showKnowledgeAreaDropdown = false;
        this.showLevelDropdown = false;
    }

    closeAndRefresh() {
        this.restartValues();
        this.closeModal();
        this.added.emit();
    }

    onChanges(): void {
        this.sendForm.valueChanges.subscribe(val => {
            if (val) {
                this.status = null;
                this.submitted = false;
            }
        });
    }

    sendNotifications(lesson: any): void {
        console.log('Enviando notificaciones para la experiencia:', lesson);
        
        // Las notificaciones se manejan automáticamente en el backend
        // cuando se guarda una lección con class = 'experience'
        
        // Notificaciones que se envían automáticamente con URLs actualizadas:
        // 1. Al usuario: confirmación → /inicio/mis-lecciones
        // 2. A administradores: nueva experiencia → /admin/lecciones  
        // 3. Al facilitador sugerido: invitación → /inicio/asesorar-lecciones
        
        console.log('Sistema de notificaciones activado automáticamente para:', {
            experienceId: lesson._id,
            title: lesson.title,
            type: lesson.type,
            hasFacilitator: !!lesson.suggested_facilitator,
            notifications: {
                user: '/inicio/mis-lecciones',
                admin: '/admin/lecciones',
                facilitator: lesson.type === 'Desarrollo' && lesson.suggested_facilitator ? '/inicio/asesorar-lecciones' : null
            }
        });
    }

    // Método para obtener el nombre del área por ID
    getKnowledgeAreaName(areaId: string): string {
        const area = this.knowledgeAreas.find(ka => ka._id === areaId);
        return area ? area.name : 'Desconocida';
    }

    // Método para obtener el nombre del facilitador por ID
    getFacilitatorName(facilitatorId: string): string {
        const facilitator = this.facilitators.find(f => f._id === facilitatorId);
        return facilitator ? `${facilitator.name} ${facilitator.surname}` : 'Desconocido';
    }


    onKnowledgeAreaInputChange(): void {
        const query = this.knowledgeAreaInput.toLowerCase().trim();
        
        if (query.length === 0) {
            this.filteredKnowledgeAreas = [];
            this.showKnowledgeAreaDropdown = false;
            return;
        }

        // Filtrar áreas que no estén ya seleccionadas
        const selectedIds = this.selectedKnowledgeAreas.map(area => area._id);
        this.filteredKnowledgeAreas = this.knowledgeAreas.filter(area => 
            !selectedIds.includes(area._id) && 
            area.name.toLowerCase().includes(query)
        );

        this.showKnowledgeAreaDropdown = this.filteredKnowledgeAreas.length > 0 || query.length > 0;
    }

    selectKnowledgeArea(area: KnowledgeArea): void {
        if (!this.selectedKnowledgeAreas.find(selected => selected._id === area._id)) {
            this.selectedKnowledgeAreas.push(area);
            this.updateKnowledgeAreaFormControl();
        }
        this.knowledgeAreaInput = '';
        this.showKnowledgeAreaDropdown = false;
        this.filteredKnowledgeAreas = [];
    }

    removeKnowledgeArea(area: KnowledgeArea): void {
        this.selectedKnowledgeAreas = this.selectedKnowledgeAreas.filter(selected => selected._id !== area._id);
        this.updateKnowledgeAreaFormControl();
    }

    addNewKnowledgeAreaFromInput(): void {
        const areaName = this.knowledgeAreaInput.trim();
        if (!areaName) return;

        // Verificar si ya existe
        const existingArea = this.knowledgeAreas.find(area => 
            area.name.toLowerCase() === areaName.toLowerCase()
        );
        
        if (existingArea) {
            this.selectKnowledgeArea(existingArea);
            return;
        }

        // Crear nueva área
        const newArea: KnowledgeArea = { _id: '', name: areaName, used: false };
        this._bDService.addKnowledgeArea(newArea).subscribe({
            next: (response) => {
                if (response.area && response.area._id) {
                    this.knowledgeAreas.push(response.area);
                    this.selectKnowledgeArea(response.area);
                }
            },
            error: (error) => {
                console.error("Error adding new knowledge area", error);
            }
        });
    }

    private updateKnowledgeAreaFormControl(): void {
        const selectedIds = this.selectedKnowledgeAreas.map(area => area._id);
        this.sendForm.get('knowledge_area')?.setValue(selectedIds);
    }

    // ===== MÉTODOS PARA AUTOCOMPLETADO DE NIVELES =====

    onLevelInputChange(): void {
        const query = this.levelInput.toLowerCase().trim();
        
        if (query.length === 0) {
            this.filteredLevels = [];
            this.showLevelDropdown = false;
            return;
        }

        // Filtrar niveles que no estén ya seleccionados
        const selectedValues = this.selectedLevels.map(level => level.value);
        this.filteredLevels = this.academicLevels.filter(level => 
            !selectedValues.includes(level.value) && 
            level.value.toLowerCase().includes(query)
        );

        this.showLevelDropdown = this.filteredLevels.length > 0;
    }

    selectLevel(level: any): void {
        if (!this.selectedLevels.find(selected => selected.value === level.value)) {
            this.selectedLevels.push(level);
            this.updateLevelFormControl();
        }
        this.levelInput = '';
        this.showLevelDropdown = false;
        this.filteredLevels = [];
    }

    removeLevel(level: any): void {
        this.selectedLevels = this.selectedLevels.filter(selected => selected.value !== level.value);
        this.updateLevelFormControl();
    }

    private updateLevelFormControl(): void {
        const selectedValues = this.selectedLevels.map(level => level.value);
        this.sendForm.get('level')?.setValue(selectedValues);
    }

    // ===== MÉTODOS AUXILIARES =====

    setupClickOutsideListener(): void {
        document.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            
            // Cerrar dropdown de áreas si se hace clic fuera
            if (!target.closest('.knowledge-area-autocomplete')) {
                this.showKnowledgeAreaDropdown = false;
            }
            
            // Cerrar dropdown de niveles si se hace clic fuera
            if (!target.closest('.level-autocomplete')) {
                this.showLevelDropdown = false;
            }
        });
    }
}
