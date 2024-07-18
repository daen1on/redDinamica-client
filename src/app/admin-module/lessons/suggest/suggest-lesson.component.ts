import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { Validators, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { UserService } from 'src/app/services/user.service';
import { LessonService } from 'src/app/services/lesson.service';
import { BasicDataService } from 'src/app/services/basicData.service';
import { GLOBAL } from 'src/app/services/global';
import { Lesson } from 'src/app/models/lesson.model';
import { ACADEMIC_LEVEL } from 'src/app/services/DATA';
import { KnowledgeArea } from 'src/app/models/knowledge-area.model';
import { firstValueFrom } from 'rxjs';
import levenshtein from 'fast-levenshtein';

@Component({
    selector: 'suggest-lesson',
    templateUrl: './suggest-lesson.component.html',
    styleUrls: ['./suggest-lesson.component.css']
})
export class SuggestLessonComponent implements OnInit {
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
    public academicLevels = Object.values(ACADEMIC_LEVEL);

    @Output() added = new EventEmitter();

    constructor(
        private _userService: UserService,
        private _lessonService: LessonService,
        private _bDService: BasicDataService
    ) {
        this.title = 'Agregar lección';
        this.identity = this._userService.getIdentity();
        this.token = this._userService.getToken();
        this.url = GLOBAL.url;

        this.fields = [
            { id: "title", label: "Título", type: "text", required: true },
            { id: "resume", label: "Resumen", type: "textarea", required: true },
            { id: "justification", label: "Justificación", type: "textarea", required: true },
            { id: "references", label: "Referencias", type: "textarea", required: false }
        ];

        this.errorMsg = 'Hubo un error al agregar el tema para una lección. Inténtalo de nuevo más tarde.';
        this.successMsg = 'Se ha agregado el tema para la nueva lección correctamente.';

        this.addForm = new UntypedFormGroup({
            title: new UntypedFormControl('', Validators.required),
            resume: new UntypedFormControl('', Validators.required),
            justification: new UntypedFormControl('', Validators.required),
            references: new UntypedFormControl(''),
            knowledge_area: new UntypedFormControl([], Validators.required),
            level: new UntypedFormControl('', Validators.required)
        });
    }

    ngOnInit(): void {
        this.loadKnowledgeAreas();
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
                this.knowledgeAreas = []; // Para asegurarnos de que siempre sea un array
            }
        });
    }
    
    
    
    get f() { return this.addForm.controls; }

    restartValues() {
        this.status = null;
        this.submitted = false;
    }

    async onSubmit() {
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
        this.lesson.accepted = true; 
        this.lesson.author = this.identity._id;
        this.lesson.knowledge_area = this.addForm.value.knowledge_area;
        this.lesson.level = this.addForm.value.level;
        this.lesson.state = 'proposed';
        this._lessonService.addLesson(this.token, this.lesson).subscribe({
            next: (response) => {
              if (response.lesson && response.lesson._id) {
                this.addForm.reset();
                this.status = 'success';
                this.added.emit();
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

        document.querySelector('.modal-body').scrollTop = 0;
        this.submitted = false;
    }

    onChanges(): void {
        this.addForm.valueChanges.subscribe(val => {
            if (val) {
                this.status = null;
                this.submitted = false;
            }
        });
    }

    normalizeString(str: string): string {
        return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    addNewKnowledgeArea(event: any): void {
        console.log('Evento recibido:', event);
        const areaName = typeof event === 'string' ? event : event.name;
        if (!areaName) {
            console.error('No se proporcionó un nombre de área');
            return;
        }
    
        const normalizedArea = this.normalizeString(areaName.trim());
        console.log('Nombre de área normalizado:', normalizedArea);
    
        const existingArea = this.knowledgeAreas.find(ka => {
            const normalizedExistingArea = this.normalizeString(ka.name);
            const distance = levenshtein.get(normalizedArea, normalizedExistingArea);
            console.log(`Comparando con área existente: ${ka.name} (normalizado: ${normalizedExistingArea}), distancia de Levenshtein: ${distance}`);
            return normalizedExistingArea === normalizedArea || distance <= 2;
        });
    
        if (existingArea) {
            console.log('Área existente encontrada:', existingArea);
            const currentValues = this.addForm.get('knowledge_area').value || [];
            if (!currentValues.includes(existingArea._id)) {
                this.addForm.get('knowledge_area').setValue([...currentValues, existingArea._id]);
                console.log('Área añadida al formulario:', existingArea._id);
            } else {
                console.log('El área ya está en el formulario:', existingArea._id);
            }
        } else {
            console.log('Área nueva, añadiendo al servidor:', areaName);
            const newArea: KnowledgeArea = { _id: '', name: areaName, used: false }; // _id will be set by the server
            this._bDService.addKnowledgeArea(newArea).subscribe({
                next: (response) => {
                    if (response.area && response.area._id) {
                        this.knowledgeAreas.push(response.area);
                        const currentValues = this.addForm.get('knowledge_area').value || [];
                        this.addForm.get('knowledge_area').setValue([...currentValues, response.area._id]);
                        console.log('Nueva área añadida al servidor y al formulario:', response.area);
                    } else {
                        console.error('Respuesta inesperada del servidor:', response);
                    }
                },
                error: (error) => {
                    console.error("Error al agregar la nueva área de conocimiento:", error);
                }
            });
        }
    }
    
    
    
}
