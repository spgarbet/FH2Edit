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

let midi = null;

async function initMIDI()
{
  log('Initializing MIDI');
  
  if (typeof navigator.requestMIDIAccess !== "function") { return false; }

  try
  {
    midi = await navigator.requestMIDIAccess({ sysex: true });
    return true;
  }
  catch (error)
  {
    console.error("Unable to access Web MIDI:", error);
    return false;
  }
}

async function initApplication()
{
  // Check for WebMIDI
  appState.compatible = await initMIDI();

  updateBrowserStatus();

  if (!appState.compatible) { log("ERROR: web-midi not enabled"); return; }

  // Continue initialization...
}