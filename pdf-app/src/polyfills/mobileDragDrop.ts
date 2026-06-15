import { polyfill } from 'mobile-drag-drop';
import { scrollBehaviourDragImageTranslateOverride } from 'mobile-drag-drop/scroll-behaviour';

export function setupMobileDragDrop() {
  if (typeof window === 'undefined') {
    return;
  }

  polyfill({
    dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride,
  });

  window.addEventListener('touchmove', () => {});
}
