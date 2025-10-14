import { Component, OnInit, Input, Output, EventEmitter, AfterViewInit, OnDestroy } from '@angular/core';

import { Validators, UntypedFormControl, UntypedFormGroup } from '@angular/forms';

import { UserService } from 'src/app/services/user.service';


import { GLOBAL } from 'src/app/services/GLOBAL';
import { UploadService } from 'src/app/services/upload.service';
import { LessonService } from 'src/app/services/lesson.service';
import { BasicDataService } from 'src/app/services/basicData.service';
import { ACADEMIC_LEVEL } from 'src/app/services/DATA';

import { Call } from 'src/app/models/call.model';
import { Lesson } from 'src/app/models/lesson.model';


@Component({
    selector: 'add-call',
    templateUrl: './add-call.component.html',
    standalone: false
})
export class AddCallComponent implements OnInit, AfterViewInit, OnDestroy {
    public title;
    public identity;
    public token;
    public url;

    public callForm;
    public call;

    public status;
    public submitted;
    public check;

    public errorMsg;
    public successMsg;

    public newLesson = new Lesson();

    @Input() areas;
    @Input() lesson;
    @Input() nextVersion;
    @Output() added = new EventEmitter();

    // Para múltiples niveles académicos
    public academicLevels = ACADEMIC_LEVEL;
    public levelInput = '';
    public filteredLevels = [];
    public selectedLevels = [];
    public showLevelDropdown = false;

    private realtimeTimer: any;

    constructor(
        private _userService: UserService,
        private _lessonService: LessonService,
        private _bDService: BasicDataService,
        private _uploadService: UploadService,
    ) {
        this.title = 'Crear convocatoria';
        this.identity = this._userService.getIdentity();
        
        this.token = this._userService.getToken();
        this.url = GLOBAL.url;

        this.errorMsg = 'Hubo un error creando la convocatoria. Intentalo de nuevo más tarde.';
        this.successMsg = 'Se ha creado la convocatoria correctamente.';

        this.callForm = new UntypedFormGroup({
            text: new UntypedFormControl('', Validators.required),
            areas: new UntypedFormControl('', Validators.required),
            level: new UntypedFormControl([], Validators.required),
        });


    }

    ngOnInit(): void {
        // Inicializar niveles desde la lección
        this.initializeLevels();
        
        this.callForm.patchValue({
            areas: this.lesson.knowledge_area,
            text: this.lesson.resume //el resumen de la propuesta se convierte en Detalle de la convocatoria
        });
        
        // Inicializar filtros para autocomplete
        this.filteredLevels = Object.entries(this.academicLevels).map(([key, value]) => ({key, value}));
    }
    
    ngAfterViewInit(): void {
        this.setupClickOutsideListener();
    }

    ngOnDestroy(): void {
        this.stopRealtimeSync();
    }

    ngDoCheck(): void {

        if (this.check && this.lesson._id) {

            this.callForm.patchValue({
                areas: this.lesson.knowledge_area,
                level: '',
                text: ''
            });

            this.check = false;
        }

    }

    get f() { return this.callForm.controls; }

    initializeLevels(): void {
        if (this.lesson && this.lesson.level) {
            if (Array.isArray(this.lesson.level)) {
                this.selectedLevels = this.lesson.level.map(levelKey => {
                    const levelEntry = Object.entries(this.academicLevels).find(([key, value]) => key === levelKey);
                    return levelEntry ? { key: levelEntry[0], value: levelEntry[1] } : null;
                }).filter(Boolean);
            } else {
                const levelEntry = Object.entries(this.academicLevels).find(([key, value]) => key === this.lesson.level);
                this.selectedLevels = levelEntry ? [{ key: levelEntry[0], value: levelEntry[1] }] : [];
            }
        } else {
            this.selectedLevels = [];
        }
        this.updateLevelFormControl();
    }

    onLevelInputChange(): void {
        const searchTerm = this.levelInput.toLowerCase();
        this.filteredLevels = Object.entries(this.academicLevels)
            .map(([key, value]) => ({key, value}))
            .filter(level => 
                level.value.toLowerCase().includes(searchTerm) &&
                !this.selectedLevels.some(selected => selected.key === level.key)
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
        this.filteredLevels = Object.entries(this.academicLevels)
            .map(([key, value]) => ({key, value}))
            .filter(l => !this.selectedLevels.some(selected => selected.key === l.key));
    }

    removeLevel(level: any): void {
        this.selectedLevels = this.selectedLevels.filter(selected => selected.key !== level.key);
        this.updateLevelFormControl();
        this.filteredLevels = Object.entries(this.academicLevels)
            .map(([key, value]) => ({key, value}))
            .filter(l => !this.selectedLevels.some(selected => selected.key === l.key));
    }

    updateLevelFormControl(): void {
        const levelKeys = this.selectedLevels.map(level => level.key);
        this.callForm.patchValue({ level: levelKeys });
    }

    setupClickOutsideListener(): void {
        document.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            const levelContainer = document.querySelector('.level-autocomplete-container');
            if (levelContainer && !levelContainer.contains(target)) {
                this.showLevelDropdown = false;
            }
        });
    }

    restartValues() {
        this.status = null;
        this.submitted = false;
        this.check = true;
        this.selectedLevels = [];
        this.levelInput = '';
        this.showLevelDropdown = false;
        this.added.emit();
    }

    onSubmit() {
        let tempArray = [];
        let tempInterested =[];
        this.submitted = true;

        // Reset status and error messages
        this.status = null;
        this.errorMsg = 'Hubo un error creando la convocatoria. Intentalo de nuevo más tarde.';

        if (this.callForm.invalid) {
            return;
        }

        // Validar que areas sea un array y tenga elementos
        if (!this.callForm.value.areas || !Array.isArray(this.callForm.value.areas) || this.callForm.value.areas.length === 0) {
            this.status = 'error';
            this.errorMsg = 'Debe seleccionar al menos un área de conocimiento.';
            return;
        }

        // Validar que el texto no esté vacío
        if (!this.callForm.value.text || this.callForm.value.text.trim() === '') {
            this.status = 'error';
            this.errorMsg = 'La descripción de la convocatoria es obligatoria.';
            return;
        }

        // Validar que se hayan seleccionado niveles académicos
        if (!this.callForm.value.level || !Array.isArray(this.callForm.value.level) || this.callForm.value.level.length === 0) {
            this.status = 'error';
            this.errorMsg = 'Debe seleccionar al menos un nivel académico.';
            return;
        }

        try {
            this.callForm.value.areas.forEach(element => {
                if (element && element._id) {
                    tempArray.push(element._id);
                }
            });

            if (tempArray.length === 0) {
                this.status = 'error';
                this.errorMsg = 'Error procesando las áreas de conocimiento seleccionadas.';
                return;
            }

            this.lesson.knowledge_area = tempArray;
            this.lesson.level = this.callForm.value.level;

            this.call = new Call(this.callForm.value.text.trim());
            this.call.visible = true;
            this.call.author = this.identity._id;  //Call author becomes Admin
        
            if (this.nextVersion) {
                this.newLesson.state = 'proposed';

                this.newLesson.title = this.lesson.title;
                this.newLesson.resume = this.lesson.resume;
                this.newLesson.references = this.lesson.references;
                this.newLesson.accepted = true;
                this.newLesson.author = this.lesson.author;
                this.newLesson.version = this.lesson.version + 1;

                this.newLesson.justification = this.lesson.justification;

                this.newLesson.knowledge_area = tempArray;
                this.newLesson.level = this.callForm.value.level;

                this.saveLesson(this.newLesson, this.call);

            } else {
                // Crear arrays separados para interesados y grupo de desarrollo
                let tempDevelopmentGroup = [];
                
                // Agregar al autor original como interesado y miembro del grupo
                tempInterested.push(this.lesson.author);
                tempDevelopmentGroup.push(this.lesson.author);
                
                // Si el admin es diferente al autor, agregarlo SOLO como interesado (no al grupo)
                const isAdminDifferentFromAuthor = this.identity._id !== this.lesson.author._id;
                if (isAdminDifferentFromAuthor) {
                    // Verificar que el admin no esté ya en la lista de interesados
                    const adminAlreadyInterested = tempInterested.some(user => user._id === this.identity._id);
                    if (!adminAlreadyInterested) {
                        tempInterested.push(this.identity);
                        console.log('Admin agregado automáticamente como interesado (NO al grupo de desarrollo):', this.identity.name);
                    }
                }
                
                // Asignar arrays por separado
                this.call.interested = tempInterested;
                this.lesson.development_group = tempDevelopmentGroup; // Solo el autor, NO el admin
                
                // Establecer al autor como líder automáticamente
                this.lesson.leader = this.lesson.author._id;
                console.log('Autor establecido como líder:', this.lesson.author.name, this.lesson.author._id);
                console.log('Grupo de desarrollo:', tempDevelopmentGroup.map(u => u.name));
                console.log('Interesados:', tempInterested.map(u => u.name));

                this.lesson.call = this.call;
                this.editLesson(this.lesson);
            }

        } catch (error) {
            this.status = 'error';
            this.errorMsg = 'Error procesando los datos del formulario. Por favor, inténtalo de nuevo.';
            console.error('Error en onSubmit:', error);
        }
    }
    editLesson(lesson) {
        this._lessonService.editLesson(this.token, lesson).subscribe({
            next: response => {
                if (response.lesson && response.lesson._id) {
                    this.status = 'success';
                    this.added.emit();
                    // Iniciar sincronización en vivo del estado de la lección tras el guardado
                    this.startRealtimeSync(response.lesson._id);
                } else {
                    this.status = 'error';
                    this.errorMsg = 'Error al actualizar la lección. Respuesta inválida del servidor.';
                }
            },
            error: error => {
                this.status = 'error';
                console.error('Error editando lección:', error);
                
                // Manejo específico de errores
                if (error.status === 500) {
                    this.errorMsg = 'Error interno del servidor. Por favor, verifica que todos los campos estén correctamente completados.';
                } else if (error.status === 400) {
                    this.errorMsg = error.error?.message || 'Datos inválidos. Por favor, revisa los campos del formulario.';
                } else if (error.status === 404) {
                    this.errorMsg = 'La lección no fue encontrada.';
                } else {
                    this.errorMsg = error.error?.message || 'Hubo un error creando la convocatoria. Inténtalo de nuevo más tarde.';
                }
            }
        });
    
        this.submitted = false;
    }
    
    saveLesson(lesson, call) {
        this._lessonService.addLesson(this.token, lesson).subscribe({
            next: response => {
                if (response.lesson && response.lesson._id) {
                    this.status = 'success';
    
                    this.lesson.son_lesson = response.lesson._id;
                    this.editLesson(this.lesson);
                    
                    this.newLesson = response.lesson;
                    delete call._id;
                    delete call.interested;
                    this.newLesson.call = call;
                    this.newLesson.father_lesson = this.lesson._id;
                    this.editLesson(this.newLesson);
                    this.added.emit();
                    // Iniciar sincronización en vivo del estado de la nueva lección
                    this.startRealtimeSync(response.lesson._id);
                } else {
                    this.status = 'error';
                    this.errorMsg = 'Error al crear la nueva lección. Respuesta inválida del servidor.';
                }
            },
            error: error => {
                this.status = 'error';
                console.error('Error guardando lección:', error);
                
                // Manejo específico de errores
                if (error.status === 500) {
                    this.errorMsg = 'Error interno del servidor. Por favor, verifica que todos los campos estén correctamente completados.';
                } else if (error.status === 400) {
                    this.errorMsg = error.error?.message || 'Datos inválidos. Por favor, revisa los campos del formulario.';
                } else {
                    this.errorMsg = error.error?.message || 'Hubo un error creando la convocatoria. Inténtalo de nuevo más tarde.';
                }
            }
        });
    
        this.submitted = false;
    }
    
    private refreshLesson(lessonId: string): void {
        if (!lessonId) { return; }
        this._lessonService.getLesson(this.token, lessonId).subscribe({
            next: (res) => {
                if (res && res.lesson) {
                    // Actualizar referencia local si corresponde
                    if (this.lesson && this.lesson._id === lessonId) {
                        this.lesson = res.lesson;
                    }
                    if (this.newLesson && this.newLesson._id === lessonId) {
                        this.newLesson = res.lesson;
                    }
                }
            },
            error: (err) => {
                console.warn('No se pudo actualizar la lección en tiempo real:', err);
            }
        });
    }

    private startRealtimeSync(lessonId: string): void {
        this.stopRealtimeSync();
        if (!lessonId) { return; }
        this.realtimeTimer = setInterval(() => this.refreshLesson(lessonId), 7000);
    }

    private stopRealtimeSync(): void {
        if (this.realtimeTimer) {
            clearInterval(this.realtimeTimer);
            this.realtimeTimer = null;
        }
    }

   }
