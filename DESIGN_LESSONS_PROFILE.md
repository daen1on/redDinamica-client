# 📚 Diseño del Módulo de Lecciones del Perfil
## Red Dinámica - Especificación Técnica

---

## 🎯 **Objetivo**
Crear un módulo de lecciones en el perfil de usuario que muestre de manera inteligente y configurable las lecciones en las que ha participado el usuario, respetando la privacidad y proporcionando valor tanto al propietario del perfil como a los visitantes.

---

## 📋 **Requerimientos Funcionales**

### **RF-01: Visualización Pública de Lecciones**
- **Descripción**: Mostrar lecciones completadas y públicas del usuario
- **Criterios de aceptación**:
  - Solo mostrar lecciones con estado `completed`
  - Solo mostrar lecciones marcadas como `visible: true`
  - Filtrar según configuración de privacidad del usuario
  - Mostrar información resumida y estadísticas

### **RF-02: Control de Privacidad**
- **Descripción**: Permitir al usuario controlar qué lecciones son visibles en su perfil
- **Criterios de aceptación**:
  - Configuración global: "Mostrar mis lecciones en mi perfil" (Sí/No)
  - Configuración por lección: Ocultar lecciones específicas
  - Configuración solo visible para el propietario del perfil

### **RF-03: Estadísticas y Resumen**
- **Descripción**: Mostrar métricas relevantes sobre la participación en lecciones
- **Criterios de aceptación**:
  - Total de lecciones completadas
  - Áreas de conocimiento en las que ha trabajado
  - Nivel de participación (autor, colaborador, revisor)
  - Puntuación promedio de sus lecciones (si aplicable)

### **RF-04: Vista Diferenciada por Tipo de Usuario**
- **Descripción**: Mostrar contenido diferente según quien visite el perfil
- **Criterios de aceptación**:
  - **Propietario del perfil**: Ve todas sus lecciones + opciones de configuración
  - **Visitantes**: Solo ven lecciones públicas según configuración de privacidad
  - **Administradores**: Acceso completo a todas las lecciones

---

## 🎨 **Diseño de la Interfaz**

### **Estructura Visual**

```
┌─────────────────────────────────────────────────────────────┐
│ 📚 Lecciones                                    [⚙️ Config] │
├─────────────────────────────────────────────────────────────┤
│ 📊 ESTADÍSTICAS                                              │
│ ┌─────────────┬─────────────┬─────────────┬─────────────┐   │
│ │ 📖 Total    │ 🎯 Áreas    │ 👨‍🏫 Rol     │ ⭐ Rating   │   │
│ │ 12 lecciones│ 5 áreas     │ Autor       │ 4.5/5       │   │
│ └─────────────┴─────────────┴─────────────┴─────────────┘   │
├─────────────────────────────────────────────────────────────┤
│ 🔍 FILTROS                                                   │
│ [📚 Todas] [✅ Completadas] [👨‍🏫 Como Autor] [🤝 Colaborador] │
│ [📊 Por Área ▼] [📅 Por Fecha ▼]                           │
├─────────────────────────────────────────────────────────────┤
│ 📖 LISTA DE LECCIONES                                        │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 🔵 [Área] Título de la Lección            👁️ 1.2k    │   │
│ │ 📅 Completada: 15/03/2024  👨‍🏫 Autor     ⭐ 4.8     │   │
│ │ 📝 Descripción breve de la lección...    [Ver más]   │   │
│ └───────────────────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 🟡 [Área] Otra Lección                   👁️ 856      │   │
│ │ 📅 Completada: 10/03/2024  🤝 Colaborador ⭐ 4.3    │   │
│ │ 📝 Otra descripción...                   [Ver más]   │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ [📖 Ver más lecciones]                                      │
└─────────────────────────────────────────────────────────────┘
```

### **Estados de la Interfaz**

#### **Estado 1: Propietario del Perfil**
- Botón de configuración visible (⚙️)
- Todas las lecciones listadas (públicas y privadas)
- Indicadores de visibilidad por lección
- Opciones para ocultar/mostrar lecciones individuales

#### **Estado 2: Visitante del Perfil**
- Sin botón de configuración
- Solo lecciones públicas visibles
- Información de contacto para colaboración (opcional)

#### **Estado 3: Sin Lecciones Públicas**
- Mensaje personalizado según el usuario
- **Propietario**: "Configura la visibilidad de tus lecciones"
- **Visitante**: "Este usuario no ha compartido lecciones públicamente"

#### **Estado 4: Lecciones Deshabilitadas**
- Mensaje: "El usuario ha deshabilitado la visualización de lecciones"

---

## 🛠️ **Especificaciones Técnicas**

### **Estructura de Datos Extendida**

#### **User Model (extensión)**
```typescript
interface User {
  // ... campos existentes
  lessonsPrivacySettings: {
    showLessonsInProfile: boolean;          // Configuración global
    hiddenLessonIds: string[];              // Lecciones específicamente ocultas
    allowCollaborationRequests: boolean;    // Permitir solicitudes de colaboración
  };
  lessonsStats?: {
    totalCompleted: number;
    totalAsAuthor: number;
    totalAsCollaborator: number;
    averageRating: number;
    knowledgeAreas: string[];
  };
}
```

#### **Lesson Model (extensión)**
```typescript
interface Lesson {
  // ... campos existentes
  visibility: {
    isPublic: boolean;                    // Visible para todos
    isVisibleInAuthorProfile: boolean;    // Visible en perfil del autor
    isVisibleInCollaboratorsProfile: boolean; // Visible en perfil de colaboradores
  };
  participants: {
    authorId: string;
    collaboratorIds: string[];
    reviewerIds: string[];
  };
  stats: {
    views: number;
    rating: number;
    completionDate?: Date;
  };
}
```

### **Nuevos Endpoints de API**

#### **GET /api/users/{userId}/lessons/public**
```typescript
// Obtener lecciones públicas de un usuario
interface PublicLessonsResponse {
  lessons: PublicLesson[];
  stats: UserLessonsStats;
  totalCount: number;
  hasMore: boolean;
}

interface PublicLesson {
  id: string;
  title: string;
  description: string;
  knowledgeAreas: KnowledgeArea[];
  userRole: 'author' | 'collaborator' | 'reviewer';
  completionDate: Date;
  rating: number;
  views: number;
  thumbnailUrl?: string;
}
```

#### **GET /api/users/{userId}/lessons/stats**
```typescript
// Obtener estadísticas de lecciones del usuario
interface UserLessonsStats {
  totalCompleted: number;
  totalAsAuthor: number;
  totalAsCollaborator: number;
  totalAsReviewer: number;
  averageRating: number;
  knowledgeAreas: Array<{
    name: string;
    count: number;
  }>;
  monthlyActivity: Array<{
    month: string;
    completedCount: number;
  }>;
}
```

#### **PUT /api/users/{userId}/lessons/privacy**
```typescript
// Actualizar configuración de privacidad
interface LessonsPrivacyUpdate {
  showLessonsInProfile: boolean;
  hiddenLessonIds: string[];
  allowCollaborationRequests: boolean;
}
```

### **Servicios Angular**

#### **UserLessonsService**
```typescript
@Injectable()
export class UserLessonsService {
  // Obtener lecciones públicas
  getPublicLessons(userId: string, page: number = 1, filters?: LessonFilters): Observable<PublicLessonsResponse>
  
  // Obtener estadísticas
  getLessonsStats(userId: string): Observable<UserLessonsStats>
  
  // Actualizar configuración de privacidad (solo propietario)
  updatePrivacySettings(settings: LessonsPrivacyUpdate): Observable<void>
  
  // Ocultar/mostrar lección específica
  toggleLessonVisibility(lessonId: string, visible: boolean): Observable<void>
}
```

---

## 🔒 **Sistema de Privacidad**

### **Niveles de Visibilidad**

1. **Público Total**: Lección visible para todos los usuarios
2. **Público Limitado**: Visible solo para usuarios registrados
3. **Privado**: Solo visible para el autor y colaboradores
4. **Oculto del Perfil**: Lección existe pero no aparece en el perfil

### **Configuraciones del Usuario**

#### **Configuración Global**
- **Mostrar lecciones en mi perfil** (Sí/No)
- **Permitir solicitudes de colaboración** (Sí/No)
- **Nivel de detalle público** (Básico/Detallado)

#### **Configuración por Lección**
- **Mostrar en mi perfil** (Sí/No)
- **Permitir comentarios públicos** (Sí/No)
- **Mostrar estadísticas** (Sí/No)

---

## 📱 **Responsive Design**

### **Desktop (>768px)**
- Vista de tarjetas en grid de 2 columnas
- Sidebar con estadísticas
- Filtros horizontales

### **Tablet (768px - 992px)**
- Vista de tarjetas en 1 columna
- Estadísticas en carrusel horizontal
- Filtros desplegables

### **Mobile (<768px)**
- Lista vertical compacta
- Estadísticas en cards apiladas
- Filtros en modal/drawer

---

## 🚀 **Funcionalidades Adicionales**

### **Fase 1 (MVP)**
- ✅ Mostrar lecciones completadas públicas
- ✅ Estadísticas básicas
- ✅ Configuración de privacidad global
- ✅ Vista diferenciada propietario/visitante

### **Fase 2 (Mejoras)**
- 🔄 Filtros avanzados
- 🔄 Configuración por lección individual
- 🔄 Sistema de insignias/logros
- 🔄 Integración con sistema de notificaciones

### **Fase 3 (Avanzado)**
- 🔮 Solicitudes de colaboración
- 🔮 Recomendaciones de lecciones
- 🔮 Análitica de impacto
- 🔮 Exportar CV académico

---

## 🧪 **Plan de Testing**

### **Casos de Prueba Principales**

1. **Privacidad**:
   - Usuario con lecciones ocultas
   - Usuario sin lecciones públicas
   - Configuración de privacidad por lección

2. **Rendimiento**:
   - Carga con muchas lecciones (>100)
   - Paginación eficiente
   - Cache de estadísticas

3. **UX/UI**:
   - Responsive en diferentes dispositivos
   - Estados de carga y error
   - Transiciones suaves

### **Tests Automatizados**
- Unit tests para servicios
- Integration tests para componentes
- E2E tests para flujos completos

---

## 📊 **Métricas de Éxito**

### **Métricas de Producto**
- **Adopción**: % de usuarios que habilitan lecciones en su perfil
- **Engagement**: Tiempo promedio en la sección de lecciones
- **Colaboración**: Número de solicitudes de colaboración generadas

### **Métricas Técnicas**
- **Rendimiento**: Tiempo de carga < 2 segundos
- **Disponibilidad**: 99.9% uptime
- **Errores**: < 1% error rate

---

## 🗓️ **Cronograma Estimado**

| Fase | Duración | Entregables |
|------|----------|-------------|
| **Análisis y Diseño** | 1 semana | Wireframes, API spec |
| **Backend API** | 2 semanas | Endpoints, tests |
| **Frontend Core** | 2 semanas | Componentes básicos |
| **UI/UX Polish** | 1 semana | Responsive, animaciones |
| **Testing & QA** | 1 semana | Tests, bug fixes |
| **Deploy & Monitor** | 0.5 semanas | Producción, métricas |

**Total estimado: 7.5 semanas**

---

## 📞 **Próximos Pasos**

1. **Revisar y aprobar** este documento de diseño
2. **Crear wireframes detallados** de las interfaces
3. **Definir API contracts** específicos
4. **Implementar backend** (modelos, endpoints)
5. **Desarrollar frontend** (componentes, servicios)
6. **Testing integral** y refinamiento
7. **Deploy y monitoreo**

---

*Documento creado el: Enero 2025*  
*Versión: 1.0*  
*Autor: Sistema de Desarrollo Red Dinámica*