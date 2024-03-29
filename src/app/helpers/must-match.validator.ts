import { UntypedFormGroup, ValidationErrors } from '@angular/forms';

// custom validator to check that two fields match
export function MustMatch(firstKey: string, secondKey: string) {
    return function (group: UntypedFormGroup): ValidationErrors | undefined {
        if (group.controls[firstKey].value !== group.controls[secondKey].value) {
          return {
            'missmatch': true
          };
        }
      };
}