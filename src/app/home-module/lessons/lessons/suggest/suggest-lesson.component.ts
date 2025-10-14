import { Component, OnInit, Output, EventEmitter, AfterViewInit } from '@angular/core';
import { Validators, UntypedFormControl, UntypedFormGroup } from '@angular/forms';

import { UserService } from 'src/app/services/user.service';
import { LessonService } from 'src/app/services/lesson.service';
import { BasicDataService } from 'src/app/services/basicData.service';
import { NotificationService } from 'src/app/services/notification.service';
import { GLOBAL } from 'src/app/services/GLOBAL';
import { Lesson } from 'src/app/models/lesson.model';
import { User } from 'src/app/models/user.model';

import { ACADEMIC_LEVEL } from 'src/app/services/DATA';
import { KnowledgeArea } from 'src/app/models/knowledge-area.model';

@Component({
    selector: 'suggest-lesson',
    templateUrl: './suggest-lesson.component.html',
    standalone: false
})
export class SuggestLessonComponent implements OnInit, AfterViewInit {
    public title: string;
    public identity: any;
    public token: string;
    public url: string;

    public fields: any[];
    public addForm: UntypedFormGroup;

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
    public newKnowledgeAreaName = '';
    public showAddKnowledgeArea = false;
    
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

    @Output() added = new EventEmitter();

    constructor(
        private _userService: UserService,
        private _lessonService: LessonService,
        private _bDService: BasicDataService,
        private _notificationService: NotificationService
    ) {
        this.title = 'Sugerir lección';
        this.identity = this._userService.getIdentity();
        this.token = this._userService.getToken();
        this.url = GLOBAL.url;

        this.fields = [
            { id: "title", label: "Título", type: "text", required: true },
            { id: "resume", label: "Resumen", type: "textarea", required: true },
            { id: "justification", label: "Justificación", type: "textarea", required: true },
            { id: "references", label: "Referencias", type: "textarea", required: false }
        ];

        this.errorMsg = 'Hubo un error al enviar la sugerencia para una lección. Inténtalo de nuevo más tarde.';
        this.successMsg = 'Se ha enviado la sugerencia para la nueva lección correctamente. Gracias por tu sugerencia. Si deseas, puedes enviar otra sugerencia o cerrar este formulario.';

        this.addForm = new UntypedFormGroup({
            title: new UntypedFormControl('', Validators.required),
            resume: new UntypedFormControl('', Validators.required),
            justification: new UntypedFormControl('', Validators.required),
            references: new UntypedFormControl(''),
            knowledge_area: new UntypedFormControl([], Validators.required),
            level: new UntypedFormControl([], Validators.required),
            suggested_facilitator: new UntypedFormControl('')
        });
    }

    ngOnInit(): void {
        this.loadKnowledgeAreas();
        this.loadFacilitators();
    }

    ngAfterViewInit(): void {
        this.setupModalEvents();
    }

    setupModalEvents() {
        const modal = document.getElementById('add');
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

    loadKnowledgeAreas(): void {
        this._bDService.getKnowledgeAreas().subscribe({
            next: (response) => {
                if (response && Array.isArray(response.areas)) {
                    this.knowledgeAreas = response.areas;
                    console.log('Áreas de conocimiento cargadas:', this.knowledgeAreas);
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
    

    get f() { return this.addForm.controls; }

    restartValues() {
        this.status = null;
        this.submitted = false;
        this.showSuccessActions = false;
        this.addForm.reset();
        this.addForm.patchValue({
            knowledge_area: [],
            level: []
        });
        this.newKnowledgeAreaName = '';
        this.showAddKnowledgeArea = false;
        
        // Limpiar autocompletado
        this.selectedKnowledgeAreas = [];
        this.selectedLevels = [];
        this.knowledgeAreaInput = '';
        this.levelInput = '';
        this.showKnowledgeAreaDropdown = false;
        this.showLevelDropdown = false;
    }

    closeModal() {
        try {
            const modal = document.getElementById('add');
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

    createAnotherSuggestion() {
        this.status = null;
        this.showSuccessActions = false;
        this.addForm.reset();
        this.addForm.patchValue({
            knowledge_area: [],
            level: []
        });
        this.submitted = false;
        this.loading = false;
        
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

    onSubmit() {
        this.submitted = true;
        this.loading = true;

        if (this.addForm.invalid) {
            this.loading = false;
            return;
        }

        this.lesson = new Lesson();
        this.lesson.title = this.addForm.value.title;
        this.lesson.resume = this.addForm.value.resume;
        this.lesson.justification = this.addForm.value.justification;
        this.lesson.references = this.addForm.value.references;
        this.lesson.accepted = false;  // This is a suggestion, so it's not accepted by default
        this.lesson.author = this.identity._id;
        // Convertir áreas de conocimiento seleccionadas
        this.lesson.knowledge_area = Array.isArray(this.addForm.value.knowledge_area) 
            ? this.addForm.value.knowledge_area 
            : [this.addForm.value.knowledge_area];
        
        // Convertir niveles académicos de valores a claves
        const selectedLevels = Array.isArray(this.addForm.value.level) 
            ? this.addForm.value.level 
            : [this.addForm.value.level];
        
        this.lesson.level = Object.entries(ACADEMIC_LEVEL)
            .filter(([key, value]) => selectedLevels.includes(value))
            .map(([key, value]) => key);
        
        // Facilitador sugerido (opcional)
        this.lesson.suggested_facilitator = this.addForm.value.suggested_facilitator;
        this.lesson.state = 'proposed';

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

    onChanges(): void {
        this.addForm.valueChanges.subscribe({
            next: val => {
                if (val) {
                    this.status = null;
                    this.submitted = false;
                }
            }
        });
    }

    toggleAddKnowledgeArea() {
        this.showAddKnowledgeArea = !this.showAddKnowledgeArea;
        this.newKnowledgeAreaName = '';
    }

    addNewKnowledgeArea(): void {
        if (!this.newKnowledgeAreaName.trim()) {
            return;
        }

        const normalizedArea = this.newKnowledgeAreaName.trim().toLowerCase();
        const existingArea = this.knowledgeAreas.find(ka => ka.name.toLowerCase() === normalizedArea);

        if (existingArea) {
            // Si ya existe, la agregamos a la selección
            const currentSelection = this.addForm.get('knowledge_area').value || [];
            if (!currentSelection.includes(existingArea._id)) {
                this.addForm.get('knowledge_area').setValue([...currentSelection, existingArea._id]);
            }
            this.showAddKnowledgeArea = false;
            this.newKnowledgeAreaName = '';
        } else {
            // Crear nueva área
            const newArea: KnowledgeArea = { _id: '', name: this.newKnowledgeAreaName.trim(), used: false };
            this._bDService.addKnowledgeArea(newArea).subscribe({
                next: (response) => {
                    if (response.area && response.area._id) {
                        this.knowledgeAreas.push(response.area);
                        const currentSelection = this.addForm.get('knowledge_area').value || [];
                        this.addForm.get('knowledge_area').setValue([...currentSelection, response.area._id]);
                        this.showAddKnowledgeArea = false;
                        this.newKnowledgeAreaName = '';
                    }
                },
                error: (error) => {
                    console.error("Error adding new knowledge area", error);
                }
            });
        }
    }

    sendNotifications(lesson: any): void {
        // Aquí implementaremos las notificaciones cuando tengamos el backend listo
        console.log('Enviando notificaciones para la lección:', lesson);
        
        // TODO: Implementar notificaciones cuando el backend esté listo
        // - Notificación a administradores sobre nueva sugerencia
        // - Notificación al facilitador sugerido (si aplica)
        // - Notificación al usuario confirmando envío
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

    // ===== MÉTODOS PARA AUTOCOMPLETADO DE ÁREAS =====

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
        console.log("Nombre del área:", areaName);
        if (!areaName) return;

        // Verificar si ya existe
        console.log("verify if area exists:", areaName);

        const existingArea = this.knowledgeAreas.find(area => 
            area.name.toLowerCase() === areaName.toLowerCase()
        );
        console.log("existingArea:", existingArea);
        if (existingArea) {
            
            this.selectKnowledgeArea(existingArea);
            return;
        }

        // Crear nueva área
        console.log("crear nueva área:", areaName);
        const newArea: KnowledgeArea = { _id: '', name: areaName, used: false };
        console.log("newArea:", newArea);
        this._bDService.addKnowledgeArea(newArea).subscribe({
            next: (response) => {
                console.log("response:", response);
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
        this.addForm.get('knowledge_area')?.setValue(selectedIds);
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
        this.addForm.get('level')?.setValue(selectedValues);
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
