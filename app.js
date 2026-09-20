// FH2Edit An Expert Sleepers Configuration/Preset Edit Tool
// Copyright (C) 2026 Shawn Garbett
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

const appState =
{
  webMIDI:    false,  // Is the browser compatible (false until proven)?
  connection: false,  // Is there a MIDI port that connects to an FH-2?
  compatible: false,  // Is the FH-2 a compatible version?
  presetReq:  false,  // Has a preset request been sent?
  configReq:  false,  // Has a config request been sent?
  slider:     null,   // Is a slider active?
  shiftKey:   false,  // Is the shift key depressed
  
  // LFO Animation
  animationFPS:     20,
  animationRunning: false,
  lastFrameTime:    0
};


function getFastStep(target) { return Number(target.max) > 127 ? 100 : 5; }

function snapValue(target)
{
  const step = appState.shiftKey ? 1 : getFastStep(target);
  const min  = Number(target.min) || 0;
  const max  = Number(target.max);
  const raw  = Number(target.value);
  
  if (raw > max - step/2) { target.value = max; console.log("Max triggered");     }
  else                    { target.value = min + Math.round((raw-min)/step)*step; }
}

document.addEventListener('pointerdown', (e) =>
{
  if (e.target && e.target.type === 'range') { appState.slider = e.target; }
});

document.addEventListener('pointerup', () => { appState.slider = null; });

document.addEventListener('keydown', (e) =>
{
  if (!e.target || e.target.type !== 'range') { return; }

  const isUp   = e.key === 'ArrowUp'   || e.key === 'ArrowRight';
  const isDown = e.key === 'ArrowDown' || e.key === 'ArrowLeft';

  if (!isUp && !isDown) { return; }

  e.preventDefault();

  const target = e.target;
  const step   = appState.shiftKey ? 1 : getFastStep(target);
  const min    = Number(target.min) || 0;
  const max    = Number(target.max);
  let value    = Number(target.value) + (isUp ? step : -step);

  value = Math.max(min, Math.min(max, value));

  target.value = value;
  target.dispatchEvent(new Event('input',  { bubbles: true }));
  target.dispatchEvent(new Event('change', { bubbles: true }));
});

window.addEventListener('keydown', (e) =>
{
  if (e.key === 'Shift') { appState.shiftKey = true; }
});

window.addEventListener('keyup', (e) =>
{
  if (e.key === 'Shift') { appState.shiftKey = false; }
});

document.addEventListener("DOMContentLoaded", () =>
{
  initTabs();
  initTooltips();
  buildOutputs();
  buildIconPicker();
  renderOutputs();
  renderOutputEditor();
  initMIDI();
  renderPreset(presetSysex);
  renderConfig(configSysex);
  initFileChooser();
  initLFO();
  initLfoUI()
  updateFPS();
  initMidiMapButtons();
});
