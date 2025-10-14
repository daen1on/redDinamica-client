import { Component, Input } from '@angular/core';
import { GLOBAL } from 'src/app/services/global';
import { LESSON_STATES, ACADEMIC_LEVEL } from 'src/app/services/DATA';
import { UserService } from 'src/app/services/user.service';

@Component({
    selector: 'lesson-details',
    templateUrl: './lesson-details.component.html',
    styleUrls: ['./lesson-details.component.css'],
    standalone: false
})
export class LessonDetailsComponent {
    public url;
    public identity;

    @Input() lesson; 

    public academic_level = ACADEMIC_LEVEL;    
    public lesson_states = LESSON_STATES;
    
    public loading = true;
    public showMotivationalMessage = true;
    
    // Configuración de progreso y mensajes por estado
    public progressConfig = {
        proposed: {
            progress: 20,
            message: "¡Excelente! Tu propuesta ha sido recibida. El equipo administrativo la está revisando. ¡Pronto tendrás noticias!",
            icon: "fas fa-lightbulb",
            color: "secondary"
        },
        assigned: {
            progress: 40,
            message: "¡Felicitaciones! Tu lección ha sido asignada. Es momento de formar tu equipo de desarrollo y comenzar a trabajar.",
            icon: "fas fa-users",
            color: "warning"
        },
        development: {
            progress: 60,
            message: "¡Están en pleno desarrollo! El equipo está trabajando duro. ¡Sigan así, están haciendo un gran trabajo!",
            icon: "fas fa-code",
            color: "info"
        },
        test: {
            progress: 80,
            message: "¡Ya casi terminan! La lección está en fase de pruebas. ¡El último esfuerzo los llevará al éxito!",
            icon: "fas fa-flask",
            color: "primary"
        },
        completed: {
            progress: 100,
            message: "¡Increíble! ¡Han completado la lección exitosamente! Su trabajo contribuye al crecimiento de toda la comunidad educativa.",
            icon: "fas fa-trophy",
            color: "success"
        }
    };

    constructor(private _userService: UserService) {        
        this.url = GLOBAL.url;
        this.identity = this._userService.getIdentity();
    }

    ngOnInit(): void {
        this.loading = false;
        
        // Asegurar que lesson.level sea siempre un array para el template
        if (this.lesson && this.lesson.level && !Array.isArray(this.lesson.level)) {
            this.lesson.level = [this.lesson.level];
        }
        
        // Verificar si ya se leyó el mensaje para esta lección
        this.checkMotivationalMessageStatus();
    }
    
    getCurrentProgress(): number {
        if (!this.lesson?.state) return 0;
        return this.progressConfig[this.lesson.state]?.progress || 0;
    }
    
    getCurrentConfig() {
        if (!this.lesson?.state) return null;
        return this.progressConfig[this.lesson.state];
    }
    
    checkMotivationalMessageStatus(): void {
        if (!this.lesson?._id) return;
        
        const messageKey = `motivational_message_${this.lesson._id}_${this.lesson.state}`;
        const isRead = localStorage.getItem(messageKey);
        this.showMotivationalMessage = !isRead;
    }
    
    dismissMotivationalMessage(): void {
        if (!this.lesson?._id) return;
        
        const messageKey = `motivational_message_${this.lesson._id}_${this.lesson.state}`;
        localStorage.setItem(messageKey, 'read');
        this.showMotivationalMessage = false;
    }

    // Verifica si el usuario actual es líder o miembro del grupo de desarrollo de la lección
    isLessonMember(): boolean {
        if (!this.identity || !this.lesson) return false;

        const currentUserId = String(this.identity?._id || this.identity?.id || '');
        if (!currentUserId) return false;

        const leaderRef: any = (this.lesson as any).leader;
        const leaderId = leaderRef ? String(leaderRef._id || leaderRef.id || leaderRef) : '';
        if (leaderId && leaderId === currentUserId) return true;

        const members: any[] = Array.isArray((this.lesson as any).development_group) ? (this.lesson as any).development_group : [];
        return members.some((member: any) => {
            const memberId = String(
                (member && (member._id || member.id)) ||
                (member && member.user && (member.user._id || member.user.id || member.user)) ||
                ''
            );
            return !!memberId && memberId === currentUserId;
        });
    }

}
