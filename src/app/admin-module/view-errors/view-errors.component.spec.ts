import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ViewErrorsComponent } from './view-errors.component';
import { ErrorService } from '../../services/error.service';
import { PublicationService } from '../../services/publication.service';
import { UserService } from '../../services/user.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('AdminReportsComponent', () => {
  let component: ViewErrorsComponent;
  let fixture: ComponentFixture<ViewErrorsComponent>;
  let errorServiceSpy: jasmine.SpyObj<ErrorService>;
  let publicationServiceSpy: jasmine.SpyObj<PublicationService>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let modalSpy: any;

  beforeEach(async () => {
    errorServiceSpy = jasmine.createSpyObj('ErrorService', [
      'getErrorReports',
      'deleteErrorReport',
      'getFile',
      'sendWarningToUser',
      'resolveComplaint'
    ]);
    errorServiceSpy.getErrorReports.and.returnValue(of({ data: [], total: 0 }));
    errorServiceSpy.deleteErrorReport.and.returnValue(of(void 0));
    errorServiceSpy.getFile.and.returnValue(of(new Blob()));
    errorServiceSpy.sendWarningToUser.and.returnValue(of({}));
    errorServiceSpy.resolveComplaint.and.returnValue(of({}));

    publicationServiceSpy = jasmine.createSpyObj('PublicationService', ['removePost']);
    publicationServiceSpy.removePost.and.returnValue(of({}));

    userServiceSpy = jasmine.createSpyObj('UserService', ['getToken']);
    userServiceSpy.getToken.and.returnValue('test-token');

    modalSpy = {
      open: () => ({
        componentInstance: {},
        result: Promise.resolve('dismiss')
      })
    };
    (window as any).bootstrap = {
      Modal: {
        getInstance: () => ({ hide: () => {} })
      }
    };

    await TestBed.configureTestingModule({
      declarations: [ViewErrorsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ErrorService, useValue: errorServiceSpy },
        { provide: PublicationService, useValue: publicationServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: NgbModal, useValue: modalSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ViewErrorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load error reports and set pagination', () => {
    errorServiceSpy.getErrorReports.and.returnValue(of({ data: [{ id: 1 }], total: 25 }));

    component.loadErrorReports(2);

    expect(errorServiceSpy.getErrorReports).toHaveBeenCalled();
    expect(component.errorReports.length).toBe(1);
    expect(component.totalPages).toBe(Math.ceil(25 / component.pageSize));
    expect(component.loading).toBeFalse();
  });

  it('should delete report and reload current page', () => {
    spyOn(component, 'loadErrorReports');

    component.currentPage = 3;
    component.deleteReport('abc123');

    expect(errorServiceSpy.deleteErrorReport).toHaveBeenCalledWith('abc123');
    expect(component.loadErrorReports).toHaveBeenCalledWith(3);
  });

  it('should get file via ErrorService', () => {
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:url');
    spyOn(window, 'open').and.returnValue(null as any);

    component.getFile('file.pdf');

    expect(errorServiceSpy.getFile).toHaveBeenCalledWith('file.pdf');
  });

  it('should delete publication from complaint and resolve complaint', () => {
    spyOn(window, 'alert').and.stub();
    spyOn(component, 'resolveComplaint');

    const complaint = { publicationId: 'p1', _id: 'c1', reporter: 'u1' } as any;
    component.deletePublicationFromComplaint(complaint);

    expect(publicationServiceSpy.removePost).toHaveBeenCalledWith('test-token', 'p1');
    expect(component.resolveComplaint).toHaveBeenCalledWith(complaint, true);
  });

  it('should send warning to user and resolve complaint', () => {
    spyOn(window, 'alert').and.stub();
    spyOn(component, 'resolveComplaint');

    const complaint = { _id: 'c1', reporter: 'u1', reportedUserId: 'user-2' } as any;
    component.selectedComplaint = complaint;
    component.warningMessage = 'Mensaje de advertencia';

    component.sendWarning();

    expect(errorServiceSpy.sendWarningToUser).toHaveBeenCalledWith('user-2', 'Mensaje de advertencia');
    expect(component.resolveComplaint).toHaveBeenCalledWith(complaint, true);
    expect(component.warningMessage).toBe('');
    expect(component.selectedComplaint).toBeNull();
  });

  it('should resolve complaint and reload list', () => {
    spyOn(component, 'loadComplaints');

    component.currentComplaintsPage = 2;
    component.resolveComplaint({ _id: 'c1', reporter: 'u1' } as any, false);

    expect(errorServiceSpy.resolveComplaint).toHaveBeenCalled();
    expect(component.loadComplaints).toHaveBeenCalledWith(2);
  });
});
