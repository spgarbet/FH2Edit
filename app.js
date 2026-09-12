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
  shiftKey:   false   // Is the shift key depressed
};

const FAST_STEP = "164";
const SLOW_STEP = "1";

document.addEventListener('pointerdown', (e) =>
{
  if (e.target && e.target.type === 'range')
  {
    appState.slider = e.target;
    e.target.step   = appState.shiftKey ? SLOW_STEP : FAST_STEP;
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
    if(appState.slider)
      { appState.slider = SLOW_STEP; }
    else if (document.activeElement && document.activeElement.type === 'range') 
      { document.activeElement.step = SLOW_STEP; }
  }
});

window.addEventListener('keyup', (e) => 
{
  if (e.key === 'Shift')
  {
    appState.shiftKey=false;
    if(appState.slider)
      { appState.slider = FAST_STEP; }
    else if (document.activeElement && document.activeElement.type === 'range')
      { document.activeElement.step = FAST_STEP; }
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
});
