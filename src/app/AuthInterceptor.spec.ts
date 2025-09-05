import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthInterceptor } from './AuthInterceptor';
import { UserService } from './services/user.service';

describe('AuthInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let userService: UserService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        UserService,
        {
          provide: Router,
          useValue: {
            navigate: jasmine.createSpy('navigate')
          }
        },
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthInterceptor,
          multi: true
        }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    userService = TestBed.inject(UserService);
    router = TestBed.inject(Router);

    // Limpiar localStorage antes de cada test
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(httpClient).toBeTruthy();
  });

  describe('Token Management', () => {
    it('should add token to request headers when available', () => {
      // Arrange
      const testToken = 'test-token-123';
      localStorage.setItem('token', testToken);

      // Act
      httpClient.get('/api/test').subscribe();

      // Assert
      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers.get('Authorization')).toBe(testToken);
      req.flush({});
    });

    it('should not add token when localStorage is empty', () => {
      // Arrange - localStorage vacío
      localStorage.clear();

      // Act
      httpClient.get('/api/test').subscribe();

      // Assert
      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers.get('Authorization')).toBeNull();
      req.flush({});
    });

    it('should not add token when request already has Authorization header', () => {
      // Arrange
      const testToken = 'test-token-123';
      localStorage.setItem('token', testToken);

      // Act - Request con header Authorization ya presente
      httpClient.get('/api/test', {
        headers: { 'Authorization': 'existing-token' }
      }).subscribe();

      // Assert
      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers.get('Authorization')).toBe('existing-token');
      req.flush({});
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 errors and redirect to login', () => {
      // Arrange
      const alertSpy = spyOn(window, 'alert');
      const clearSpy = spyOn(userService, 'clearIdentityAndToken');

      // Act
      httpClient.get('/api/protected').subscribe({
        error: (error) => {
          // Expected error
        }
      });

      // Simular error 401
      const req = httpMock.expectOne('/api/protected');
      req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

      // Assert
      expect(alertSpy).toHaveBeenCalledWith('La sesión ha expirado, por favor iniciar sesión de nuevo.');
      expect(clearSpy).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should handle 403 errors and redirect to login', () => {
      // Arrange
      const alertSpy = spyOn(window, 'alert');
      const clearSpy = spyOn(userService, 'clearIdentityAndToken');

      // Act
      httpClient.get('/api/protected').subscribe({
        error: (error) => {
          // Expected error
        }
      });

      // Simular error 403
      const req = httpMock.expectOne('/api/protected');
      req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

      // Assert
      expect(alertSpy).toHaveBeenCalledWith('La sesión ha expirado, por favor iniciar sesión de nuevo.');
      expect(clearSpy).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should handle authorization header errors', () => {
      // Arrange
      const alertSpy = spyOn(window, 'alert');
      const clearSpy = spyOn(userService, 'clearIdentityAndToken');

      // Act
      httpClient.get('/api/protected').subscribe({
        error: (error) => {
          // Expected error
        }
      });

      // Simular error con mensaje de authorization header
      const req = httpMock.expectOne('/api/protected');
      req.flush({ 
        message: "Request hasn't got authorization header" 
      }, { status: 400, statusText: 'Bad Request' });

      // Assert
      expect(alertSpy).toHaveBeenCalledWith('Sesión no válida. Por favor, inicie sesión nuevamente.');
      expect(clearSpy).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should handle null token errors from services', () => {
      // Arrange
      const alertSpy = spyOn(window, 'alert');
      const clearSpy = spyOn(userService, 'clearIdentityAndToken');

      // Act
      httpClient.get('/api/protected').subscribe({
        error: (error) => {
          // Expected error
        }
      });

      // Simular error con mensaje de token null
      const req = httpMock.expectOne('/api/protected');
      req.flush({ 
        message: "Unexpected value of the `Authorization` header provided. Expecting either a string, a number or an array, but got: `null`." 
      }, { status: 400, statusText: 'Bad Request' });

      // Assert
      expect(alertSpy).toHaveBeenCalledWith('Sesión no válida. Por favor, inicie sesión nuevamente.');
      expect(clearSpy).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should not show multiple alerts for the same error', () => {
      // Arrange
      const alertSpy = spyOn(window, 'alert');
      const clearSpy = spyOn(userService, 'clearIdentityAndToken');

      // Act - Hacer múltiples requests que fallen
      httpClient.get('/api/protected1').subscribe({ error: () => {} });
      httpClient.get('/api/protected2').subscribe({ error: () => {} });

      // Simular errores 401
      const req1 = httpMock.expectOne('/api/protected1');
      const req2 = httpMock.expectOne('/api/protected2');
      
      req1.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
      req2.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

      // Assert - Solo debería mostrar un alert
      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(clearSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle successful requests without errors', () => {
      // Arrange
      const alertSpy = spyOn(window, 'alert');

      // Act
      httpClient.get('/api/public').subscribe(response => {
        expect(response).toEqual({ success: true });
      });

      // Assert
      const req = httpMock.expectOne('/api/public');
      req.flush({ success: true });

      // No debería mostrar alert en requests exitosos
      expect(alertSpy).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty token strings', () => {
      // Arrange
      localStorage.setItem('token', '');

      // Act
      httpClient.get('/api/test').subscribe();

      // Assert
      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers.get('Authorization')).toBeNull();
      req.flush({});
    });

    it('should handle whitespace-only tokens', () => {
      // Arrange
      localStorage.setItem('token', '   ');

      // Act
      httpClient.get('/api/test').subscribe();

      // Assert
      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers.get('Authorization')).toBeNull();
      req.flush({});
    });

    it('should handle undefined error status', () => {
      // Arrange
      const alertSpy = spyOn(window, 'alert');
      const clearSpy = spyOn(userService, 'clearIdentityAndToken');

      // Act
      httpClient.get('/api/protected').subscribe({
        error: (error) => {
          // Expected error
        }
      });

      // Simular error sin status definido
      const req = httpMock.expectOne('/api/protected');
      req.error(new ErrorEvent('Network error'));

      // Assert - No debería manejar errores de red como errores de auth
      expect(alertSpy).not.toHaveBeenCalled();
      expect(clearSpy).not.toHaveBeenCalled();
    });
  });
}); 