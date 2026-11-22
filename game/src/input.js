// Keyboard and mouse input controller for Velvet & Voltage.

import { CANVAS } from './config.js';

export function createInputController(canvas) {
  const keys = new Set();
  const pointer = { x: CANVAS.width * 0.5, y: CANVAS.height * 0.5 };
  const clicks = [];
  const actions = [];

  function toCanvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return { x: CANVAS.width * 0.5, y: CANVAS.height * 0.5 };
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS.width,
      y: ((clientY - rect.top) / rect.height) * CANVAS.height,
    };
  }

  window.addEventListener('keydown', (ev) => {
    const code = ev.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(code)) {
      ev.preventDefault();
    }
    if (!ev.repeat) {
      if (code === 'Digit1') actions.push('gadget:decoy');
      else if (code === 'Digit2') actions.push('gadget:emp');
      else if (code === 'Digit3') actions.push('gadget:smoke');
      else if (code === 'Tab' || code === 'KeyR') actions.push('toggle:recon');
      else if (code === 'KeyP' || code === 'Escape') actions.push('toggle:pause');
      else if (code === 'KeyM') actions.push('toggle:mute');
      else if (code === 'Enter' || code === 'Space') actions.push('confirm');
    }
    keys.add(code);
  });

  window.addEventListener('keyup', (ev) => {
    keys.delete(ev.code);
  });

  window.addEventListener('blur', () => {
    keys.clear();
  });

  canvas.addEventListener('mousemove', (ev) => {
    const pos = toCanvasCoords(ev.clientX, ev.clientY);
    pointer.x = pos.x;
    pointer.y = pos.y;
  });

  canvas.addEventListener('mousedown', (ev) => {
    if (ev.button !== 0) return;
    const pos = toCanvasCoords(ev.clientX, ev.clientY);
    pointer.x = pos.x;
    pointer.y = pos.y;
    clicks.push({ x: pos.x, y: pos.y });
  });

  return {
    sampleControls() {
      let moveX = 0;
      let moveY = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) moveX -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) moveX += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) moveY -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) moveY += 1;
      return {
        moveX,
        moveY,
        sneak: keys.has('ShiftLeft') || keys.has('ShiftRight'),
        sprint: keys.has('KeyF'),
        interact: keys.has('KeyE') || keys.has('Space'),
      };
    },
    consumeActions() {
      return actions.splice(0, actions.length);
    },
    consumeClicks() {
      return clicks.splice(0, clicks.length);
    },
    getPointer() {
      return { x: pointer.x, y: pointer.y };
    },
  };
}
