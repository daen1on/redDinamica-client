import { Injectable } from '@angular/core';
import { UserService } from './user.service';

/**
 * Servicio centralizado para gestionar restricciones de acceso según GDPR
 * y protección de datos personales para usuarios no activados
 */
@Injectable({
    providedIn: 'root'
})
export class GdprRestrictionsService {

    constructor(private userService: UserService) {}

    /**
     * Verifica si el usuario actual está activado
     */
    isUserActivated(): boolean {
        const identity = this.userService.getIdentity();
        return identity ? !!identity.actived : false;
    }

    /**
     * Verifica si el usuario puede ver información personal de otros usuarios
     */
    canViewPersonalInfo(): boolean {
        return this.isUserActivated();
    }

    /**
     * Verifica si el usuario puede ver fotos de perfil de otros usuarios
     */
    canViewProfilePictures(): boolean {
        return this.isUserActivated();
    }

    /**
     * Verifica si el usuario puede comentar en publicaciones
     */
    canComment(): boolean {
        return this.isUserActivated();
    }

    /**
     * Verifica si el usuario puede enviar mensajes privados
     */
    canSendMessages(): boolean {
        return this.isUserActivated();
    }

    /**
     * Verifica si el usuario puede acceder a recursos
     */
    canAccessResources(): boolean {
        return this.isUserActivated();
    }

    /**
     * Verifica si el usuario puede acceder a lecciones
     */
    canAccessLessons(): boolean {
        return this.isUserActivated();
    }

    /**
     * Verifica si el usuario puede seguir a otros usuarios
     */
    canFollowUsers(): boolean {
        return this.isUserActivated();
    }

    /**
     * Verifica si el usuario puede ver perfiles completos
     */
    canViewFullProfiles(): boolean {
        return this.isUserActivated();
    }

    /**
     * Verifica si el usuario puede participar en convocatorias
     */
    canParticipateInCalls(): boolean {
        return this.isUserActivated();
    }

    /**
     * Verifica si el usuario puede crear publicaciones
     * (permitido incluso sin activación, pero con restricciones en comentarios)
     */
    canCreatePublications(): boolean {
        return true; // Permitido para mantener engagement básico
    }

    /**
     * Obtiene mensaje explicativo sobre limitaciones GDPR
     */
    getGdprLimitationMessage(): string {
        return 'Tu cuenta está en proceso de activación. Por protección de datos (GDPR), ' +
               'tienes acceso limitado hasta que un administrador apruebe tu cuenta.';
    }

    /**
     * Obtiene lista de restricciones actuales
     */
    getCurrentRestrictions(): string[] {
        if (this.isUserActivated()) {
            return [];
        }

        return [
            'No puedes acceder a recursos educativos',
            'No puedes acceder a lecciones académicas',
            'No puedes comentar en publicaciones',
            'No puedes enviar mensajes privados',
            'No puedes ver información personal de otros usuarios',
            'No puedes ver fotos de perfil de otros usuarios',
            'No puedes seguir a otros usuarios',
            'No puedes participar en convocatorias de lecciones'
        ];
    }
}

