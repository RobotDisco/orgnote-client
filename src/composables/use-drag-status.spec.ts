import { describe, it, expect } from 'vitest';
import { useDragStatus } from './use-drag-status';

describe('useDragStatus', () => {
  const createDragEvent = (type: string) => {
    return new DragEvent(type, {
      cancelable: true,
      bubbles: true,
    });
  };

  it('should have initial state false', () => {
    const { dragInProgress } = useDragStatus();
    expect(dragInProgress.value).toBe(false);
  });

  it('should set dragInProgress to true on drag enter', () => {
    const { dragInProgress, onDragEnter } = useDragStatus();
    const event = createDragEvent('dragenter');
    onDragEnter(event);
    expect(dragInProgress.value).toBe(true);
  });

  it('should keep dragInProgress true on subsequent drag enters', () => {
    const { dragInProgress, onDragEnter } = useDragStatus();
    onDragEnter(createDragEvent('dragenter'));
    onDragEnter(createDragEvent('dragenter'));
    expect(dragInProgress.value).toBe(true);
  });

  it('should set dragInProgress to false only when drag counter is 0', () => {
    const { dragInProgress, onDragEnter, onDragLeave } = useDragStatus();
    onDragEnter(createDragEvent('dragenter')); // counter 1
    onDragEnter(createDragEvent('dragenter')); // counter 2

    onDragLeave(createDragEvent('dragleave')); // counter 1
    expect(dragInProgress.value).toBe(true);

    onDragLeave(createDragEvent('dragleave')); // counter 0
    expect(dragInProgress.value).toBe(false);
  });

  it('should reset state', () => {
    const { dragInProgress, onDragEnter, reset } = useDragStatus();
    onDragEnter(createDragEvent('dragenter'));
    expect(dragInProgress.value).toBe(true);
    reset();
    expect(dragInProgress.value).toBe(false);
  });

  it('should prevent default on events', () => {
    const { onDragEnter, onDragLeave, onDragOver } = useDragStatus();

    let prevented = false;
    const mockEvent = {
        preventDefault: () => { prevented = true; },
        dataTransfer: {}
    } as unknown as DragEvent;

    onDragEnter(mockEvent);
    expect(prevented).toBe(true);

    prevented = false;
    onDragLeave(mockEvent);
    expect(prevented).toBe(true);

    prevented = false;
    onDragOver(mockEvent);
    expect(prevented).toBe(true);
  });
});
