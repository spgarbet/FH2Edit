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

const FAST_STEP_SHORT = "164";
const FAST_STEP_BYTE  = "8";

document.addEventListener('pointerdown', (e) =>
{
  if (e.target && e.target.type === 'range')
  {
    appState.slider = e.target;
    e.target.step   = appState.shiftKey ? "1" : 
      (Number(e.target.max) > 127 ? FAST_STEP_SHORT : FAST_STEP_BYTE);
  }
});

document.addEventListener('pointerup', () =>
{
  appState.slider = null;
});

window.addEventListener('keydown', (e) => 
{
  if (e.key === 'Shift')
  {
    appState.shiftKey=true;
    if (!appState.slider &&
        document.activeElement &&
        document.activeElement.type === 'range') 
    { document.activeElement.step = "1"; }
  }
});

window.addEventListener('keyup', (e) => 
{
  if (e.key === 'Shift')
  {
    appState.shiftKey=false;
    if (!appState.slider &&
       document.activeElement &&
       document.activeElement.type === 'range')
    { 
      document.activeElement.step =
        (Number(document.activeElement.step.max) > 127 ? 
          FAST_STEP_SHORT : 
          FAST_STEP_BYTE);
    }
  }
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
});
