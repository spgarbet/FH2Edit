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

// Models apply constraints and write to sysex for use in onchange events

/* Given that the parser uses 
  uLong()
  {
    const value = this.u32LE();
  
    return (value & 0x7f)            |
           ((value >> 1) & 0x3f80)   |
           ((value >> 2) & 0x1fc000) |
           ((value >> 3) & 0xfe00000);
  }
  
  What is inverse setPresetLong(i, v) look like? Does the call need rounding 
  from the html as it gets a number from onchange (this.value)?
*/


// Helpers (sysex safe writes)
function setPresetU8(i, v)    { presetSysex[i] = v & 0x7f; }
function setConfigU8(i, v)    { configSysex[i] = v & 0x7f; }
function setS8(i, v, f)       { f(i, v < 0 ? v + 128 : v); }
function setPresetS8(i, v)    { setS8(i, v, setPresetU8);  }
function setConfigS8(i, v)    { setS8(i, v, setConfigU8);  }
function setLong(i, v, f)
{
  v = Math.round(v);

  f(i,     v);
  f(i + 1, v >> 7);
  f(i + 2, v >> 14);
  f(i + 3, v >> 21);
}

function setPresetLong(i, v) { setLong(i, v, setPresetU8); }
function setConfigLong(i, v) { setLong(i, v, setConfigU8); }

  ////////////////////////////////////////////////////////
 // 
// Preset Model
//
function setPresetName(name)
{
  const offset = 12;
  const bytes  = new TextEncoder().encode(name.trimEnd());
  for (let i=0; i<16; ++i)
  {
    presetSysex[offset + i] =  i < bytes.length ? bytes[i] : 0;
  }
  
  elem("preset-name-status").textContent = "Preset: "+name.trimEnd();
}

function setTempo(v)     { setPresetULong(1376, v*10); }

function setSwing(i, v)  { setPresetU8(2528+i, v); }
function clampSwing(swing)
{
  for(let i=0; i<3; ++i)
  {
    let minimum = i+2;
    if(i > 0) { minimum = Math.max(minimum, swing[i-1]+1); }
    const maximum = i+7; // More constraints by type, but this is at least something
    if(swing[i] < minimum)
    {
      swing[i] = minimum;
      setSwing(i, minimum);
    }
    else if(swing[i] > maximum)
    {
      swing[i] = minimum;
      setSwing(i, minimum);
    }
  }
  return( swing );
}

  ////////////////////////////////////////////////////////
 // 
// Config Model
//
function setConfigName(name)
{
  const offset = 12;
  const bytes  = new TextEncoder().encode(name.trimEnd());
  for (let i=0; i<16; ++i)
  {
    configSysex[offset + i] =  i < bytes.length ? bytes[i] : 0;
  }
  
  elem("config-name-status").textContent = "Config: "+name.trimEnd();
}