import { Directive, ElementRef, Output, EventEmitter, OnDestroy, AfterViewInit, Input } from '@angular/core';

@Directive({
  selector: '[appInfiniteScroll]',
  standalone: true
})
export class InfiniteScrollDirective implements AfterViewInit, OnDestroy {
  @Input() infiniteScrollDistance = 2;
  @Input() infiniteScrollThrottle = 50;
  @Output() scrolled = new EventEmitter<void>();

  private observer: IntersectionObserver | null = null;
  private throttleTimer: any = null;

  constructor(private el: ElementRef) {}

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.throttleEmit();
          }
        });
      },
      {
        root: null,
        rootMargin: `${this.infiniteScrollDistance * 100}px`,
        threshold: 0.1
      }
    );

    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.unobserve(this.el.nativeElement);
      this.observer.disconnect();
    }
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
    }
  }

  private throttleEmit(): void {
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
    }
    this.throttleTimer = setTimeout(() => {
      this.scrolled.emit();
    }, this.infiniteScrollThrottle);
  }
} 