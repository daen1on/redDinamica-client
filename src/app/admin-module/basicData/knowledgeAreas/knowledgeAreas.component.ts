import { Component, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormControl, Validators } from '@angular/forms';
import { BasicDataService } from 'src/app/services/basicData.service';
import { KnowledgeArea } from 'src/app/models/knowledge-area.model';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'knowledge-areas',
    templateUrl: './knowledgeAreas.component.html',
    standalone: false
})
export class KnowledgeAreasComponent implements OnInit {
    public title: string;
    public knowledgeAreas: KnowledgeArea[] = [];
    public loading: boolean = true;
    public status: string | null = null;
    public submitted: boolean = false;

    public addForm: UntypedFormGroup;
    public editForm: UntypedFormGroup;
    public tempArea: KnowledgeArea;

    constructor(private _bDService: BasicDataService) {
        this.title = 'Áreas de Conocimiento';

        this.addForm = new UntypedFormGroup({
            areaName: new UntypedFormControl('', Validators.required)
        });

        this.editForm = new UntypedFormGroup({
            areaName: new UntypedFormControl('', Validators.required)
        });
    }

    ngOnInit(): void {
        this.getAllAreas();
    }

    async getAllAreas() {
        try {
            const response = await firstValueFrom(this._bDService.getAllKnowledgeAreas());
            this.knowledgeAreas = response.areas;
            this.loading = false;
        } catch (error) {
            console.error(error);
            this.loading = false;
        }
    }

    get f() { return this.addForm.controls; }
    get f2() { return this.editForm.controls; }

    setAdd() {
        this.status = null;
        this.submitted = false;
    }

    async onSubmit() {
        this.status = null;
        this.submitted = true;

        if (this.addForm.invalid) {
            return;
        }

        const newArea: KnowledgeArea = { _id: '', name: this.addForm.value.areaName, used: false };

        try {
            const response = await firstValueFrom(this._bDService.addKnowledgeArea(newArea));
            if (response.area && response.area._id) {
                this.addForm.reset();
                this.status = 'success';
                this.submitted = false;
                this.getAllAreas();
            } else {
                this.status = 'error';
            }
        } catch (error) {
            this.status = 'error';
            console.error(error);
        }
    }

    setEditArea(area: KnowledgeArea) {
        this.status = null;
        this.tempArea = area;
        this.editForm.patchValue({
            areaName: area.name
        });
    }

    async onEditSubmit() {
        this.status = null;
        this.submitted = true;

        if (this.editForm.invalid) {
            return;
        }

        this.tempArea.name = this.editForm.value.areaName;

        try {
            const response = await firstValueFrom(this._bDService.editKnowledgeArea(this.tempArea._id, this.tempArea));
            if (response.area && response.area._id) {
                this.status = 'success';
                this.submitted = false;
                this.getAllAreas();
            } else {
                this.status = 'error';
            }
        } catch (error) {
            this.status = 'error';
            console.error(error);
        }
    }

    async setDeleteArea(areaId: string) {
        try {
            const response = await firstValueFrom(this._bDService.deleteKnowledgeArea(areaId));
            this.getAllAreas();
        } catch (error) {
            console.error(error);
        }
    }

    onChanges(): void {
        this.addForm.valueChanges.subscribe(() => {
            this.status = null;
            this.submitted = false;
        });

        this.editForm.valueChanges.subscribe(() => {
            this.status = null;
            this.submitted = false;
        });
    }

    onKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const saveButton = document.getElementById("save");
            if (saveButton) {
                saveButton.click();
            }
        }
    }
}
