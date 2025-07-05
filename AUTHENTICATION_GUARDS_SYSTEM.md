# Sistema de Guards de Autenticación - RedDinámica Frontend

## **Problema Resuelto**

Los usuarios no autenticados podían acceder a URLs protegidas como `/perfil/[id]`, causando errores de tipo "Cannot read properties of null" cuando los componentes intentaban acceder a propiedades de usuario no existentes.

## **Solución Implementada**

### **1. Guard de Autenticación General**
- **Archivo**: `guards/auth.guard.ts`
- **Función**: Protege rutas que requieren autenticación
- **Comportamiento**: Redirige a home (`/`) cuando no hay usuario logueado

### **2. Guards Existentes Mejorados**
- **homeGuard**: Protege rutas del módulo home
- **landingGuard**: Redirige usuarios logueados desde páginas públicas
- **adminGuard**: Protege rutas administrativas
- **messageGuard**: Protege módulo de mensajes
- **profileGuard**: Protege edición de perfil propio

### **3. Rutas Protegidas Actualizadas**
**Archivo**: `app.routing.ts`
```typescript
const routes: Routes = [
  // Rutas públicas
  { path: '', loadChildren: () => import('./components/landing/landing.module').then(m => m.LandingModule), canActivate: [landingGuard] },
  { path: 'login', loadChildren: () => import('./components/login/login.module').then(m => m.LoginModule), canActivate: [landingGuard] },
  { path: 'registro', loadChildren: () => import('./components/register/register.module').then(m => m.RegisterModule), canActivate: [landingGuard] },
  
  // Rutas protegidas
  { path: 'perfil', loadChildren: () => import('./profile-module/profile.module').then(m => m.ProfileModule), canActivate: [authGuard] },
  { path: 'mensajes', loadChildren: () => import('./message-module/message.module').then(m => m.MessageModule), canActivate: [authGuard] },
  { path: 'leccion', loadChildren: () => import('./lesson-module/lesson.module').then(m => m.LessonModule), canActivate: [authGuard] },
  { path: 'admin', loadChildren: () => import('./admin-module/admin.module').then(m => m.AdminModule), canActivate: [authGuard] },
  { path: 'inicio', loadChildren: () => import('./home-module/home.module').then(m => m.HomeModule), canActivate: [homeGuard] },
];
```

### **4. ProfileComponent Mejorado**
**Archivo**: `profile-module/profile.component.ts`

**Validaciones Agregadas**:
- Verificación de autenticación en `ngOnInit()`
- Verificación de token válido
- Validación de parámetros de ruta
- Manejo seguro de propiedades null/undefined

**Funciones Auxiliares**:
```typescript
getRoleClass(role: string): string
getRoleLabel(role: string): string  
hasRoleCategory(role: string): boolean
```

### **5. Template Mejorado**
**Archivo**: `profile-module/profile.component.html`

**Mejoras**:
- Uso de safe navigation operator (`?.`)
- Validaciones `*ngIf` para evitar errores null
- Estado de carga y error
- Funciones auxiliares para TypeScript safety

## **Flujo de Funcionamiento**

### **Usuario No Autenticado Accede a Ruta Protegida**:
1. Usuario navega a `/perfil/123` sin estar logueado
2. `authGuard` intercepta la navegación
3. Verifica `identity` y `token` en `UserService`
4. Como no existen, redirige a `/` (home/landing)
5. No se carga el componente → No hay errores

### **Usuario Autenticado Accede a Perfil**:
1. Usuario navega a `/perfil/123` estando logueado
2. `authGuard` permite el acceso
3. `ProfileComponent` se carga
4. `ngOnInit()` verifica autenticación nuevamente
5. Carga datos del usuario de forma segura
6. Template renderiza con validaciones

### **Logout Automático por Token Invalidado**:
1. Token es invalidado por admin
2. `AuthInterceptor` detecta 401 con código específico
3. Limpia datos de sesión inmediatamente
4. Muestra mensaje específico
5. Redirige a login con recarga de página

## **Guards Disponibles**

| Guard | Propósito | Redirección |
|-------|-----------|-------------|
| `authGuard` | Rutas que requieren autenticación | `/` (home) |
| `homeGuard` | Módulo home | `/` (landing) |
| `landingGuard` | Páginas públicas (evita doble login) | `/inicio` |
| `adminGuard` | Panel administrativo | `/inicio` o `/` |
| `messageGuard` | Sistema de mensajes | `/` |
| `profileGuard` | Edición de perfil propio | `/perfil/[own_id]` |

## **Rutas Protegidas vs Públicas**

### **Rutas Públicas** (landingGuard):
- `/` - Landing page
- `/login` - Inicio de sesión
- `/registro` - Registro de usuario
- `/recuperar-pass` - Recuperación de contraseña
- `/buscar` - Búsqueda pública
- `/reset-password/:token` - Reset de contraseña

### **Rutas Protegidas** (authGuard):
- `/perfil/:id` - Perfiles de usuario
- `/mensajes/*` - Sistema de mensajes
- `/leccion/:id` - Lecciones
- `/admin/*` - Panel administrativo

### **Rutas Especiales** (homeGuard):
- `/inicio/*` - Módulo principal
- `/error/*` - Páginas de error
- `/notificaciones/*` - Notificaciones

## **Manejo de Errores**

### **Estados de Error en ProfileComponent**:
1. **Usuario no autenticado**: Redirección automática
2. **Usuario no encontrado**: Redirección a perfil propio
3. **Error de red**: Mensaje de error con botón reintentar
4. **Datos incompletos**: Valores por defecto seguros

### **Validaciones de Template**:
```html
<!-- Validación principal -->
<div *ngIf="identity && ownProfile">
  <!-- Contenido del perfil -->
</div>

<!-- Estado de carga/error -->
<div *ngIf="!identity || !ownProfile">
  <div class="spinner-border" *ngIf="!status"></div>
  <div *ngIf="status === 'error'" class="alert alert-danger">
    <!-- Mensaje de error -->
  </div>
</div>

<!-- Safe navigation -->
<img *ngIf="ownProfile?.picture" [src]="url + 'get-image-user/' + ownProfile.picture">
<span *ngIf="ownProfile?.role && hasRoleCategory(ownProfile.role.toString())">
  {{getRoleLabel(ownProfile.role.toString())}}
</span>
```

## **Integración con Sistema de Tokens**

### **AuthInterceptor Mejorado**:
- Limpieza inmediata de datos de sesión
- Uso de `UserService.clearIdentityAndToken()`
- Mensajes específicos por tipo de invalidación
- Recarga forzada de página tras logout

### **Códigos de Error Manejados**:
- `TOKEN_INVALIDATED`: Token específicamente invalidado por admin
- `TOKEN_OUTDATED`: Token anterior a actualización de usuario
- Sin código: Expiración normal de token

## **Configuración y Uso**

### **Agregar Guard a Nueva Ruta**:
```typescript
// En routing module
import { authGuard } from '../guards/auth.guard';

const routes: Routes = [
  { 
    path: 'nueva-ruta', 
    component: NuevoComponent, 
    canActivate: [authGuard] 
  }
];
```

### **Crear Nuevo Guard**:
```typescript
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { UserService } from '../services/user.service';

export const customGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const userService = inject(UserService);
  
  // Lógica de validación
  if (/* condición */) {
    return true;
  } else {
    return router.parseUrl('/ruta-alternativa');
  }
};
```

## **Beneficios del Sistema**

### **Seguridad**:
- ✅ Previene acceso no autorizado
- ✅ Validación en múltiples niveles
- ✅ Limpieza automática de sesión

### **Experiencia de Usuario**:
- ✅ Redirecciones automáticas fluidas
- ✅ Mensajes informativos específicos
- ✅ No más errores de propiedades null

### **Mantenimiento**:
- ✅ Código reutilizable
- ✅ Fácil agregar nuevas rutas protegidas
- ✅ Logging para debugging

### **Rendimiento**:
- ✅ Evita carga innecesaria de componentes
- ✅ Validación rápida O(1)
- ✅ Redirecciones eficientes

## **Troubleshooting**

### **Usuario Sigue Viendo Errores**:
1. Verificar que el guard esté aplicado en la ruta
2. Verificar imports en el módulo de routing
3. Verificar que `UserService` funcione correctamente

### **Redirecciones Infinitas**:
1. Verificar lógica de guards complementarios
2. Verificar que rutas de destino no tengan guards conflictivos
3. Verificar estado de `identity` y `token`

### **Guards No Se Ejecutan**:
1. Verificar que estén importados en `app.routing.ts`
2. Verificar sintaxis de `canActivate: [guardName]`
3. Verificar que el guard esté exportado correctamente 