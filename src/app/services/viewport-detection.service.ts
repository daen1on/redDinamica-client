import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ViewportItem {
  id: string;
  element: HTMLElement;
  isVisible: boolean;
  intersectionRatio: number;
}

@Injectable({
  providedIn: 'root'
})
export class ViewportDetectionService {
  private observer: IntersectionObserver | null = null;
  private visibleItems = new Map<string, ViewportItem>();
  private visibilitySubject = new BehaviorSubject<Map<string, ViewportItem>>(new Map());
  
  public visibilityChanges$ = this.visibilitySubject.asObservable();

  constructor() {
    this.initializeObserver();
  }

  private initializeObserver(): void {
    // Configurar observer con diferentes thresholds para mayor precisión
    const options: IntersectionObserverInit = {
      root: null, // viewport
      rootMargin: '50px', // Detectar elementos 50px antes de que entren al viewport
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0] // Múltiples puntos de detección
    };

    this.observer = new IntersectionObserver((entries) => {
      let hasChanges = false;

      entries.forEach(entry => {
        const elementId = entry.target.getAttribute('data-viewport-id');
        if (!elementId) return;

        const isVisible = entry.isIntersecting && entry.intersectionRatio > 0.1; // Considerar visible si al menos 10% está visible
        const currentItem = this.visibleItems.get(elementId);

        // Solo actualizar si hay cambios significativos
        if (!currentItem || currentItem.isVisible !== isVisible || 
            Math.abs(currentItem.intersectionRatio - entry.intersectionRatio) > 0.1) {
          
          this.visibleItems.set(elementId, {
            id: elementId,
            element: entry.target as HTMLElement,
            isVisible,
            intersectionRatio: entry.intersectionRatio
          });
          
          hasChanges = true;
        }
      });

      // Solo emitir cambios si hubo modificaciones
      if (hasChanges) {
        this.visibilitySubject.next(new Map(this.visibleItems));
      }
    }, options);
  }

  /**
   * Observar un elemento para detectar su visibilidad
   */
  observeElement(element: HTMLElement, id: string): void {
    if (!this.observer || !element) {
      console.warn('Observer not initialized or element is null');
      return;
    }

    // Agregar atributo para identificar el elemento
    element.setAttribute('data-viewport-id', id);
    
    // Inicializar en el mapa como no visible
    this.visibleItems.set(id, {
      id,
      element,
      isVisible: false,
      intersectionRatio: 0
    });

    this.observer.observe(element);
  }

  /**
   * Dejar de observar un elemento
   */
  unobserveElement(element: HTMLElement, id: string): void {
    if (!this.observer || !element) return;

    this.observer.unobserve(element);
    this.visibleItems.delete(id);
    
    // Emitir cambios
    this.visibilitySubject.next(new Map(this.visibleItems));
  }

  /**
   * Obtener elementos visibles actualmente
   */
  getVisibleItems(): ViewportItem[] {
    return Array.from(this.visibleItems.values()).filter(item => item.isVisible);
  }

  /**
   * Verificar si un elemento específico está visible
   */
  isElementVisible(id: string): boolean {
    const item = this.visibleItems.get(id);
    return item ? item.isVisible : false;
  }

  /**
   * Obtener elementos que están al menos parcialmente visibles (>25%)
   */
  getPartiallyVisibleItems(): ViewportItem[] {
    return Array.from(this.visibleItems.values())
      .filter(item => item.intersectionRatio > 0.25);
  }

  /**
   * Obtener elementos que están completamente visibles (>75%)
   */
  getFullyVisibleItems(): ViewportItem[] {
    return Array.from(this.visibleItems.values())
      .filter(item => item.intersectionRatio > 0.75);
  }

  /**
   * Limpiar todas las observaciones
   */
  clearAll(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.visibleItems.clear();
    this.visibilitySubject.next(new Map());
  }

  /**
   * Destruir el servicio
   */
  destroy(): void {
    this.clearAll();
    this.observer = null;
    this.visibilitySubject.complete();
  }

  /**
   * Obtener estadísticas de visibilidad
   */
  getVisibilityStats(): {
    total: number;
    visible: number;
    partiallyVisible: number;
    fullyVisible: number;
  } {
    const allItems = Array.from(this.visibleItems.values());
    
    return {
      total: allItems.length,
      visible: allItems.filter(item => item.isVisible).length,
      partiallyVisible: allItems.filter(item => item.intersectionRatio > 0.25).length,
      fullyVisible: allItems.filter(item => item.intersectionRatio > 0.75).length
    };
  }
} 