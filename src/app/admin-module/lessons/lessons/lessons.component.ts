import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { LessonService } from 'src/app/services/lesson.service';
import { UserService } from 'src/app/services/user.service';
import { Subject, takeUntil } from 'rxjs';

import { Router, ActivatedRoute } from '@angular/router';

import { FormControl, UntypedFormControl } from '@angular/forms';
import { GLOBAL } from 'src/app/services/global';
import { BasicDataService } from 'src/app/services/basicData.service';
import { ACADEMIC_LEVEL, LESSON_STATES } from 'src/app/services/DATA';

@Component({
    selector: 'lessons',
    templateUrl: './lessons.component.html'

})
export class LessonsComponent implements OnInit {
    title = 'Lecciones';
    url = GLOBAL.url;
    identity: any; // Adjust type as needed
    token: string; // Adjust type as needed
    lessons = [];
    loading = true;

    filter = new FormControl('');
    orderControl = new FormControl('');
    unsubscribe$ = new Subject<void>();
    allLessons = [];
    level = { basic: "Básico", medium: "Medio", advanced: "Avanzado" };
    type = { consideration: "Consideración", development: "Desarrollo" };
    academic_level = ACADEMIC_LEVEL;
    lesson_states = LESSON_STATES;


    public visible = new UntypedFormControl();

    
    // Pagination
    page: number;// Actual page
    pages: number;// Number of pages
    total: number;// Total of records
    prevPage: number;
    nextPage: number;
   
    // Filters
    selectedStates = [];
    selectedAreas = [];
    selectedLevels = [];
    states = [
        { label: "Propuesta", value: "proposed", class: "secondary" },
        { label: "Asignada", value: "assigned", class: "warning" },
        { label: "Desarrollo", value: "development", class: "info" },
        { label: "Prueba", value: "test", class: "primary" },
        { label: "Terminada", value: "completed", class: "success" }
    ];
    areas: any[];
    levels = [
        { label: "Preescolar", value: "garden" },
        { label: "Primaria", value: "school" },
        { label: "Secundaria", value: "highschool" },
        { label: "Universitario", value: "university" }
    ];

    constructor(
        private userService: UserService,
        private lessonService: LessonService,
        private basicDataService: BasicDataService,
        private router: Router,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef  // ChangeDetectorRef added here

    ) {
        this.token = this.userService.getToken();
        this.identity = this.userService.getIdentity();

    }

    ngOnInit(): void {
        this.loadInitialData();
     
    }
    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }
    loadInitialData(): void {
        this.route.params.pipe(takeUntil(this.unsubscribe$)).subscribe(params => {
            this.page = +params['page'] || 1;
            this.fetchLessons(this.page);
        });
    
        this.basicDataService.getAllKnowledgeAreas().pipe(takeUntil(this.unsubscribe$)).subscribe({
            next: (response) => {
                try {
                    this.areas = response.areas || JSON.parse(localStorage.getItem('areas') || '[]');
                    localStorage.setItem('areas', JSON.stringify(this.areas));
                } catch (error) {
                    console.error('Error parsing areas from localStorage:', error);
                    this.areas = response.areas || [];
                }
            },
            error: (error) => console.error('Error fetching areas:', error)
        });
    
        this.fetchAllLessons();
    }
    
    public needReloadData;

    setNeedReload(eventData: any): void {
        // Handle the event data appropriately
        console.log(eventData);
        this.actualPage(); // Refresh data
        this.fetchAllLessons();
        this.cdr.detectChanges(); // Force update the view
    }
    


    setState(selectedState: string): void {
        const index = this.selectedStates.indexOf(selectedState);
        if (index > -1) {
            this.selectedStates.splice(index, 1);
        } else {
            this.selectedStates.push(selectedState);
        }
        this.fetchAllLessons(); // Refetch and reapply filters whenever states change
    }

    
    setArea(selectedArea: string): void {
        const index = this.selectedAreas.indexOf(selectedArea);
        if (index > -1) {
            this.selectedAreas.splice(index, 1);
        } else {
            this.selectedAreas.push(selectedArea);
        }
        this.fetchAllLessons(); // Refetch and reapply filters whenever areas change
    }
    

    setLevel(selectedLevel: string): void {
        const index = this.selectedLevels.indexOf(selectedLevel);
        if (index > -1) {
            this.selectedLevels.splice(index, 1);
        } else {
            this.selectedLevels.push(selectedLevel);
        }
        this.fetchAllLessons(); // Refetch and reapply filters whenever levels change
    }
    setOrder(orderCriteria: string): void {
        this.orderControl.setValue(orderCriteria);
        this.fetchAllLessons(); // Refetch all lessons when order changes
    }

    navigateToPage(page: number): void {
        this.router.navigate(['/admin/lecciones', page]);
        this.fetchLessons(page);
    }

    fetchAllLessons(): void {
        let orderBy = this.orderControl.value || 'created_at';
        this.lessonService.getAllLessons(this.token, orderBy).pipe(takeUntil(this.unsubscribe$)).subscribe({
            next: response => this.applyFilters(response.lessons),
            error: error => console.error('Error fetching all lessons:', error)
        });
    }
    applyFilters(lessons: any[]): void {
        let filteredLessons = lessons;
        if (this.selectedStates.length) {
            filteredLessons = filteredLessons.filter(lesson => this.selectedStates.includes(lesson.state));
        }
        if (this.selectedAreas.length) {
            filteredLessons = filteredLessons.filter(lesson => 
                lesson.knowledge_area.some(area => this.selectedAreas.includes(area.name)));
        }
        if (this.selectedLevels.length) {
            filteredLessons = filteredLessons.filter(lesson => this.selectedLevels.includes(lesson.level));
        }
        this.allLessons = filteredLessons;
    }


    fetchLessons(page: number): void {
        this.lessonService.getLessons(this.token, page).pipe(takeUntil(this.unsubscribe$)).subscribe({
            next: response => {
                this.lessons = response.lessons;
                this.total = response.total;
                this.pages = response.pages;
                this.loading = false;
            },
            error: error => {
                console.error('Error fetching lessons:', error);
                this.loading = false;
            }
        });
    }
    actualPage() {
        this.route.params.pipe(takeUntil(this.unsubscribe$)).subscribe(params => {
            let page = +params['page'];
    
            this.page = page;
    
            if (!page) {
                this.page = 1;
                this.nextPage = this.page + 1;
            } else {
                this.nextPage = page + 1;
                this.prevPage = this.page - 1;
    
                if (this.prevPage <= 0) {
                    this.prevPage = 1;
                }
            }
    
            this.fetchLessons(this.page);
        });
    }

    reloadLessons() {
        this.fetchAllLessons();
    }

    // Additional utility functions
    editLesson(lesson: any, visibilityChange: boolean = false): void {
        if (visibilityChange) {
            lesson.visible = !lesson.visible;
        }
        this.lessonService.editLesson(this.token, lesson).pipe(takeUntil(this.unsubscribe$)).subscribe({
            next: response => {
                this.fetchLessons(this.page); // Refresh the current page to reflect changes
            },
            error: error => console.error('Error updating lesson:', error)
        });
    }
    
    public deleteLessonId;
    setDeleteLesson(lessonId: string): void {
        this.deleteLessonId = lessonId;
    }

    public callLesson;
    setCallLesson(lesson){
        this.callLesson = lesson;
    }

    public addCallLesson;
    public nextVersion;
    setAddCallLesson(lesson, nextVersion = false){
        this.addCallLesson = lesson;
        this.nextVersion = nextVersion;
    }

    public showAreas = false; 
    setShowAreas(show: boolean): void {
        this.showAreas = show;
    }

    public showLevels = false; 
    setShowLevels(show: boolean): void {
        this.showLevels = show;
    }
}

