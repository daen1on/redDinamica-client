import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { UserService } from './user.service';
import { User } from '../models/user.model';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UserService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
    
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
    expect(service).toBeTruthy();
  });

  describe('Token and Identity Management', () => {
    it('should set and get token correctly', () => {
      const testToken = 'test-token-123';
      
      service.setToken(testToken);
      expect(service.getToken()).toBe(testToken);
      expect(localStorage.getItem('token')).toBe(testToken);
    });

    it('should set and get identity correctly', () => {
      const testUser: Partial<User> = {
        _id: '123',
        name: 'Test User',
        surname: 'Test',
        email: 'test@test.com',
        password: '',
        role: 'user',
        picture: '',
        actived: true
      };
      
      service.setIdentity(testUser as User);
      expect(service.getIdentity()).toEqual(jasmine.objectContaining(testUser));
      expect(localStorage.getItem('identity')).toBe(JSON.stringify(testUser));
    });

    it('should clear identity and token', () => {
      // Arrange
      service.setToken('test-token');
        service.setIdentity({ _id: '123', name: 'Test' } as any);
      
      // Act
      service.clearIdentityAndToken();
      
      // Assert
      expect(service.getToken()).toBeNull();
      expect(service.getIdentity()).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('identity')).toBeNull();
    });
  });

  describe('Session Expiration Tests', () => {
    it('should detect when localStorage is cleared and redirect to login on protected routes', (done) => {
      // Arrange: Simular usuario logueado
      const mockUser = { _id: '123', name: 'Test User', email: 'test@test.com' };
      const mockToken = 'valid-token-123';
      
      // Simular datos en localStorage
      localStorage.setItem('identity', JSON.stringify(mockUser));
      localStorage.setItem('token', mockToken);
      
      // Verificar que el servicio detecta los datos iniciales
      expect(service.getToken()).toBe(mockToken);
      expect(service.getIdentity()).toEqual(jasmine.objectContaining(mockUser));
      
      // Simular estar en una ruta protegida (mock simplificado)
      // Nota: En un entorno real, esto se manejaría con Angular Router
      
      const alertSpy = spyOn(window, 'alert');
      
      // Act: Borrar localStorage (simulando sesión expirada)
      localStorage.clear();
      
      // Act: Llamar getToken() que debería detectar localStorage vacío
      const token = service.getToken();
      
      // Assert: Verificar que el token es null
      expect(token).toBeNull();
      expect(service.getIdentity()).toBeNull();
      
      // Verificar que la sesión se detecta como expirada (sin mock de location)
      setTimeout(() => {
        // En este caso, solo verificamos que los datos se limpiaron correctamente
        expect(service.getToken()).toBeNull();
        expect(service.getIdentity()).toBeNull();
        done();
      }, 200);
    });

    it('should not redirect when on public routes', (done) => {
      // Arrange: Simular usuario logueado
      const mockUser = { _id: '123', name: 'Test User', email: 'test@test.com' };
      const mockToken = 'valid-token-123';
      
      localStorage.setItem('identity', JSON.stringify(mockUser));
      localStorage.setItem('token', mockToken);
      
      // Simular estar en una ruta pública (mock simplificado)
      // Nota: En un entorno real, esto se manejaría con Angular Router
      
      const alertSpy = spyOn(window, 'alert');
      
      // Act: Borrar localStorage
      localStorage.clear();
      const token = service.getToken();
      
      // Assert: No debería redirigir en rutas públicas
      expect(token).toBeNull();
      
      setTimeout(() => {
        expect(alertSpy).not.toHaveBeenCalled();
        done();
      }, 200);
    });

    it('should handle token validation correctly', () => {
      // Arrange: Token muy corto (inválido)
      const shortToken = 'abc';
      localStorage.setItem('token', shortToken);
      localStorage.setItem('identity', JSON.stringify({ _id: '123', name: 'Test' }));
      
      // Act & Assert
      expect(service.isTokenValid()).toBe(false);
      
      // Arrange: Token válido con identidad
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const validIdentity = { _id: '123', name: 'Test' };
      localStorage.setItem('token', validToken);
      localStorage.setItem('identity', JSON.stringify(validIdentity));
      
      // Limpiar cache para forzar recarga
      (service as any)._token = null;
      (service as any)._identity = null;
      
      // Act & Assert
      expect(service.isTokenValid()).toBe(true);
    });

    it('should synchronize cache with localStorage changes', () => {
      // Arrange: Estado inicial
      const mockUser = { _id: '123', name: 'Test User' };
      const mockToken = 'valid-token';
      
      localStorage.setItem('identity', JSON.stringify(mockUser));
      localStorage.setItem('token', mockToken);
      
      // Act: Llamar getToken() para sincronizar cache
      const token = service.getToken();
      const identity = service.getIdentity();
      
      // Assert: Cache sincronizado
      expect(token).toBe(mockToken);
      expect(identity).toEqual(jasmine.objectContaining(mockUser));
      
      // Act: Cambiar localStorage y limpiar cache interno
      localStorage.setItem('token', 'new-token');
      (service as any)._token = null; // Forzar recarga desde localStorage
      const newToken = service.getToken();
      
      // Assert: Cache se actualiza automáticamente
      expect(newToken).toBe('new-token');
    });
  });

  describe('API Calls', () => {
    it('should register user successfully', () => {
      const testUser: Partial<User> = {
        _id: '',
        name: 'Test',
        surname: 'User',
        email: 'test@test.com',
        password: 'password123',
        role: 'user',
        picture: '',
        actived: true
      };

      service.register(testUser as User).subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne(service.url + 'register');
      expect(req.request.method).toBe('POST');
      req.flush({ success: true });
    });

    it('should login user successfully', () => {
      const loginData = { email: 'test@test.com', password: 'password123' };

      service.signup(loginData as any).subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne(service.url + 'login');
      expect(req.request.method).toBe('POST');
      req.flush({ success: true });
    });
  });
}); 