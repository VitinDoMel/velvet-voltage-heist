// Bootstraps Velvet & Voltage, manages screen flow, audio events, and deterministic screenshot mode.

import { createAudioEngine } from './audio.js';
import { LEVEL_DEFS } from './levels.js';
import { STEP } from './config.js';
import { createInputController } from './input.js';
import {
  createRenderer,
  hitTestGadgetCard,
  SCREEN_CAUGHT,
  SCREEN_DEBRIEF,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
} from './renderer.js';
import { stageScreenshot } from './shots.js';
import { createHeistWorld, stepHeistWorld, useWorldGadget } from './world.js';

const MAX_FRAME_DT = 0.25;

const params = new URLSearchParams(window.location.search);
const shotParam = params.get('shot');

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const renderer = createRenderer(canvas);

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function runScreenshotMode(shotName) {
  const staged = stageScreenshot(shotName);
  let frames = 0;
  function renderShotFrame() {
    renderer.draw(staged.state, staged.screen);
    frames += 1;
    if (frames < 2) requestAnimationFrame(renderShotFrame);
    else window.__shotReady = true;
  }
  requestAnimationFrame(renderShotFrame);
}

function runInteractiveGame() {
  const input = createInputController(canvas);
  const audio = createAudioEngine();

  let levelIndex = 0;
  let state = createHeistWorld(levelIndex);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let lastTime = performance.now();

  function loadWing(idx) {
    levelIndex = idx % LEVEL_DEFS.length;
    state = createHeistWorld(levelIndex);
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Infiltrating ${state.level.def.name}.`);
  }

  function processActionsAndClicks() {
    const actions = input.consumeActions();
    const clicks = input.consumeClicks();
    const pointer = input.getPointer();

    if (actions.length > 0 || clicks.length > 0) audio.unlock();

    for (let i = 0; i < actions.length; i += 1) {
      const act = actions[i];
      if (act === 'toggle:mute') {
        const muted = audio.toggleMute();
        announce(muted ? 'Audio muted.' : 'Audio active.');
      } else if (act === 'confirm') {
        if (screen === SCREEN_TITLE || screen === SCREEN_CAUGHT) loadWing(levelIndex);
        else if (screen === SCREEN_DEBRIEF) loadWing(levelIndex + 1);
        else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
      } else if (act === 'toggle:pause') {
        if (screen === SCREEN_PLAY) screen = SCREEN_PAUSED;
        else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
      } else if (act === 'toggle:recon' && screen === SCREEN_PLAY) {
        state.reconMode = !state.reconMode;
      } else if (act.startsWith('gadget:') && screen === SCREEN_PLAY) {
        const slot = act.split(':')[1];
        if (useWorldGadget(state, slot, pointer.x, pointer.y)) {
          audio.playEvent(slot);
        }
      }
    }

    for (let i = 0; i < clicks.length; i += 1) {
      const click = clicks[i];
      if (screen === SCREEN_TITLE || screen === SCREEN_CAUGHT) {
        loadWing(levelIndex);
        break;
      }
      if (screen === SCREEN_DEBRIEF) {
        loadWing(levelIndex + 1);
        break;
      }
      if (screen === SCREEN_PLAY) {
        const cardKey = hitTestGadgetCard(click.x, click.y);
        const slot = cardKey ?? 'decoy';
        if (useWorldGadget(state, slot, click.x, click.y)) {
          audio.playEvent(slot);
        }
      }
    }
  }

  function tick() {
    if (screen !== SCREEN_PLAY) return;
    const controls = input.sampleControls();
    const events = stepHeistWorld(state, controls, STEP);
    for (let i = 0; i < events.length; i += 1) {
      audio.playEvent(events[i]);
    }
    audio.tickAlarm(state.alarm, state.elapsed);
    if (state.caught) {
      screen = SCREEN_CAUGHT;
      announce(`Lockdown triggered by ${state.lastSpotter ?? 'security'}.`);
    } else if (state.extracted) {
      screen = SCREEN_DEBRIEF;
      announce(`Heist complete. Extracted $${state.lootCollected.toLocaleString()}.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - lastTime) / 1000, MAX_FRAME_DT);
    lastTime = now;
    processActionsAndClicks();
    if (screen === SCREEN_PLAY) {
      accumulator += dt;
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        tick();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(state, screen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) screen = SCREEN_PAUSED;
  });

  announce('Velvet and Voltage. Press Space or click to begin heist.');
  requestAnimationFrame(frame);
}

if (shotParam) runScreenshotMode(shotParam);
else runInteractiveGame();
