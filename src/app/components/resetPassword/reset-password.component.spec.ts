import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { UserService } from 'src/app/services/user.service';
import { ResetPasswordComponent } from './reset-password.component';
import { By } from '@angular/platform-browser';

describe('ResetPasswordComponent', () => {
  let component: ResetPasswordComponent;
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let userService: jasmine.SpyObj<UserService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(waitForAsync(() => {
    const userServiceSpy = jasmine.createSpyObj('UserService', ['resetPassword']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const activatedRouteStub = { snapshot: { paramMap: { get: () => 'dummyToken' } } };

    TestBed.configureTestingModule({
      declarations: [ResetPasswordComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: UserService, useValue: userServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteStub }
      ]
    }).compileComponents();

    userService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form with empty controls', () => {
    expect(component.resetPasswordForm.get('newPassword')?.value).toBe('');
    expect(component.resetPasswordForm.get('confirmPassword')?.value).toBe('');
  });

  it('should display error message if passwords do not match', () => {
    component.resetPasswordForm.setValue({ newPassword: 'password1', confirmPassword: 'password2' });
    component.onSubmit();
    fixture.detectChanges();
    
    const errorElement = fixture.debugElement.query(By.css('.invalid-feedback'));
    expect(errorElement.nativeElement.textContent).toContain('Las contraseñas no coinciden');
  });

  it('should call resetPassword on form submit when form is valid', () => {
    component.resetPasswordForm.setValue({ newPassword: 'password123', confirmPassword: 'password123' });
    userService.resetPassword.and.returnValue(of({ message: 'Success' }));

    component.onSubmit();

    expect(userService.resetPassword.calls.count()).toBe(1);
    expect(userService.resetPassword.calls.first().args[0]).toBe('dummyToken');
    expect(userService.resetPassword.calls.first().args[1]).toBe('password123');
  });

  it('should navigate to login on successful password reset', (done) => {
    component.resetPasswordForm.setValue({ newPassword: 'password123', confirmPassword: 'password123' });
    userService.resetPassword.and.returnValue(of({ message: 'Success' }));

    component.onSubmit();

    fixture.whenStable().then(() => {
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
      done();
    });
  });

  it('should display error message on password reset failure', () => {
    component.resetPasswordForm.setValue({ newPassword: 'password123', confirmPassword: 'password123' });
    userService.resetPassword.and.returnValue(throwError(() => ({ error: 'Error' })));

    component.onSubmit();
    fixture.detectChanges();

    expect(component.status).toBe('error');
    const errorElement = fixture.debugElement.query(By.css('.alert-danger'));
    expect(errorElement).toBeTruthy();
    expect(errorElement.nativeElement.textContent).toContain('Hubo un error al restablecer tu contraseña');
  });
});
