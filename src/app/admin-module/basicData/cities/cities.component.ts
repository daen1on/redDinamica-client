import { Component } from '@angular/core';
import { UntypedFormGroup, UntypedFormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { BasicDataService } from '../../../services/basicData.service';

import { FIELDS_FORM } from './services/citiesData';
import { City } from '../../../models/city.model';


import { firstValueFrom } from 'rxjs';

import { takeUntil, tap, catchError } from 'rxjs/operators';
import { Subject, throwError } from 'rxjs';

@Component({
    selector: 'cities',
    templateUrl: './cities.component.html',
    standalone: false
})
export class CitiesComponent {
    public title: string;
    public fieldsForm = FIELDS_FORM;

    public submitted = false;
    public status;
    public cityForm;
    public editCityForm;
    public city = new City();
    public cities = [];

    // Pagination
    public page; // Actual page
    public pages; // Number of pages
    public total; // Total of records
    public prevPage;
    public nextPage;

    public tempCity;
    public tempCityId;
 
    // Filter
    public filter;
    public allCities = [];

    public loading = true;
    private unsubscribe$ = new Subject <void>();
    
    constructor(
        private _bDService: BasicDataService,
        private _route: ActivatedRoute,
        private _router:Router,  
    ) {
        this.title = 'Ciudades';

        this.cityForm = new UntypedFormGroup({
            cityName: new UntypedFormControl('', [Validators.required]),
            cityState: new UntypedFormControl('', [Validators.required]),
            cityCountry: new UntypedFormControl('', [Validators.required])
        });

        this.editCityForm = new UntypedFormGroup({
            cityName: new UntypedFormControl('', [Validators.required]),
            cityState: new UntypedFormControl('', [Validators.required]),
            cityCountry: new UntypedFormControl('', [Validators.required])
        });

        this.filter =  new UntypedFormControl();        
    }

    ngOnInit(): void {        
        this.actualPage();
        this.getAllCities();        
    }
    ngOnDestroy() {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }


    // Get controls form
    get f() { return this.cityForm.controls; }

    get f2() { return this.editCityForm.controls; } 

    setAdd(){
        this.status = null;
        this.submitted = false;
    }
    
    onSubmit() {
        this.status = null;
        this.submitted = true;

        if (this.cityForm.invalid) {
            return;
        }

        this.city.name = this.cityForm.value.cityName;
        this.city.state = this.cityForm.value.cityState;
        this.city.country = this.cityForm.value.cityCountry;

        this._bDService.addCity(this.city).pipe(
            tap(response => {
                if (response.city && response.city._id) {
                    this.cityForm.reset();                    
                    this.status = 'success';
                    this.submitted = false;                    
                    this.getCities(this.page);
                    this.getAllCities();                
                } else {
                    this.status = 'error';
                }
            }),
            catchError(error => {
                if (error != null) {
                    this.status = 'error';
                    console.log(<any>error);
                }
                return throwError(() => error);
            })
        ).subscribe();
    }

    async getAllCities() {
        try {
          const response = await firstValueFrom(this._bDService.getAllCities());
          if (response.cities) {
            this.allCities = response.cities;
            localStorage.setItem('cities', JSON.stringify(this.allCities));
          }
        } catch (error) {
          console.error(error);
        }
      }
      async getCities(page) {
        try {
          const response = await firstValueFrom(this._bDService.getCities(page));
          if (response.cities) {
            this.cities = response.cities;
            this.total = response.total;
            this.pages = response.pages;
            if (page > this.pages) {
              this._router.navigate(['/admin/ciudades']);
            }
            this.loading = false;
          }
        } catch (error) {
          console.error(error);
        }
      }
    
    
    setEditCity(city){
        this.status = null;
        this.tempCity = city;
        
        this.editCityForm.patchValue({
            cityName: this.tempCity.name,
            cityState: this.tempCity.state,
            cityCountry: this.tempCity.country
        });         
    }
    async onEditSubmit() {
        this.status = null;
        this.submitted = true;
      
        if (this.editCityForm.invalid) {
          return;
        }
      
        this.city.name = this.editCityForm.value.cityName;
        this.city.state = this.editCityForm.value.cityState;
        this.city.country = this.editCityForm.value.cityCountry;
      
        try {
          const response = await firstValueFrom(this._bDService.editCity(this.tempCity._id, this.city));
          if (response.city && response.city._id) {
            this.status = 'success';
            this.submitted = false;
            await this.getCities(this.page);
            await this.getAllCities();
          } else {
            this.status = 'error';
          }
        } catch (error) {
          if (error != null) {
            this.status = 'error';
            console.error(error);
          }
        }
      }

    setDeleteCity(cityId){
        this.tempCityId = cityId;
    }    

    async delete() {
        try {
          const response = await firstValueFrom(this._bDService.deleteCity(this.tempCityId));
          this.tempCityId = null;
          await this.getCities(this.page);
          await this.getAllCities();
        } catch (error) {
          console.error(error);
        }
      }

      async actualPage() {
        this._route.params.subscribe(async params => {
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
      
          await this.getCities(this.page);
        });
      }

      onKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter') {
            e.preventDefault(); // Cancel the default action, if needed
            
            const saveButton = document.getElementById("save");
            if (saveButton !== null) { // Check if the element exists
                saveButton.click(); // Trigger the button element with a click
            }
        }
    }
    

    onChanges(): void {

        this.cityForm.valueChanges.subscribe(val => {
            if (val) {
                this.status = null;
                this.submitted = false;
            }
        });

        this.editCityForm.valueChanges.subscribe(val => {
            if (val) {
                this.status = null;
                this.submitted = false;
            }
        });
    }
}
