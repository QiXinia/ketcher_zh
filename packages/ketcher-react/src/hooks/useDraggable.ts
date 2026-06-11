import {
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

interface UseDraggableOptions {
  handleRef: RefObject<HTMLElement | null>;
  targetRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  onDragStart?: () => void;
}

interface Position {
  x: number;
  y: number;
}

interface UseDraggableReturn {
  position: Position;
  isDragging: boolean;
  resetPosition: () => void;
}

export function useDraggable({
  handleRef,
  targetRef,
  enabled,
  onDragStart,
}: UseDraggableOptions): UseDraggableReturn {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [ready, setReady] = useState(false);
  const draggingRef = useRef(false);
  const startPos = useRef<Position>({ x: 0, y: 0 });
  const startOffset = useRef<Position>({ x: 0, y: 0 });
  const positionRef = useRef<Position>({ x: 0, y: 0 });
  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;

  const resetPosition = useCallback(() => {
    setPosition({ x: 0, y: 0 });
    positionRef.current = { x: 0, y: 0 };
  }, []);

  useLayoutEffect(() => {
    if (!ready && handleRef.current && targetRef.current) {
      setReady(true);
    }
  });

  useEffect(() => {
    const handle = handleRef.current;
    const target = targetRef.current;
    if (!handle || !target || !enabled) return;

    const MIN_VISIBLE = 40;

    function clampPosition(pos: Position): Position {
      const rect = target!.getBoundingClientRect();
      const curPos = positionRef.current;
      const baseX = rect.left - curPos.x;
      const baseY = rect.top - curPos.y;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const minX = -(baseX + rect.width - MIN_VISIBLE);
      const maxX = vw - baseX - MIN_VISIBLE;
      const minY = -baseY;
      const maxY = vh - baseY - MIN_VISIBLE;

      return {
        x: Math.max(minX, Math.min(pos.x, maxX)),
        y: Math.max(minY, Math.min(pos.y, maxY)),
      };
    }

    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest('button, a, input, select, textarea')) return;
      e.preventDefault();
      handle!.setPointerCapture(e.pointerId);
      startPos.current = { x: e.clientX, y: e.clientY };
      startOffset.current = { ...positionRef.current };
      draggingRef.current = true;
      setIsDragging(true);
      onDragStartRef.current?.();
    }

    function onPointerMove(e: PointerEvent) {
      if (!draggingRef.current) return;
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      const newPos = clampPosition({
        x: startOffset.current.x + dx,
        y: startOffset.current.y + dy,
      });
      positionRef.current = newPos;
      setPosition(newPos);
    }

    function onPointerUp(e: PointerEvent) {
      if (!draggingRef.current) return;
      handle!.releasePointerCapture(e.pointerId);
      draggingRef.current = false;
      setIsDragging(false);
    }

    handle.addEventListener('pointerdown', onPointerDown);
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerUp);

    return () => {
      handle.removeEventListener('pointerdown', onPointerDown);
      handle.removeEventListener('pointermove', onPointerMove);
      handle.removeEventListener('pointerup', onPointerUp);
    };
  }, [handleRef, targetRef, enabled, ready]);

  return { position, isDragging, resetPosition };
}
