import { Component, Input, OnInit, Output, EventEmitter, AfterViewInit, ViewChild, TemplateRef } from '@angular/core';
import { GLOBAL } from 'src/app/services/GLOBAL';
import { LESSON_STATES, ACADEMIC_LEVEL } from 'src/app/services/DATA';
import { UntypedFormGroup, UntypedFormControl, Validators } from '@angular/forms';
import { UserService } from 'src/app/services/user.service';
import { LessonService } from 'src/app/services/lesson.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';


@Component({
    selector: 'edit',
    templateUrl: './edit.component.html',
    standalone: false
})
export class EditComponent implements OnInit, AfterViewInit {
    public title: string;
    public token;
    public url;

    @Input() lesson;
    @Input() areas;
    @Output() edited = new EventEmitter();

    public lessonForm;

    public status;
    public submitted;

    public errorMsg;
    public successMsg;

    public academic_level = ACADEMIC_LEVEL;
    public academicLevels = Object.entries(ACADEMIC_LEVEL).map(([key, value]) => ({ key, value }));
    public lesson_states = LESSON_STATES;
    public callForm;

    // Para autocompletado de niveles
    public levelInput = '';
    public filteredLevels: any[] = [];
    public selectedLevels: any[] = [];
    public showLevelDropdown = false;

    @ViewChild('confirmCompletedTpl') confirmCompletedTpl: TemplateRef<any>;
    public confirmedCompleted: boolean = false;

    constructor(
        private _userService: UserService,
        private _lessonService: LessonService,
        private modalService: NgbModal,
    ) {
        this.title = "Editar lección";
        this.url = GLOBAL.url;
        this.token = this._userService.getToken();

        this.errorMsg = 'Hubo un error editando la lección. Intentalo de nuevo más tarde.';
        this.successMsg = 'Se editado la lección correctamente.';

        this.lessonForm = new UntypedFormGroup({
            title: new UntypedFormControl('', Validators.required),
            resume: new UntypedFormControl('', Validators.required),
            justification: new UntypedFormControl('', Validators.required),
            references: new UntypedFormControl('', Validators.required),
            state: new UntypedFormControl('', Validators.required),
            areas: new UntypedFormControl(''),
            level: new UntypedFormControl([], Validators.required)
        });
    }

    get f() { return this.lessonForm.controls; }

    ngOnInit(): void {
        this.initializeLevels();
        
        this.lessonForm.patchValue({
            title: this.lesson.title,
            resume: this.lesson.resume,
            justification: this.lesson.justification,
            references: this.lesson.references,
            state: this.lesson.state,
            areas: this.lesson.knowledge_area,
            level: this.selectedLevels.map(level => level.value)
        });
    }

    ngAfterViewInit(): void {
        this.setupClickOutsideListener();
    }

    initializeLevels(): void {
        
        // Convertir los niveles de la lección (keys) a objetos con key y value
        if (this.lesson.level && Array.isArray(this.lesson.level)) {
            this.selectedLevels = this.lesson.level.map(levelKey => {
                // Buscar tanto en mayúsculas como en minúsculas para compatibilidad
                let levelEntry = Object.entries(ACADEMIC_LEVEL).find(([key, value]) => key === levelKey);
                
                // Si no se encuentra, intentar con mayúsculas
                if (!levelEntry) {
                    levelEntry = Object.entries(ACADEMIC_LEVEL).find(([key, value]) => key === levelKey.toUpperCase());
                }
                
                // Si no se encuentra, intentar mapeo manual para compatibilidad
                if (!levelEntry) {
                    const levelMap = {
                        'garden': 'GARDEN',
                        'school': 'SCHOOL', 
                        'highschool': 'MIDDLESCHOOL', // Mapeo corregido
                        'middleschool': 'MIDDLESCHOOL',
                        'baccalaureate': 'HIGHSCHOOL', // Mapeo corregido
                        'university': 'UNIVERSITY',
                        'graduate': 'GRADUATE'
                    };
                    const mappedKey = levelMap[levelKey.toLowerCase()];
                    if (mappedKey) {
                        levelEntry = Object.entries(ACADEMIC_LEVEL).find(([key, value]) => key === mappedKey);
                    }
                }
                
                return levelEntry ? { key: levelEntry[0], value: levelEntry[1] } : null;
            }).filter(Boolean);
        } else if (this.lesson.level) {
            // Si es un string único, convertir a array
            let levelEntry = Object.entries(ACADEMIC_LEVEL).find(([key, value]) => key === this.lesson.level);
            
            // Si no se encuentra, intentar con mayúsculas
            if (!levelEntry) {
                levelEntry = Object.entries(ACADEMIC_LEVEL).find(([key, value]) => key === this.lesson.level.toUpperCase());
            }
            
            this.selectedLevels = levelEntry ? [{ key: levelEntry[0], value: levelEntry[1] }] : [];
        } else {
            // Si no hay nivel, usar un nivel por defecto
            console.warn("No hay nivel definido, usando nivel por defecto");
            this.selectedLevels = [{ key: 'UNIVERSITY', value: 'Universitario' }];
        }
        
        this.updateLevelFormControl();
    }

    onSubmit() {
        let tempArray = [];
        this.submitted = true;

        if (this.lessonForm.invalid) {
            console.error("Formulario inválido:", this.lessonForm.errors);
            return;
        }

        if (this.lesson.status != 'completed') {
            this.lesson.visible = false;
        }

        
        if (this.lessonForm.value.areas && Array.isArray(this.lessonForm.value.areas)) {
            this.lessonForm.value.areas.forEach(element => {
                if (element && element._id) {
                    tempArray.push(element._id);
                    console.log("Área agregada:", element._id, element.name);
                } else if (typeof element === 'string') {
                    // Si es un string (ID directo), agregarlo
                    tempArray.push(element);
                    console.log("Área ID agregada:", element);
                }
            });
        } else if (this.lessonForm.value.areas) {
            // Si no es array pero existe, intentar procesarlo
            const area = this.lessonForm.value.areas;
            if (area._id) {
                tempArray.push(area._id);
                console.log("Área única agregada:", area._id, area.name);
            } else if (typeof area === 'string') {
                tempArray.push(area);
                console.log("Área ID única agregada:", area);
            }
        } else {
            console.warn("Areas no es un array válido:", this.lessonForm.value.areas);
        }
        

        // Asegurar que knowledge_area siempre sea un array
        this.lesson.knowledge_area = Array.isArray(tempArray) ? tempArray : [];
        
        // Convertir niveles seleccionados de valores a claves
        if (this.selectedLevels && this.selectedLevels.length > 0) {
            this.lesson.level = this.selectedLevels.map(level => level.key);
        } else {
            console.warn("No hay niveles seleccionados, usando nivel por defecto");
            this.lesson.level = ['university']; // Nivel por defecto
        }

        // Asegurar que level siempre sea un array
        if (!Array.isArray(this.lesson.level)) {
            this.lesson.level = [this.lesson.level];
        }

  
        
        // Validar campos requeridos
        if (!this.lessonForm.value.title || !this.lessonForm.value.resume) {
            this.status = 'error';
            this.errorMsg = 'Los campos título y resumen son obligatorios.';
            return;
        }
        
        this.lesson.title = this.lessonForm.value.title;
        this.lesson.resume = this.lessonForm.value.resume;
        this.lesson.references = this.lessonForm.value.references;
        this.lesson.justification = this.lessonForm.value.justification;
        
        // Logging específico para el estado
        const previousState = this.lesson.state;
        console.log("Estado anterior:", previousState);
        console.log("Estado del formulario:", this.lessonForm.value.state);
        this.lesson.state = this.lessonForm.value.state;
        console.log("Estado asignado:", this.lesson.state);
        // Logging para debug
        console.log("Enviando actualización de lección (edit):", {
            id: this.lesson._id,
            title: this.lesson.title,
            level: this.lesson.level,
            selectedLevels: this.selectedLevels,
            knowledge_area: this.lesson.knowledge_area,
            state: this.lesson.state
        });

        // Confirmar si se cambia a terminada
        if (previousState !== 'completed' && this.lesson.state === 'completed' && !this.confirmedCompleted) {
            this.modalService.open(this.confirmCompletedTpl, { size: 'md', backdrop: 'static', keyboard: false });
            return;
        }

        this.saveLesson();

        document.scrollingElement.scrollTop = 0;
    }

    confirmCompletedAndSave(): void {
        this.confirmedCompleted = true;
        this.modalService.dismissAll();
        this.saveLesson();
    }

    cancelCompleted(): void {
        this.confirmedCompleted = false;
        this.modalService.dismissAll();
    }

    private saveLesson(): void {
        // Agregar timeout y loading state
        this.submitted = true;
        const startTime = Date.now();
        this._lessonService.editLesson(this.token, this.lesson).subscribe({
            next: response => {
                const responseTime = Date.now() - startTime;
                console.log(`Respuesta del servidor recibida en ${responseTime}ms:`, response);

                if (response && (response.lesson || response._id)) {
                    const lessonData = response.lesson || response;

                    if (lessonData && (lessonData._id || lessonData.id)) {
                        this.status = 'success';
                        this.submitted = false;
                        this.edited.emit();
                        console.log("Lección editada exitosamente:", lessonData._id || lessonData.id);

                        if (response.lesson) {
                            Object.assign(this.lesson, response.lesson);
                        }

                        // Recargar la página después de 1.5 segundos para salir del modo edición
                        setTimeout(() => {
                            console.log("Recargando página para reflejar cambios y salir del modo edición...");
                            window.location.reload();
                        }, 1500);
                    } else {
                        this.status = 'error';
                        this.errorMsg = 'Error al actualizar la lección. Respuesta inválida del servidor.';
                        console.error("Respuesta inválida del servidor:", response);
                    }
                } else {
                    this.status = 'error';
                    this.errorMsg = 'Error al actualizar la lección. Respuesta vacía del servidor.';
                    console.error("Respuesta vacía del servidor:", response);
                }
            },
            error: error => {
                this.status = 'error';
                console.error('Error updating lesson:', error);
                console.error('Error status:', error.status);
                console.error('Error body:', error.error);

                if (error.status === 500) {
                    console.warn('Error 500 detectado. Los datos podrían haberse guardado correctamente.');
                    this.errorMsg = 'Hubo un problema con la respuesta del servidor, pero los cambios podrían haberse guardado. Por favor, refresca la página para verificar.';
                } else if (error.status === 400) {
                    this.errorMsg = error.error?.message || 'Datos inválidos. Por favor, revisa los campos del formulario.';
                } else if (error.status === 404) {
                    this.errorMsg = 'La lección no fue encontrada.';
                } else if (error.status === 0) {
                    this.errorMsg = 'Error de conexión. Por favor, verifica tu conexión a internet.';
                } else {
                    this.errorMsg = error.error?.message || 'Hubo un error editando la lección. Inténtalo de nuevo más tarde.';
                }

                console.error("Error message:", this.errorMsg);
            }
        });

        // Reset de confirmación para siguientes envíos
        this.confirmedCompleted = false;
    }

    onChanges() {
        this.lessonForm.valueChanges.subscribe({
            next: val => {
                if (val) {
                    this.status = null;
                    this.submitted = false;
                }
            }
        });
    }

    // Métodos para autocompletado de niveles académicos
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
        if (!this.selectedLevels.some(selected => selected.key === level.key)) {
            this.selectedLevels.push(level);
            this.updateLevelFormControl();
        }
        
        this.levelInput = '';
        this.showLevelDropdown = false;
    }

    removeLevel(levelToRemove: any): void {
        this.selectedLevels = this.selectedLevels.filter(level => level.key !== levelToRemove.key);
        this.updateLevelFormControl();
    }

    updateLevelFormControl(): void {
        const levelValues = this.selectedLevels.map(level => level.value);
        this.lessonForm.patchValue({ level: levelValues });
    }

    setupClickOutsideListener(): void {
        document.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            
            // Cerrar dropdown de niveles si se hace clic fuera
            if (!target.closest('.level-autocomplete')) {
                this.showLevelDropdown = false;
            }
        });
    }
}
