import { ActivatedRouteSnapshot, RouterStateSnapshot, CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';
import { ResourcesComponent } from '../resources/resources.component';
import { ReviewComponent } from '../review/review.component';

export const canDeactivateResource: CanDeactivateFn<ResourcesComponent> = (
  component: ResourcesComponent,
  currentRoute: ActivatedRouteSnapshot,
  currentState: RouterStateSnapshot,
  nextState: RouterStateSnapshot
): Observable<boolean> | boolean => {
  const uploadInProgress = component.loading || component.barWidth !== '0%';
  const hasDraft = component.name.value !== '' || component.files.length > 0 || component.editMode || component.submitted;

  if (uploadInProgress || hasDraft) {
    const message = uploadInProgress
      ? 'Hay una carga de archivos en progreso. Si sales ahora se cancelará.'
      : 'Tienes cambios sin guardar. ¿Deseas salir sin guardar?';

    // Usa el modal del componente si existe el método; si no, fallback a confirm
    const anyComponent: any = component as any;
    if (typeof anyComponent.openConfirmLeave === 'function') {
      return anyComponent.openConfirmLeave(message) as any;
    }

    return window.confirm(message);
  }

  return true;
};

export const canDeactivateReview: CanDeactivateFn<ReviewComponent> = (
  component: ReviewComponent,
  currentRoute: ActivatedRouteSnapshot,
  currentState: RouterStateSnapshot,
  nextState: RouterStateSnapshot
): Observable<boolean> | boolean => {
  if (component.name.value !== '' || component.files.length > 0) {
    console.log("falseName or file: ", component.name.value);
    return false;
  } else if (component.submitted) {
    console.log("submitted");
    return false;
  } else {
    return true;
  }
};
