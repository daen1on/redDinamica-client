import { Component, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from 'src/app/services/user.service';
import { MustMatch } from 'src/app/helpers/must-match.validator'; // Asegúrate de tener el archivo en el lugar correcto

@Component({
    selector: 'reset-password',
    templateUrl: './reset-password.component.html',
    standalone: false
})
export class ResetPasswordComponent implements OnInit {
  public resetPasswordForm!: UntypedFormGroup;
  public submitted = false;
  public token!: string;
  public status!: string;

  constructor(
    private _formBuilder: UntypedFormBuilder,
    private _userService: UserService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token')!;
    this.resetPasswordForm = this._formBuilder.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, {
      validators: MustMatch('newPassword', 'confirmPassword')
    });
  }

  get f() { return this.resetPasswordForm.controls; }

  onSubmit(): void {
    this.submitted = true;

    if (this.resetPasswordForm.invalid) {
      return;
    }

    this._userService.resetPassword(this.token, this.resetPasswordForm.value.newPassword).subscribe({
      next: (response) => {
        this.status = 'success';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (error) => {
        this.status = 'error';
        console.log(error);
      }
    });
  }
}
