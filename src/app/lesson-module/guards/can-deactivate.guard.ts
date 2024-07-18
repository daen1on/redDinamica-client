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
  if (component.name.value !== '' || component.files.length > 0) {
    console.log("falseName or file: ", component.name.value);
    return false;
  } else if (component.editMode) {
    console.log("edit ");
    return false;
  } else if (component.submitted) {
    console.log("submitted");
    return false;
  } else {
    return true;
  }
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
