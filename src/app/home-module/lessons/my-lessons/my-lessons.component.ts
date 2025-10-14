import { Component, OnInit } from '@angular/core';
import { ACADEMIC_LEVEL, LESSON_STATES } from 'src/app/services/DATA';
import { FormControl } from '@angular/forms';
import { UserService } from 'src/app/services/user.service';
import { LessonService } from 'src/app/services/lesson.service';
import { BasicDataService } from 'src/app/services/basicData.service';
import { Router, ActivatedRoute } from '@angular/router';
import { GLOBAL } from 'src/app/services/GLOBAL';

@Component({
    selector: 'my-lessons',
    templateUrl: './my-lessons.component.html',
    standalone: false
})
export class MyLessonsComponent implements OnInit {
    public title: string;
    public identity;
    public token;
    public url;

    public allLessons = [];
    public lessons = [];

    public level = { basic: "Básico", medium: "Medio", advanced: "Avanzado" };
    public type = { consideration: "Consideración", development: "Desarrollo" };
    public academic_level = ACADEMIC_LEVEL;

    public lesson_states = LESSON_STATES;

    // Pagination
    public page; // Actual page
    public pages; // Number of pages
    public total; // Total of records
    public prevPage;
    public nextPage;

    // Filter
    public filter;
    public selectedStates = [];

    public states = [
        {
            label: "Propuesta",
            value: "proposed",
            class: "secondary"
        },
        {
            label: "Asignada",
            value: "assigned",
            class: "warning"
        },
        {
            label: "Desarrollo",
            value: "development",
            class: "info"
        },
        {
            label: "Prueba",
            value: "test",
            class: "primary"
        },
        {
            label: "Terminada",
            value: "completed",
            class: "success"
        }
    ];

    public areas;
    public levels = [
        {
            label: "Preescolar",
            value: "garden",
        },
        {
            label: "Primaria",
            value: "school"
        },
        {
            label: "Secundaria",
            value: "highschool"
        },
        {
            label: "Universitario",
            value: "university"
        }
    ];
    
    public loading = true;

    constructor(
        private _userService: UserService,
        private _lessonService: LessonService,
        private _bDService: BasicDataService,
        private _router: Router,
        private _route: ActivatedRoute
    ) {
        this.title = 'Mis lecciones';
        this.url = GLOBAL.url;
        this.token = this._userService.getToken();
        this.identity = this._userService.getIdentity();
        this.areas;
    }

    ngOnInit(): void {
        this.getAllMyLessons();
        this.getAllAreas();
        this.actualPage();
    }

    setState(selectedState) {
        if (this.selectedStates.indexOf(selectedState) >= 0) {
            this.selectedStates.splice(this.selectedStates.indexOf(selectedState), 1);

        } else {
            this.selectedStates.push(selectedState);

        }

        this.getAllMyLessons();
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

    getAllMyLessons() {
        let filteredLessons = [];
        console.log("getAllMyLessons called, loading:", this.loading);

        this._lessonService.getAllMyLessons(this.token).subscribe(
            response => {
                console.log("getAllMyLessons response:", response);
                if (response.lessons) {
                    this.allLessons = response.lessons;
                    console.log("All lessons received:", this.allLessons.length);

                    // Filter by state
                    if (this.selectedStates.length > 0) {
                        this.selectedStates.forEach((state) => {
                            filteredLessons = filteredLessons.concat(this.allLessons.filter((lesson) => {
                                return lesson.state == state;
                            }));
                        });

                        this.allLessons = filteredLessons;
                        filteredLessons = [];
                        console.log("Filtered lessons:", this.allLessons.length);
                    }

                    // IMPORTANTE: Actualizar lessons para que el template lo vea
                    this.lessons = this.allLessons;
                    this.loading = false;
                } else {
                    console.warn("No lessons in response");
                    this.lessons = [];
                    this.loading = false;
                }
            }, error => {
                console.error("Error getting my lessons:", error);
                this.lessons = [];
                this.loading = false;
            });
    }

    getMyLessons(page = 1) {

        this._lessonService.getMyLessons(this.token, page).subscribe({
            next: response => {
                if (response.lessons) {
                    this.lessons = response.lessons;
                    this.total = response.total;
                    this.pages = response.pages;

                    if (page > this.pages) {
                        this._router.navigate(['/inicio/mis-lecciones']);
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

            this.getMyLessons(this.page);
        });
    }

    reloadLessons() {
        this.getAllMyLessons();
    }

}

