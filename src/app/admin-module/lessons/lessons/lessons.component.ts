import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { LessonService } from 'src/app/services/lesson.service';
import { UserService } from 'src/app/services/user.service';
import { Subject, takeUntil } from 'rxjs';

import { Router, ActivatedRoute } from '@angular/router';

import { FormControl, UntypedFormControl } from '@angular/forms';
import { GLOBAL } from 'src/app/services/GLOBAL';
import { BasicDataService } from 'src/app/services/basicData.service';
import { ACADEMIC_LEVEL, LESSON_STATES } from 'src/app/services/DATA';

@Component({
    selector: 'lessons',
    templateUrl: './lessons.component.html',
    styleUrls: ['./lessons.component.css'],
    standalone: false
})
export class LessonsComponent implements OnInit, OnDestroy {

    title = 'Lecciones';
    url = GLOBAL.url;
    identity: any; // Adjust type as needed
    token: string; // Adjust type as needed
    lessons = [];
    loading = true;

    filter = new FormControl('');
    orderControl = new FormControl('');
    unsubscribe$ = new Subject<void>();
    allLessons: any =[];
    filteredLessons: any =[]; // Initialize as empty array

    //level = { basic: "Básico", medium: "Medio", advanced: "Avanzado" };
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
        { label: "Aprobada por Facilitador", value: "approved_by_expert", class: "info" },
        { label: "Asignada", value: "assigned", class: "warning" },
        { label: "Desarrollo", value: "development", class: "info" },
        { label: "Prueba", value: "test", class: "primary" },
        { label: "Terminada", value: "completed", class: "success" }
    ];
    areas: any[];
    /*levels = [
        { label: "Preescolar", value: "garden" },
        { label: "Primaria", value: "school" },
        { label: "Secundaria", value: "highschool" },
        { label: "Universitario", value: "university" }
    ];*/

    // Nuevas propiedades para enfoque desde notificaciones
    public focusedLessonId: string | null = null;
    public actionType: string | null = null;
    public showFocusedLesson = false;

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
        // Verificar si viene desde una notificación con parámetros específicos
        this.route.queryParams.subscribe(params => {
            this.focusedLessonId = params['lesson'] || null;
            this.actionType = params['action'] || null;

            if (this.focusedLessonId && (this.actionType === 'review' || this.actionType === 'manage' || this.actionType === 'openAddCall' || this.actionType === 'openCall')) {
                console.log('Enfocando lección desde parámetros (Admin):', this.focusedLessonId, this.actionType);
                this.showFocusedLesson = true;
                this.title = this.actionType === 'review' ? 'Revisar Nueva Lección' : 'Gestionar Lección';
            }
        });

        this.loadInitialData();
        this.filter.valueChanges.pipe(takeUntil(this.unsubscribe$)).subscribe(() => {
            this.applyFilters(this.allLessons); // Use allLessons for filtering
        });
        
        // Inicializar filteredLessons como copia de allLessons al inicio
        this.filteredLessons = [...this.allLessons];
    }
    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }
    loadInitialData(): void {
        // Si hay una lección enfocada, cargar solo esa lección
        if (this.showFocusedLesson && this.focusedLessonId) {
            this.getFocusedLesson();
        } else {
            // Fetch areas y lecciones normalmente
            this.route.params.pipe(takeUntil(this.unsubscribe$)).subscribe(params => {
                this.page = +params['page'] || 1;
                this.fetchLessons(this.page);
            });
        }
    
        this.basicDataService.getAllKnowledgeAreas().pipe(takeUntil(this.unsubscribe$)).subscribe({
            next: (response) => {
                try {
                    const stored = localStorage.getItem('areas');
                    if (stored) {
                        this.areas = JSON.parse(stored);
                    } else {
                        const svcAreas = response.areas || [];
                        // Asegurar que no incorporemos la propiedad 'used' en admin
                        this.areas = svcAreas.map(a => ({ _id: a._id, name: a.name }));
                        localStorage.setItem('areas', JSON.stringify(this.areas));
                    }
                } catch (error) {
                    console.error('Error parsing areas from localStorage:', error);
                    this.areas = response.areas ? response.areas.map(a => ({ _id: a._id, name: a.name })) : [];
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
    getAcademicLevels(levels: string[]): string {
        return levels.join(', '); // Join the levels with commas
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
        console.log("Selected level: ", selectedLevel);
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
    }

    fetchAllLessons(): void {
        let orderBy = this.orderControl.value || 'created_at';
        this.loading = true;
        
        // En tests se espera boolean true como tercer parámetro
        this.lessonService.getAllLessons(this.token, orderBy, true).pipe(takeUntil(this.unsubscribe$)).subscribe({
          next: response => {
            if (response && response.lessons) {
                this.allLessons = response.lessons;
                this.total = response.total || 0;
                this.pages = response.pages || 0;
                console.log("All Lessons fetched successfully: ", this.allLessons.length);
                
                
                // Aplicar filtros después de obtener todas las lecciones
                this.applyFilters(this.allLessons);
            } else {
                console.warn('No lessons data received');
                this.allLessons = [];
                this.filteredLessons = [];
                this.total = 0;
                this.pages = 0;
            }
            this.loading = false;
          },
          error: error => {
            console.error('Error fetching all lessons:', error);
            this.loading = false;
            // Manejar el error de manera más amigable
            this.allLessons = [];
            this.filteredLessons = [];
            this.total = 0;
            this.pages = 0;
          }
        });
      }
    
      applyFilters(lessons: any): void {
        let filteredLessons = [...lessons]; // Create a copy to avoid modifying the original
        
        // Verificar si hay algún filtro aplicado
        const hasFilters = !!(this.filter.value || 
                            this.selectedStates.length > 0 || 
                            this.selectedAreas.length > 0 || 
                            this.selectedLevels.length > 0);
    
        if (this.filter.value) {
          const filterValue = this.filter.value.toLowerCase();
          console.log("Filter value: ", filterValue);
          
          filteredLessons = filteredLessons.filter(lesson =>
            lesson.title && lesson.title.toLowerCase().includes(filterValue) // Filter by title
          );
        }
    
        if (this.selectedStates.length > 0) {
          filteredLessons = filteredLessons.filter(lesson => 
            lesson.state && this.selectedStates.includes(lesson.state)
          );
        }
    
        if (this.selectedAreas.length > 0) {
          filteredLessons = filteredLessons.filter(lesson =>
            lesson.knowledge_area && lesson.knowledge_area.some(area => 
              area && area.name && this.selectedAreas.includes(area.name)
            )
          );
        }
    
        if (this.selectedLevels.length > 0) {
          filteredLessons = filteredLessons.filter(
            lesson => {
                console.log(lesson.level),       
               lesson.level && this.selectedLevels.includes(lesson.level)
            }
          );
        }
    
        this.filteredLessons = filteredLessons; // Update filteredLessons only
        
        console.log("Filters applied:", hasFilters);
        console.log("Filtered Lessons: ", this.filteredLessons.length);
        console.log("Total lessons available: ", this.allLessons.length);
      }
      
      // Método para verificar si hay filtros aplicados
      hasActiveFilters(): boolean {
        return !!(this.filter.value || 
                 this.selectedStates.length > 0 || 
                 this.selectedAreas.length > 0 || 
                 this.selectedLevels.length > 0);
      }

      fetchLessons(page: number): void {
        // En tests se espera boolean true como tercer parámetro
        this.lessonService.getLessons(this.token, page, true).pipe(takeUntil(this.unsubscribe$)).subscribe({
            next: response => {
                this.lessons = response.lessons;
                this.total = response.total;
                this.pages = response.pages;
                this.page = response.currentPage;
                this.loading = false;
                console.log('Lessons fetched successfully:', response);
            },
            error: error => {
                console.error('Error fetching lessons:', error);
                this.loading = false;
                // Manejar el error de manera más amigable
                this.allLessons = [];
                this.total = 0;
                this.pages = 0;
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
        
        console.log("Enviando actualización de lección:", {
            id: lesson._id,
            visible: lesson.visible,
            visibilityChange
        });

        this.lessonService.editLesson(this.token, lesson).pipe(takeUntil(this.unsubscribe$)).subscribe({
            next: response => {
                console.log('Lesson updated:', response);
                this.fetchAllLessons();
            },
            error: error => {
                console.error('Error updating lesson:', error);
                
                // Revertir cambio de visibilidad si falló
                if (visibilityChange) {
                    lesson.visible = !lesson.visible;
                }
                
                // Manejo específico de errores
                let errorMessage = 'Error al actualizar la lección';
                if (error.status === 500) {
                    errorMessage = 'Error interno del servidor. Por favor, inténtalo de nuevo.';
                } else if (error.status === 400) {
                    errorMessage = error.error?.message || 'Datos inválidos en la lección.';
                } else if (error.status === 404) {
                    errorMessage = 'La lección no fue encontrada.';
                } else {
                    errorMessage = error.error?.message || 'Error al actualizar la lección.';
                }
                
                // Mostrar error al usuario (puedes implementar un servicio de notificaciones)
                console.error(errorMessage);
                alert(errorMessage); // Temporal, reemplazar con un sistema de notificaciones mejor
            }
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
        if (this.showAreas) {
            this.showAreas = false;
        }
        else {
            this.showAreas = show;
        }
        
    }

    public showLevels = false; 
    setShowLevels(show: boolean): void {
        if (this.showLevels) {
            this.showLevels = false;
        }
        else {
            this.showLevels = show;
        }
    }

    // Métodos para abrir modales con manejo correcto del DOM
    openAddModal() {
        // Esperar a que Angular actualice el DOM
        setTimeout(() => {
            try {
                const modal = document.getElementById('add');
                if (modal) {
                    // Limpiar cualquier instancia previa
                    const existingInstance = (window as any).bootstrap?.Modal?.getInstance(modal);
                    if (existingInstance) {
                        existingInstance.dispose();
                    }
                    
                    // Crear nueva instancia
                    const bootstrapModal = new (window as any).bootstrap.Modal(modal, {
                        backdrop: 'static',
                        keyboard: false
                    });
                    bootstrapModal.show();
                }
            } catch (error) {
                console.log('Error al abrir modal de agregar lección:', error);
            }
        }, 0);
    }

    openAddCallModal(lesson, nextVersion = false) {
        this.setAddCallLesson(lesson, nextVersion);
        
        // Esperar a que Angular actualice el DOM
        setTimeout(() => {
            try {
                const modal = document.getElementById('addCall');
                if (modal) {
                    // Limpiar cualquier instancia previa
                    const existingInstance = (window as any).bootstrap?.Modal?.getInstance(modal);
                    if (existingInstance) {
                        existingInstance.dispose();
                    }
                    
                    // Crear nueva instancia
                    const bootstrapModal = new (window as any).bootstrap.Modal(modal, {
                        backdrop: 'static',
                        keyboard: false
                    });
                    bootstrapModal.show();
                }
            } catch (error) {
                console.log('Error al abrir modal de agregar convocatoria:', error);
            }
        }, 0);
    }

    openCallModal(lesson) {
        this.setCallLesson(lesson);
        
        // Esperar a que Angular actualice el DOM
        setTimeout(() => {
            try {
                const modal = document.getElementById('call');
                if (modal) {
                    // Limpiar cualquier instancia previa
                    const existingInstance = (window as any).bootstrap?.Modal?.getInstance(modal);
                    if (existingInstance) {
                        existingInstance.dispose();
                    }
                    
                    // Crear nueva instancia
                    const bootstrapModal = new (window as any).bootstrap.Modal(modal, {
                        backdrop: 'static',
                        keyboard: false
                    });
                    bootstrapModal.show();
                }
            } catch (error) {
                console.log('Error al abrir modal de convocatoria:', error);
            }
        }, 0);
    }

    openDeleteModal(lessonId) {
        this.setDeleteLesson(lessonId);
        
        // Esperar a que Angular actualice el DOM
        setTimeout(() => {
            try {
                const modal = document.getElementById('delete');
                if (modal) {
                    // Limpiar cualquier instancia previa
                    const existingInstance = (window as any).bootstrap?.Modal?.getInstance(modal);
                    if (existingInstance) {
                        existingInstance.dispose();
                    }
                    
                    // Crear nueva instancia
                    const bootstrapModal = new (window as any).bootstrap.Modal(modal, {
                        backdrop: 'static',
                        keyboard: false
                    });
                    bootstrapModal.show();
                }
            } catch (error) {
                console.log('Error al abrir modal de eliminar:', error);
            }
        }, 0);
    }

    // NUEVO MÉTODO PARA ENFOQUE DESDE NOTIFICACIONES
    getFocusedLesson() {
        if (!this.focusedLessonId) return;
        
        console.log('Cargando lección enfocada para admin:', this.focusedLessonId);
        
        this.lessonService.getLesson(this.token, this.focusedLessonId).subscribe(
            response => {
                if (response.lesson) {
                    // Crear arrays con solo la lección enfocada
                    this.lessons = [response.lesson];
                    this.allLessons = [response.lesson];
                    this.filteredLessons = [response.lesson];
                    this.loading = false;
                    
                    console.log('Lección enfocada cargada para admin:', response.lesson.title);
                    
                    // Abrir modal según actionType
                    if (this.actionType === 'openAddCall') {
                        const openNextVersion = response.lesson?.state === 'completed';
                        setTimeout(() => this.openAddCallModal(response.lesson, openNextVersion), 100);
                    } else if (this.actionType === 'openCall') {
                        setTimeout(() => this.openCallModal(response.lesson), 100);
                    } else if (response.lesson.call && response.lesson.call.visible) {
                        // Compatibilidad previa: si está visible, abrir modal de convocatoria
                        setTimeout(() => this.openCallModal(response.lesson), 100);
                    }

                    // Scroll suave hacia la lección si es necesario
                    setTimeout(() => {
                        const lessonElement = document.querySelector('.card-lesson');
                        if (lessonElement) {
                            lessonElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 100);
                } else {
                    console.error('No se pudo cargar la lección enfocada');
                    this.loading = false;
                }
            },
            error => {
                console.error('Error cargando lección enfocada:', error);
                this.loading = false;
            }
        );
    }

    // Verificar si una lección está enfocada
    isFocusedLesson(lesson: any): boolean {
        return this.focusedLessonId === lesson._id;
    }
}
