interface PointerState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
}

interface GestureCallbacks {
  onPinchZoom: (scaleFactor: number, centerX: number, centerY: number) => void;
  onTwoFingerPan: (dx: number, dy: number) => void;
  onLongPress: (x: number, y: number, target: EventTarget | null) => void;
}

const LONG_PRESS_DURATION = 500;
const LONG_PRESS_TOLERANCE = 5;

export class GestureRecognizer {
  private pointers = new Map<number, PointerState>();
  private gestureActive = false;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private initialPinchDistance = 0;
  private lastPinchDistance = 0;
  private lastMidpoint = { x: 0, y: 0 };
  private callbacks: GestureCallbacks;
  private element: HTMLElement;

  constructor(element: HTMLElement, callbacks: GestureCallbacks) {
    this.element = element;
    this.callbacks = callbacks;

    element.addEventListener('pointerdown', this.onPointerDown);
    element.addEventListener('pointermove', this.onPointerMove);
    element.addEventListener('pointerup', this.onPointerUp);
    element.addEventListener('pointercancel', this.onPointerUp);
  }

  isGestureActive(): boolean {
    return this.gestureActive;
  }

  destroy() {
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    this.element.removeEventListener('pointermove', this.onPointerMove);
    this.element.removeEventListener('pointerup', this.onPointerUp);
    this.element.removeEventListener('pointercancel', this.onPointerUp);
    this.clearLongPress();
  }

  private onPointerDown = (event: PointerEvent) => {
    this.pointers.set(event.pointerId, {
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      startTime: Date.now(),
    });

    if (this.pointers.size === 1 && event.pointerType === 'touch') {
      this.startLongPress(event);
    } else {
      this.clearLongPress();
    }

    if (this.pointers.size === 2) {
      this.gestureActive = true;
      this.initPinchState();
    }
  };

  private onPointerMove = (event: PointerEvent) => {
    const pointer = this.pointers.get(event.pointerId);
    if (!pointer) return;

    pointer.currentX = event.clientX;
    pointer.currentY = event.clientY;

    if (this.longPressTimer) {
      const dx = event.clientX - pointer.startX;
      const dy = event.clientY - pointer.startY;
      if (Math.sqrt(dx * dx + dy * dy) > LONG_PRESS_TOLERANCE) {
        this.clearLongPress();
      }
    }

    if (this.gestureActive && this.pointers.size === 2) {
      this.handlePinchAndPan();
    }
  };

  private onPointerUp = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId);
    this.clearLongPress();

    if (this.pointers.size < 2) {
      this.gestureActive = false;
    }
  };

  private startLongPress(event: PointerEvent) {
    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = null;
      const pointer = this.pointers.get(event.pointerId);
      if (!pointer) return;
      const dx = pointer.currentX - pointer.startX;
      const dy = pointer.currentY - pointer.startY;
      if (Math.sqrt(dx * dx + dy * dy) <= LONG_PRESS_TOLERANCE) {
        this.callbacks.onLongPress(
          pointer.currentX,
          pointer.currentY,
          event.target,
        );
      }
    }, LONG_PRESS_DURATION);
  }

  private clearLongPress() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private initPinchState() {
    const pts = Array.from(this.pointers.values());
    const [a, b] = pts;
    this.initialPinchDistance = this.getDistance(a, b);
    this.lastPinchDistance = this.initialPinchDistance;
    this.lastMidpoint = this.getMidpoint(a, b);
  }

  private handlePinchAndPan() {
    const pts = Array.from(this.pointers.values());
    const [a, b] = pts;

    const currentDistance = this.getDistance(a, b);
    const currentMidpoint = this.getMidpoint(a, b);

    const scaleFactor = currentDistance / this.lastPinchDistance;
    if (Math.abs(scaleFactor - 1) > 0.01) {
      this.callbacks.onPinchZoom(
        scaleFactor,
        currentMidpoint.x,
        currentMidpoint.y,
      );
    }

    const dx = currentMidpoint.x - this.lastMidpoint.x;
    const dy = currentMidpoint.y - this.lastMidpoint.y;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      this.callbacks.onTwoFingerPan(dx, dy);
    }

    this.lastPinchDistance = currentDistance;
    this.lastMidpoint = currentMidpoint;
  }

  private getDistance(a: PointerState, b: PointerState): number {
    const dx = a.currentX - b.currentX;
    const dy = a.currentY - b.currentY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getMidpoint(
    a: PointerState,
    b: PointerState,
  ): { x: number; y: number } {
    return {
      x: (a.currentX + b.currentX) / 2,
      y: (a.currentY + b.currentY) / 2,
    };
  }
}
