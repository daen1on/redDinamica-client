import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';

import { LessonService } from 'src/app/services/lesson.service';
import { UserService } from 'src/app/services/user.service';
import { UserLessonsService, PublicLesson, UserLessonsStats, LessonFilters } from 'src/app/services/user-lessons.service';
import { GLOBAL } from 'src/app/services/global';

@Component({
    selector: 'lessons',
    templateUrl: './lessons.component.html',
    standalone: false
})
export class LessonsComponent implements OnInit, OnDestroy {
    public title: string;
    public identity: any;
    public token: string;
    public url: string;
    public ownProfile: any;
    
    // Nuevas propiedades según el diseño
    public lessons: PublicLesson[] = [];
    public stats: UserLessonsStats | null = null;
    public loading = true;
    public status: string = '';
    
    // Estados de la interfaz
    public isOwner = false;
    public showConfig = false;
    public hasPublicLessons = false;
    
    // Filtros
    public activeFilters: LessonFilters = {};
    public availableRoles = [
        { value: 'all', label: 'Todas', icon: '📚' },
        { value: 'author', label: 'Como Autor', icon: '👨‍🏫' },
        { value: 'collaborator', label: 'Colaborador', icon: '🤝' },
        { value: 'reviewer', label: 'Revisor', icon: '🔍' }
    ];
    public selectedRole = 'all';
    
    // Configuración de privacidad (simulada por ahora)
    public privacySettings = {
        showLessonsInProfile: true,
        hiddenLessonIds: [] as string[],
        allowCollaborationRequests: true
    };
    
    // Paginación
    public page = 1;
    public pages = 0;
    public total = 0;
    public noMore = false;
    
    private unsubscribe$ = new Subject<void>();

    constructor(
        private _userService: UserService,
        private _lessonService: LessonService,
        private _userLessonsService: UserLessonsService,
        private _route: ActivatedRoute,
        private _router: Router
    ) {
        this.title = 'Lecciones';
        this.identity = this._userService.getIdentity();
        this.token = this._userService.getToken();
        this.url = GLOBAL.url;
    }

    ngOnInit(): void {
        this.loadPage();
    }

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    loadPage(): void {
        this._route.parent?.params.pipe(takeUntil(this.unsubscribe$)).subscribe(params => {
            const userId = params['id'];
            if (userId) {
                this.getUser(userId);
            }
        });
    }

    getUser(userId: string): void {
        this._userService.getUser(userId).pipe(takeUntil(this.unsubscribe$)).subscribe({
            next: response => {
                if (response.user) {
                    this.ownProfile = response.user;
                    this.isOwner = this.identity._id === this.ownProfile._id;
                    this.loadLessonsData();
                } else {
                    this.status = 'error';
                    this.loading = false;
                }
            },
            error: error => {
                console.error('Error fetching user:', error);
                this.status = 'error';
                this.loading = false;
            }
        });
    }

    /**
     * Cargar datos de lecciones y estadísticas según el diseño
     */
    loadLessonsData(): void {
        this.loading = true;
        
        // Cargar datos en paralelo
        const dataToLoad: any = {
            lessons: this._userLessonsService.getPublicLessons(this.ownProfile._id, this.page, this.activeFilters),
            stats: this._userLessonsService.getLessonsStats(this.ownProfile._id)
        };

        // Si es el propietario, cargar también configuración de privacidad
        if (this.isOwner) {
            dataToLoad.privacy = this._userLessonsService.getPrivacySettings();
        }

        forkJoin(dataToLoad).pipe(takeUntil(this.unsubscribe$)).subscribe({
            next: (result: any) => {
                this.lessons = result.lessons.lessons;
                this.stats = result.stats;
                this.total = result.lessons.totalCount;
                this.pages = result.lessons.totalPages;
                this.hasPublicLessons = result.lessons.totalCount > 0;
                this.noMore = !result.lessons.hasMore;
                
                // Actualizar configuración de privacidad si está disponible
                if (result.privacy) {
                    this.privacySettings = result.privacy;
                }
                
                this.determineStatus();
                this.loading = false;
                
                console.log('Lessons data loaded:', {
                    lessons: this.lessons.length,
                    stats: this.stats,
                    isOwner: this.isOwner,
                    privacy: this.privacySettings
                });
            },
            error: error => {
                console.error('Error loading lessons data:', error);
                this.status = 'error';
                this.loading = false;
                this.lessons = [];
                this.stats = null;
            }
        });
    }

    /**
     * Determinar el estado de la interfaz según el diseño
     */
    determineStatus(): void {
        if (!this.privacySettings.showLessonsInProfile && this.isOwner) {
            this.status = 'disabled_by_owner';
        } else if (!this.hasPublicLessons && this.isOwner) {
            this.status = 'no_public_lessons_owner';
        } else if (!this.hasPublicLessons && !this.isOwner) {
            this.status = 'no_public_lessons_visitor';
        } else if (this.hasPublicLessons) {
            this.status = 'success';
        } else {
            this.status = 'empty';
        }
    }

    /**
     * Métodos de filtros según el diseño
     */
    setRoleFilter(role: string): void {
        this.selectedRole = role;
        this.activeFilters.role = role === 'all' ? undefined : role as any;
        this.page = 1;
        this.loadLessonsData();
    }

    clearFilters(): void {
        this.selectedRole = 'all';
        this.activeFilters = {};
        this.page = 1;
        this.loadLessonsData();
    }

    /**
     * Métodos de configuración de privacidad
     */
    toggleConfig(): void {
        this.showConfig = !this.showConfig;
    }

    updatePrivacySettings(): void {
        this._userLessonsService.updatePrivacySettings(this.privacySettings)
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe({
                next: () => {
                    console.log('Privacy settings updated');
                    this.loadLessonsData(); // Recargar datos
                },
                error: error => {
                    console.error('Error updating privacy settings:', error);
                }
            });
    }

    toggleLessonVisibility(lessonId: string): void {
        const isHidden = this.privacySettings.hiddenLessonIds.includes(lessonId);
        
        if (isHidden) {
            this.privacySettings.hiddenLessonIds = this.privacySettings.hiddenLessonIds.filter(id => id !== lessonId);
        } else {
            this.privacySettings.hiddenLessonIds.push(lessonId);
        }

        this._userLessonsService.toggleLessonVisibility(lessonId, !isHidden)
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe({
                next: () => {
                    console.log(`Lesson ${lessonId} visibility toggled`);
                    this.loadLessonsData(); // Recargar datos
                },
                error: error => {
                    console.error('Error toggling lesson visibility:', error);
                }
            });
    }

    isLessonHidden(lessonId: string): boolean {
        return this.privacySettings.hiddenLessonIds.includes(lessonId);
    }

    /**
     * Paginación
     */
    viewMore(): void {
        if (!this.noMore && this.page < this.pages) {
            this.page += 1;
            this.loadMoreLessons();
        }
    }

    loadMoreLessons(): void {
        this._userLessonsService.getPublicLessons(this.ownProfile._id, this.page, this.activeFilters)
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe({
                next: response => {
                    if (response.lessons && response.lessons.length > 0) {
                        this.lessons = this.lessons.concat(response.lessons);
                        this.noMore = !response.hasMore;
                    } else {
                        this.noMore = true;
                    }
                },
                error: error => {
                    console.error('Error fetching more lessons:', error);
                    this.noMore = true;
                }
            });
    }

    /**
     * Métodos auxiliares para el template
     */
    getRoleBadgeClass(role: string): string {
        const roleClasses: { [key: string]: string } = {
            'author': 'primary',
            'collaborator': 'success',
            'reviewer': 'info'
        };
        return roleClasses[role] || 'secondary';
    }

    getRoleLabel(role: string): string {
        const roleLabels: { [key: string]: string } = {
            'author': 'Autor',
            'collaborator': 'Colaborador',
            'reviewer': 'Revisor'
        };
        return roleLabels[role] || role;
    }

    getAreaBadgeClass(area: any): string {
        // Generar color basado en el hash del nombre del área
        const hash = this.hashCode(area.name || area);
        const colors = ['primary', 'success', 'warning', 'info', 'secondary'];
        return colors[Math.abs(hash) % colors.length];
    }

    getAreaName(area: any): string {
        return area.name || area;
    }

    getRatingStars(rating: number): string {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        let stars = '⭐'.repeat(fullStars);
        if (hasHalfStar) stars += '⭐'; // Simplificado por ahora
        return stars || '☆☆☆☆☆';
    }

    formatViews(views: number): string {
        if (views >= 1000) {
            return (views / 1000).toFixed(1) + 'k';
        }
        return views.toString();
    }

    formatDate(date: Date): string {
        return new Date(date).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    truncateDescription(description: string, maxLength: number = 150): string {
        if (!description) return '';
        return description.length > maxLength 
            ? description.substring(0, maxLength) + '...' 
            : description;
    }

    /**
     * Función auxiliar para generar hash
     */
    private hashCode(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }

    /**
     * Navegación a lección
     */
    goToLesson(lessonId: string): void {
        this._router.navigate(['/leccion', lessonId]);
    }
}
