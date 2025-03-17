import { Component, OnInit, Output, EventEmitter, ViewChild, ChangeDetectorRef } from '@angular/core';
import { Validators, UntypedFormGroup, FormBuilder } from '@angular/forms';
import { UserService } from 'src/app/services/user.service';
import { LessonService } from 'src/app/services/lesson.service';
import { BasicDataService } from 'src/app/services/basicData.service';
import { GLOBAL } from 'src/app/services/global';
import { Lesson } from 'src/app/models/lesson.model';
import { ACADEMIC_LEVEL } from 'src/app/services/DATA';
import { KnowledgeArea } from 'src/app/models/knowledge-area.model';
import { NgSelectComponent } from '@ng-select/ng-select';

@Component({
    selector: 'suggest-lesson',
    templateUrl: './suggest-lesson.component.html',
    styleUrls: ['./suggest-lesson.component.css'],
    standalone: false
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
  @ViewChild(NgSelectComponent) ngSelectComponent: NgSelectComponent;

  constructor(
    private _userService: UserService,
    private _lessonService: LessonService,
    private _bDService: BasicDataService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder

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

    this.addForm = this.fb.group({
      title: ['', Validators.required],
      resume: ['', Validators.required],
      justification: ['', Validators.required],
      references: [''],
      knowledge_area: [[], Validators.required],
      level: [[], Validators.required] // Initialize as an empty array
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
          console.log("Áreas de conocimiento cargadas:", this.knowledgeAreas[0]);
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
    const selectedValues = this.addForm.value.level;
    this.lesson.level = Object.entries(ACADEMIC_LEVEL)
        .filter(([key, value]) => selectedValues.includes(value))
        .map(([key, value]) => key);
    console.log("Niveles seleccionados:", this.lesson.level);
    this.lesson.state = 'proposed';
    this._lessonService.addLesson(this.token, this.lesson).subscribe({
      next: (response) => {
        if (response.lesson && response.lesson._id) {
          this.addForm.reset();
          // Reset specific form controls
          this.addForm.get('knowledge_area').setValue([]);
          this.addForm.get('level').setValue([]);

          // Clear ng-select
          if (this.ngSelectComponent) {
            this.ngSelectComponent.clearModel();
          }

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
    // Ignore undefined events
    if (!event) {
        console.warn('Evento recibido es undefined, se ignora.');
        return;
    }

    // Use existing knowledgeAreas for comparison
    const currentKnowledgeAreaIds = this.addForm.get('knowledge_area').value || [];

    if (event.name) {
        // Handle new knowledge area
        const areaName = event.name.trim();
        if (!areaName) {
            console.error('No se proporcionó un nombre de área');
            return;
        }

        const normalizedArea = this.normalizeString(areaName);

        // Check if the area already exists
        const existingArea = this.knowledgeAreas.find(ka => this.normalizeString(ka.name) === normalizedArea);
        if (existingArea) {
            // If the area exists, add its _id to the form if not already present
            this.handleExistingArea(existingArea._id, currentKnowledgeAreaIds);
        } else {
            // If the area is new, add it to the server
            this.handleNewArea(areaName, currentKnowledgeAreaIds);
        }
    } else if (event._id) {
        // Handle existing knowledge area
        this.handleExistingArea(event._id, currentKnowledgeAreaIds);
    } else {
        console.error('Evento no reconocido:', event);
    }
}

private handleExistingArea(areaId: string, currentKnowledgeAreaIds: string[]): void {
    if (!currentKnowledgeAreaIds.includes(areaId)) {
        const updatedKnowledgeAreaIds = [...currentKnowledgeAreaIds, areaId];
        this.addForm.get('knowledge_area').patchValue(updatedKnowledgeAreaIds);
        this.updateNgSelectFromFormControl(updatedKnowledgeAreaIds);
    } else {
        console.log('Área ya presente en el formulario:', areaId);
    }
}

private handleNewArea(areaName: string, currentKnowledgeAreaIds: string[]): void {
    const newArea: KnowledgeArea = { _id: '', name: areaName, used: false };

    this._bDService.addKnowledgeArea(newArea).subscribe({
        next: (response) => {

          const updatedArray = currentKnowledgeAreaIds.slice(0, -1);
          ; 

            if (response.area) {
                this.knowledgeAreas.push(response.area); // Add the new area to the local array
                // Update form control
                const updatedKnowledgeAreaIds = [...updatedArray, response.area._id];
                this.addForm.get('knowledge_area').patchValue(updatedKnowledgeAreaIds);

                // Update ng-select
                this.updateNgSelectFromFormControl(updatedKnowledgeAreaIds);
            } else if (response.replace){
              // Replace the new area with the existing one
              const index = updatedArray.indexOf(response.replace._id); // Remove the new area from the local array
              updatedArray.splice(index, 1);
              // Update form control
              const updatedKnowledgeAreaIds = [...updatedArray, response.replace._id];
              this.addForm.get('knowledge_area').patchValue(updatedKnowledgeAreaIds);
              this.updateNgSelectFromFormControl(updatedKnowledgeAreaIds);
            }
        },
        error: (error) => {
          console.error("Error al agregar la nueva área de conocimiento:", error);
        }
    });
}

private updateNgSelectFromFormControl(updatedKnowledgeAreaIds:string[]): void {
    this.cdr.detectChanges();
    this.ngSelectComponent.clearModel();
    const validValues = Array.isArray(updatedKnowledgeAreaIds) ? updatedKnowledgeAreaIds.filter(v => v) : [];

    const selectedAreas = validValues
        .map(id => this.knowledgeAreas.find(ka => ka._id === id))
        .filter(area => area);
    this.addForm.get('knowledge_area').patchValue(selectedAreas);
    this.cdr.detectChanges();
}
  compareKnowledgeAreas(area1: KnowledgeArea, area2: KnowledgeArea): boolean {
    return area1 && area2 ? area1._id === area2._id : area1 === area2;
  }
}