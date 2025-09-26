import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { of, throwError } from 'rxjs';
import { EditErrorComponent } from './edit-error.component';
import { ErrorService } from '../../services/error.service';

describe('EditErrorComponent', () => {
  let component: EditErrorComponent;
  let fixture: ComponentFixture<EditErrorComponent>;
  let mockErrorService: any;

  beforeEach(async () => {
    mockErrorService = jasmine.createSpyObj('ErrorService', ['updateErrorReport']);

    await TestBed.configureTestingModule({
      declarations: [EditErrorComponent],
      imports: [ReactiveFormsModule],
      providers: [
        NgbActiveModal,
        { provide: ErrorService, useValue: mockErrorService }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditErrorComponent);
    component = fixture.componentInstance;
    component.errorReport = {
      type: 'Fallo / Bug',
      module: 'Modulo Inicio',
      description: 'Test description',
      steps: 'Test steps',
      _id: '123'
    };
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form with error report data', () => {
    expect(component.editErrorForm.value).toEqual({
      type: 'Fallo / Bug',
      module: 'Modulo Inicio',
      description: 'Test description',
      steps: 'Test steps'
    });
  });

  it('should call updateErrorReport on form submit', () => {
    mockErrorService.updateErrorReport.and.returnValue(of({}));

    component.onSubmit();

    expect(mockErrorService.updateErrorReport).toHaveBeenCalledWith('123', {
      type: 'Fallo / Bug',
      module: 'Modulo Inicio',
      description: 'Test description',
      steps: 'Test steps'
    }, null);
  });

  it('should show success message and close modal on successful update', () => {
    mockErrorService.updateErrorReport.and.returnValue(of({}));

    component.onSubmit();

    expect(component.successMessage).toBe('Reporte actualizado con éxito.');
  });

  it('should show error message on update error', () => {
    const errorMessage = 'Error de actualización';
    mockErrorService.updateErrorReport.and.returnValue(throwError(() => ({ error: { message: errorMessage } })));

    component.onSubmit();

    expect(component.errorMessage).toBe('Error al actualizar el reporte: ' + errorMessage);
  });
});
