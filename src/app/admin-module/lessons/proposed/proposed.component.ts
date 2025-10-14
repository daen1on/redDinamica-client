import { Component, OnInit } from '@angular/core';
import { UserService } from 'src/app/services/user.service';
import { LessonService } from 'src/app/services/lesson.service';
import { Router, ActivatedRoute } from '@angular/router';
import { GLOBAL } from 'src/app/services/GLOBAL';
import { NotificationService } from 'src/app/services/notification.service';

@Component({
    selector: 'proposed',
    templateUrl: './proposed.component.html',
    standalone: false
})
export class ProposedComponent implements OnInit {
    public title: string;
    public url: string;
    public token: string;
    public identity: any;

    public lessons: any[] = [];
    
    // Pagination
    public page: number; // Actual page
    public pages: number; // Number of pages
    public total: number; // Total of records
    public prevPage: number;
    public nextPage: number;

    public loading: boolean = true;
    public detailsLessonItem: any;
    public deleteLessonId: string;
    public needReloadData: boolean;

    constructor(
        private _userService: UserService,
        private _lessonService: LessonService,
        private _router: Router,
        private _route: ActivatedRoute,
        private _notificationService: NotificationService    
    ) {
        this.title = 'Lecciones propuestas';
        this.url = GLOBAL.url;
        this.token = this._userService.getToken();
        this.identity = this._userService.getIdentity();
    }

    ngOnInit(): void {
        // Enfoque por query param ?lesson=... para abrir detalle
        this._route.queryParams.subscribe(params => {
            const focusedId = params['lesson'];
            if (focusedId) {
                // Cargar página inicial y luego hacer scroll al ítem
                this.actualPage();
                setTimeout(() => {
                    try {
                        const el = document.querySelector(`#lesson-${focusedId}`);
                        if (el) { (el as any).scrollIntoView({ behavior: 'smooth', block: 'center' }); }
                    } catch {}
                }, 300);
            } else {
                this.actualPage();
            }
        });
    }

    ngDoCheck(): void {
        if (this.needReloadData) {
            this.actualPage();
            this.needReloadData = false;
        }
    }
    
    getLessons(page = 1): void {        
        this._lessonService.getSuggestedLesson(this.token, page).subscribe(
            response => {               
                if (response.lessons) {
                    this.lessons = response.lessons;
                    this.total = response.total;
                    this.pages = response.pages;

                    if (page > this.pages) {
                        this._router.navigate(['/admin/lecciones-propuestas']);
                    }

                    this.loading = false;
                }
            }, error => {
                console.log(error);
            }
        );
    }

    actualPage(): void {
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

            this.getLessons(this.page);
        });
    }

    editLesson(lesson: any): void {
        lesson.accepted = true;
        lesson.state = 'proposed';
    
        console.log("Attempting to update lesson", lesson);
    
        this._lessonService.editLesson(this.token, lesson).subscribe({
            next: (response) => {                
                if (response && response.lesson._id) {        
                    console.log("Lesson updated successfully", response.lesson);
                    // Enviar notificación al líder/autor para abrir convocatoria
                    try {
                        const updated = response.lesson;
                        const leaderId = (updated.leader && (updated.leader._id || updated.leader)) || (updated.author && (updated.author._id || updated.author));
                        if (leaderId) {
                            const notificationPayload = {
                                user: leaderId,
                                type: 'lesson',
                                title: '¡Tu lección ha sido aprobada!',
                                content: `Un administrador ha aprobado tu lección "${updated.title}". Ahora puedes gestionar la convocatoria y activar la lección cuando tengas suficientes participantes.`,
                                link: `/inicio/convocatorias?lesson=${updated._id}&action=manage`,
                                relatedId: updated._id,
                                relatedModel: 'Lesson',
                                from: this.identity?._id,
                                priority: 'high'
                            };
                            this._notificationService.createNotification(notificationPayload).subscribe({
                                next: () => console.log('Notificación enviada al líder/autor para abrir convocatoria'),
                                error: (err) => console.error('Error enviando notificación al líder/autor:', err)
                            });
                        } else {
                            console.warn('No se pudo determinar el líder/autor para notificar');
                        }
                    } catch (e) {
                        console.error('Excepción preparando notificación:', e);
                    }
                    this.getLessons(this.page);
                }
            },
            error: (error) => {
                console.error("Error updating lesson", error);
            }
        });
    }
    

    setDetailLesson(lesson: any): void {
        this.detailsLessonItem = lesson;
    }

    setDeleteLesson(lessonId: string): void {
        this.deleteLessonId = lessonId;
    }

    setNeedReload(event: any): void {
        this.needReloadData = true;
    }
}
