import { Component, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { UserService } from 'src/app/services/user.service';

@Component({
    selector: 'recoverPassword',
    templateUrl: './recoverPassword.component.html',
    standalone: false
})
export class RecoverPasswordComponent implements OnInit {
  public title: string;
  public status: string;
  public recoverPassForm: UntypedFormGroup;
  public submitted = false;

  constructor(
    private _formBuilder: UntypedFormBuilder,
    private _userService: UserService
  ) {
    this.title = '¿Olvidaste tu contraseña?';
  }

  ngOnInit(): void {
    this.recoverPassForm = this._formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get f() { return this.recoverPassForm.controls; }

  onSubmit() {
    this.submitted = true;

    // stop here if form is invalid
    if (this.recoverPassForm.invalid) {
      return;
    }

    this._userService.recoverPass(this.recoverPassForm.value).subscribe({
      next: (response) => {
        try {
          if (response && response.user && response.user._id) {
            this.status = 'success';
          } else {
            this.status = 'error';
          }
        } catch (e) {
          this.status = 'error';
          console.log('Error parsing response:', e);
        }
      },
      error: (error) => {
        this.status = 'error';
        console.log(error);
      },
      complete: () => {
        // Optional
      }
    });
  }
}
