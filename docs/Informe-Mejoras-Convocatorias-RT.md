## Mejoras de Convocatorias con Actualización en Vivo y Estabilización de Modales

Autores: Equipo RedDinámica

Fecha: Octubre 2025

Resumen—Este documento describe las mejoras implementadas para: (1) habilitar actualización casi en tiempo real del estado de las convocatorias y sus interesados; (2) estabilizar el flujo de modales de “Ver detalles” y “Retirarse” que ocasionaban cierres inesperados y corrupción del formulario; y (3) asegurar consistencia de datos después de crear/editar convocatorias. Se adoptó un enfoque de sincronización periódica (polling ligero) y se eliminaron modales anidados, reemplazándolos por confirmación nativa para reducir complejidad y evitar condiciones de carrera.

Palabras clave—Angular, UX, Polling, Bootstrap Modal, Consistencia de datos, Observabilidad.

### I. Introducción

Las convocatorias permiten a los usuarios unirse a grupos de desarrollo de lecciones. La ausencia de actualización en vivo y la coexistencia de modales anidados provocaban: (a) vistas desactualizadas al unirse/retirarse otros usuarios, (b) cierres inesperados de modales, y (c) formularios “rotos” (pérdida de bindings) al cerrar/abrir detalles después de cambios.

### II. Problema Planteado

- Falta de actualización en tiempo real de la lista de interesados dentro del modal de detalles y el listado de convocatorias.
- Modal de “Retirarse” anidado dentro del modal de “Ver detalles”, causando cierres y estados inconsistentes.
- Al cerrar “Ver detalles” tras cambios, la pantalla quedaba con datos obsoletos, haciendo desaparecer integrantes o rompiendo el formulario.

### III. Metodología / Diseño de la Solución

1) Sincronización periódica (polling):
   - Activar un refresco no intrusivo cada N segundos para consultar el estado de la lección/convocatorias, únicamente mientras la vista/modales están activos.
   - Forzar un `refetch` inmediato al completar acciones críticas (unirse/retirarse, crear/editar convocatoria).

2) Simplificación de UX de modales:
   - Eliminar el modal secundario de confirmación dentro de “Ver detalles” y sustituirlo por confirmación nativa (`confirm(...)`).
   - Al cerrar “Ver detalles”, refrescar el listado para restaurar consistencia y evitar formularios rotos.

3) Robustez post-envío:
   - Tras guardar/crear convocatoria, iniciar sincronización de estado para evitar latencia perceptible en la UI.

### IV. Implementación

- Archivo `src/app/home-module/lessons/details/details-call.component.ts`:
  - Se implementó `OnInit`, `OnDestroy`, `OnChanges` con temporizador de polling (5s) que invoca `getLesson` para refrescar `interested` mientras el modal esté visible.
  - Se agregó `refreshLesson(lessonId)` y reinicio del temporizador al cambiar la `lesson`.
  - Tras `editLesson` (unirse/retirarse), se hace `refetch` inmediato para asegurar que los interesados vengan populados.
  - Se añadió `onLeaveClick(...)` con confirmación nativa para retirar al usuario sin modal secundario.

- Archivo `src/app/home-module/lessons/details/details-call.component.html`:
  - Se eliminó el modal anidado de confirmación de “Retirarse”. El botón ahora dispara `onLeaveClick(...)`.

- Archivo `src/app/home-module/lessons/calls/calls.component.ts`:
  - Se implementó `OnDestroy` y un temporizador de polling (7s) para refrescar el listado de convocatorias.
  - Al cerrar el modal “Ver detalles”, se invoca `actualPage()` para recuperar el estado consistente del listado.
  - En `openLeaveModal(...)`, se añadió prevención de “hide” no intencionado (`hidePrevented.bs.modal`).
  - Tras `editLesson(...)` (add/remove), se reemplaza en memoria la lección actualizada para feedback inmediato y se recargan listados auxiliares.

- Archivo `src/app/admin-module/lessons/add-call/add-call.component.ts`:
  - Se implementó `OnDestroy` y métodos `startRealtimeSync(...)`/`refreshLesson(...)` para sincronizar el estado de la lección después de crear/editar convocatoria.

### V. Resultados y Métricas Esperadas

- Consistencia visual: los interesados aparecen/desaparecen sin necesidad de recargar manualmente.
- Estabilidad de modales: se evita el cierre inesperado y la corrupción del formulario al no anidar modales.
- Percepción de “tiempo real”: con intervalos de 5–7 segundos se reduce la brecha de actualización en escenarios de concurrencia.

### VI. Limitaciones y Trabajo Futuro

- El polling introduce tráfico periódico; se recomienda pausar en segundo plano (Page Visibility API) o usar WebSockets/Server-Sent Events si el backend lo permite para verdaderas actualizaciones “push”.
- Ajustar intervalos según carga y criticidad de la vista, o adaptar un backoff exponencial cuando no hay cambios.

### VII. Conclusiones

Las mejoras combinan un enfoque pragmático de sincronización periódica con simplificación de la experiencia de usuario para resolver problemas de consistencia y estabilidad observados. Se obtiene una interfaz más confiable sin introducir dependencias complejas, a la vez que se deja una ruta clara para evolucionar a notificaciones en tiempo real basadas en eventos.

### Referencias

1) Documentación de Angular: Component lifecycle hooks (OnInit/OnDestroy/OnChanges).
2) Bootstrap Modal: manejo de instancias y eventos (incl. `hidePrevented.bs.modal`).
3) Patrones de UX para confirmaciones destructivas: confirmación nativa vs. modales anidados.

### Apéndice A. Resumen de Cambios por Archivo

- `src/app/home-module/lessons/details/details-call.component.ts`:
  - + Polling (5s), + `refreshLesson`, + `onLeaveClick`, refetch post unirse/retirarse.
- `src/app/home-module/lessons/details/details-call.component.html`:
  - − Modal anidado de “Retirarse”; + confirmación nativa.
- `src/app/home-module/lessons/calls/calls.component.ts`:
  - + Polling (7s), + refresh tras cerrar detalles, + prevención de cierre inesperado en modal de retirarse, + actualización inmediata en memoria.
- `src/app/admin-module/lessons/add-call/add-call.component.ts`:
  - + Polling post-guardar/crear para sincronizar el estado de la lección.


