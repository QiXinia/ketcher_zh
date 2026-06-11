interface PointerState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
  lastEventTime: number;
}

interface GestureCallbacks {
  onPinchZoom: (scaleFactor: number, centerX: number, centerY: number) => void;
  onTwoFingerPan: (dx: number, dy: number) => void;
  onTransform?: (
    scaleFactor: number,
    centerX: number,
    centerY: number,
    panDx: number,
    panDy: number,
  ) => void;
  onLongPress: (x: number, y: number, target: EventTarget | null) => void;
  onGestureStart?: () => void;
}

const LONG_PRESS_DURATION = 500;
const LONG_PRESS_TOLERANCE = 5;
const MIN_PINCH_DISTANCE = 20;
const POINTER_STALE_MS = 2000;
const STALE_CHECK_INTERVAL_MS = 1000;
const GESTURE_COOLDOWN_MS = 300;

export class GestureRecognizer {
  private pointers = new Map<number, PointerState>();
  private gestureActive = false;
  private gestureEndTime = 0;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private staleCheckTimer: ReturnType<typeof setInterval> | null = null;
  private initialPinchDistance = 0;
  private lastPinchDistance = 0;
  private lastMidpoint = { x: 0, y: 0 };
  private capturedPointers = new Set<number>();
  private transformScheduled = false;
  private callbacks: GestureCallbacks;
  private element: HTMLElement;

  constructor(element: HTMLElement, callbacks: GestureCallbacks) {
    this.element = element;
    this.callbacks = callbacks;

    element.addEventListener('pointerdown', this.onPointerDown);
    document.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('pointerup', this.onPointerUp);
    document.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('blur', this.releaseAll);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  isGestureActive(): boolean {
    if (this.gestureActive) return true;
    if (Date.now() - this.gestureEndTime < GESTURE_COOLDOWN_MS) return true;
    return false;
  }

  destroy() {
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
    document.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('blur', this.releaseAll);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.clearLongPress();
    this.stopStaleCheck();
    this.releaseAllCapturedPointers();
    this.pointers.clear();
  }

  private onVisibilityChange = () => {
    if (document.hidden) this.releaseAll();
  };

  private releaseAll = () => {
    this.pointers.clear();
    this.releaseAllCapturedPointers();
    this.gestureActive = false;
    this.clearLongPress();
    this.stopStaleCheck();
  };

  private releaseAllCapturedPointers() {
    for (const id of this.capturedPointers) {
      try {
        this.element.releasePointerCapture(id);
      } catch (_) {}
    }
    this.capturedPointers.clear();
  }

  private startStaleCheck() {
    if (this.staleCheckTimer) return;
    this.staleCheckTimer = setInterval(() => {
      this.evictStalePointers(-1);
      if (this.pointers.size === 0) this.stopStaleCheck();
    }, STALE_CHECK_INTERVAL_MS);
  }

  private stopStaleCheck() {
    if (this.staleCheckTimer) {
      clearInterval(this.staleCheckTimer);
      this.staleCheckTimer = null;
    }
  }

  private onPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') return;

    this.evictStalePointers(event.pointerId);

    this.pointers.set(event.pointerId, {
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      startTime: Date.now(),
      lastEventTime: Date.now(),
    });

    this.startStaleCheck();

    if (this.pointers.size === 1) {
      this.startLongPress(event);
    } else {
      this.clearLongPress();
    }

    if (this.pointers.size === 2) {
      this.gestureActive = true;
      this.callbacks.onGestureStart?.();
      for (const id of this.pointers.keys()) {
        try {
          this.element.setPointerCapture(id);
          this.capturedPointers.add(id);
        } catch (_) {}
      }
      this.initPinchState();
    }
  };

  private onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') return;
    const pointer = this.pointers.get(event.pointerId);
    if (!pointer) return;

    pointer.currentX = event.clientX;
    pointer.currentY = event.clientY;
    pointer.lastEventTime = Date.now();

    if (this.longPressTimer) {
      const dx = event.clientX - pointer.startX;
      const dy = event.clientY - pointer.startY;
      if (Math.sqrt(dx * dx + dy * dy) > LONG_PRESS_TOLERANCE) {
        this.clearLongPress();
      }
    }

    if (this.gestureActive && this.pointers.size === 2) {
      this.scheduleTransform();
    }
  };

  private onPointerUp = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') return;
    if (!this.pointers.has(event.pointerId)) return;

    this.pointers.delete(event.pointerId);
    this.clearLongPress();

    if (this.capturedPointers.has(event.pointerId)) {
      try {
        this.element.releasePointerCapture(event.pointerId);
      } catch (_) {}
      this.capturedPointers.delete(event.pointerId);
    }

    if (this.gestureActive && this.pointers.size < 2) {
      this.gestureActive = false;
      this.gestureEndTime = Date.now();
      this.releaseAllCapturedPointers();
      this.pointers.clear();
    }

    if (this.pointers.size === 0) {
      this.stopStaleCheck();
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

  private evictStalePointers(incomingId: number) {
    const now = Date.now();
    for (const [id, state] of this.pointers) {
      if (id !== incomingId && now - state.lastEventTime > POINTER_STALE_MS) {
        this.pointers.delete(id);
        if (this.capturedPointers.has(id)) {
          try {
            this.element.releasePointerCapture(id);
          } catch (_) {}
          this.capturedPointers.delete(id);
        }
      }
    }
    if (this.pointers.size < 2) {
      this.gestureActive = false;
    }
  }

  private initPinchState() {
    const pts = Array.from(this.pointers.values());
    const [a, b] = pts;
    const dist = this.getDistance(a, b);
    if (dist < MIN_PINCH_DISTANCE) {
      this.gestureActive = false;
      return;
    }
    this.initialPinchDistance = dist;
    this.lastPinchDistance = this.initialPinchDistance;
    this.lastMidpoint = this.getMidpoint(a, b);
  }

  private scheduleTransform() {
    if (this.transformScheduled) return;
    this.transformScheduled = true;
    requestAnimationFrame(() => {
      this.transformScheduled = false;
      if (this.gestureActive && this.pointers.size === 2) {
        this.handlePinchAndPan();
      }
    });
  }

  private handlePinchAndPan() {
    const pts = Array.from(this.pointers.values());
    const [a, b] = pts;

    const currentDistance = this.getDistance(a, b);
    if (currentDistance < MIN_PINCH_DISTANCE) return;

    const currentMidpoint = this.getMidpoint(a, b);

    const scaleFactor = currentDistance / this.lastPinchDistance;
    const panDx = currentMidpoint.x - this.lastMidpoint.x;
    const panDy = currentMidpoint.y - this.lastMidpoint.y;

    const hasScale = Math.abs(scaleFactor - 1) > 0.005;
    const hasPan = Math.abs(panDx) > 0.5 || Math.abs(panDy) > 0.5;

    if (this.callbacks.onTransform && (hasScale || hasPan)) {
      this.callbacks.onTransform(
        hasScale ? scaleFactor : 1,
        currentMidpoint.x,
        currentMidpoint.y,
        hasPan ? panDx : 0,
        hasPan ? panDy : 0,
      );
    } else {
      if (hasScale) {
        this.callbacks.onPinchZoom(
          scaleFactor,
          currentMidpoint.x,
          currentMidpoint.y,
        );
      }
      if (hasPan) {
        this.callbacks.onTwoFingerPan(panDx, panDy);
      }
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
