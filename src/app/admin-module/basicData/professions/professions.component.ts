import { Component, OnInit } from '@angular/core';
import { Profession } from 'src/app/models/profession.model';
import { UntypedFormGroup, UntypedFormControl, Validators } from '@angular/forms';
import { BasicDataService } from 'src/app/services/basicData.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
    selector: 'professions',
    templateUrl: './professions.component.html'
})
export class ProfessionsComponent implements OnInit {
    public title: string;   
    public fieldsForm = [
        {
            id: "professionName",
            label: "Profesión",        
            attr: "name",
            required: true   
        }                
    ];
    
    public submitted = false;
    public status;
    public professionForm;
    public editProfessionForm;
    public profession = new Profession('');    
    public professions = [];

    // Pagination
    public page; // Actual page
    public pages; // Number of pages
    public total; // Total of records
    public prevPage;
    public nextPage;

    // Filter
    public filter;
    public allProfessions = [];

    public loading = true;

    constructor(
        private _bDService:BasicDataService,
        private _route: ActivatedRoute,
        private _router:Router,
    ) {
        this.title = 'Profesiones';
        this.professionForm = new UntypedFormGroup({
            professionName: new UntypedFormControl('', [Validators.required])            
        });
        this.editProfessionForm = new UntypedFormGroup({
            professionName: new UntypedFormControl('', [Validators.required])            
        });
        
        this.filter =  new UntypedFormControl();
           
    }

    ngOnInit(): void {        
        this.actualPage();
        this.getAllProfessions();        
    }

    get f() { return this.professionForm.controls; }

    get f2() { return this.editProfessionForm.controls; }

    setAdd(){
        this.status = null;
        this.submitted = false;
    }
    
    onSubmit() {
        this.submitted = true;
        
        if (this.professionForm.invalid) {
            return;
        }
        
        this.profession.name = this.professionForm.value.professionName;

        this._bDService.addProfession(this.profession).subscribe(
            response => {

                if (response.profession && response.profession._id) {
                    this.professionForm.reset();
                    this.status = 'success';
                    this.submitted = false;
                    this.getProfessions(this.page);
                    this.getAllProfessions();
                } else {
                    this.status = 'error';
                }
            },
            error => {
                if (error != null) {
                    this.status = 'error';
                    console.log(<any>error);
                }
            }
        );
    }

    getAllProfessions(){  
        this._bDService.getAllProfessions().subscribe(
            response=>{
                if(response.professions){
                    this.allProfessions = response.professions;
                    localStorage.setItem('professions', JSON.stringify(this.allProfessions));
                }
            },error=>{
                console.log(<any>error);
            });        
    }

    getProfessions(page){  
        this._bDService.getProfessions(page).subscribe(
            response=>{                  
                if(response.professions){
                    this.professions = response.professions; 
                    this.total = response.total; 
                    this.pages = response.pages;
                    if(page > this.pages){
                        this._router.navigate(['/admin/profesiones']);
                    }

                    this.loading = false;
                }
            },error=>{
                console.log(<any>error);
            });
    }

    public tempProfession;
    setEditProfession(profession){
        this.status = null;
        this.submitted = false;
        this.tempProfession = profession;
        this.editProfessionForm.patchValue({professionName:this.tempProfession.name}); 
    }

    onEditSubmit() {
        this.status = null;
        this.submitted = true;
        
        if (this.editProfessionForm.invalid) {
            return;
        }
        
        this.profession.name = this.editProfessionForm.value.professionName;

        this._bDService.editProfession(this.tempProfession._id,this.profession).subscribe(
            response => {                
                if (response.profession && response.profession._id) {
                    this.status = 'success';
                    this.submitted = false;
                    this.getProfessions(this.page);
                    this.getAllProfessions();
                } else {
                    this.status = 'error';
                }
            },
            error => {
                if (error != null) {
                    this.status = 'error';
                    console.log(<any>error);
                }
            }
        );
    }

    public tempProfessionId;
    setDeleteProfession(professionId){
        this.tempProfessionId = professionId;
    }    

    delete(){
        this._bDService.deleteProfession(this.tempProfessionId).subscribe(
            response => {
                
                this.tempProfessionId = null;
                this.getProfessions(this.page);
                this.getAllProfessions();
            },
            error => {
                console.log(<any>error);
            }
        )
    }

    actualPage(){
        this._route.params.subscribe(params => {
           let page = +params['page'];

           this.page = page;

           if(!page){
               this.page = 1;
               this.nextPage = this.page + 1;
           }else{
               this.nextPage = page + 1;
               this.prevPage = page - 1;

               if(this.prevPage <= 0){
                   this.prevPage = 1;
               }
           }
 
           this.getProfessions(this.page);
        });
    }

    onKeydown(e){
        if (e.keyCode === 13) {
            // Cancel the default action, if needed
            e.preventDefault();
            // Trigger the button element with a click
            document.getElementById("save").click();
          }
    }

    onChanges(): void {

        this.professionForm.valueChanges.subscribe(val => {
            if (val) {
                this.status = null;
                this.submitted = false;
            }
        });

        this.editProfessionForm.valueChanges.subscribe(val => {
            if (val) {
                this.status = null;
                this.submitted = false;
            }
        });
    }
}
