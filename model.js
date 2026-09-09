// FH2Edit An Expert Sleepers FH-2 Configuration/Preset Edit Tool
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

// Render Functions can only READ sysex and WRITE to HTML Elements

function setPresetName(name)
{
  const offset = 12;
  const bytes  = new TextEncoder().encode(name.trimEnd());
  for (let i=0; i<16; ++i)
  {
    presetSysex[offset + i] =  i < bytes.length ? bytes[i] : 0;
  }
  
  document.getElementById("preset-name-status").textContent = "Preset: "+name.trimEnd();
}