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

// Helpers (sysex safe writes)
function setShort(i, v, f)
{
  v = Math.round(v);
  
  f(i,     v);
  f(i + 1, v >> 7);
}
function setSShort(i, v, f)
{
  v = Math.round(v);

  if (v < 0) { v += 16384; }

  f(i,     v);
  f(i + 1, v >> 7);
}
function setLong(i, v, f)
{
  v = Math.round(v);

  f(i,     v);
  f(i + 1, v >> 7);
  f(i + 2, v >> 14);
  f(i + 3, v >> 21);
}

function setPresetU8(i, v)    { presetSysex[i] = v & 0x7f;   }
function setConfigU8(i, v)    { configSysex[i] = v & 0x7f;   }
function setS8(i, v, f)       { f(i, v < 0 ? v + 128 : v);   }
function setPresetS8(i, v)    { setS8(i, v, setPresetU8);    }
function setConfigS8(i, v)    { setS8(i, v, setConfigU8);    }
function setPresetShort(i, v) { setShort(i, v, setPresetU8); }
function setConfigShort(i, v) { setShort(i, v, setConfigU8); }
function setPresetLong(i, v)  { setLong( i, v, setPresetU8); }
function setConfigLong(i, v)  { setLong( i, v, setConfigU8); }

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

function setTempo(v)     { setPresetLong(1376, v*10); }

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

function disableLfo(i)
{
  const loc = 160 + 16*i;
  setPresetShort(loc ,  0);  // Level off
  setPresetShort(loc+2, 0); 
  setPresetU8(loc+ 4,  24);
  setPresetU8(loc+ 5,   1);
  setPresetU8(loc+ 6,   0);
  setPresetU8(loc+ 7,   0);
  setPresetU8(loc+ 8,   0);
  setPresetU8(loc+ 9,  64);
  setPresetU8(loc+10,  64);
  setPresetU8(loc+11,   0);
  setPresetU8(loc+12,   0);
  setPresetU8(loc+13,   0);
  setPresetU8(loc+14,   1);
  setPresetU8(loc+15,   0);
  setPresetShort(32+2*i, 8192); // Center
  
  clearMappings("lfo", i);
}

function initLfo(i)
{
  const loc = 160 + 16*i;
  disableLfo(i); 
  setPresetShort(loc,  16383); // Level is maximum

  setPresetShort(loc + 2,  0); // Speed off
  setPresetU8(   loc + 14, 1); // use base/mult
  setPresetU8(   loc + 4, 24); // base
  setPresetU8(   loc + 5,  1); // mult
}

function setLfoReset(index, type, v1, v2)
{
  const loc = 3468 + 2*index;
  
  setConfigU8(loc  , (type << 4) | (v1 & 0x0f));
  setConfigU8(loc+1, v2);
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

function getConfigU8(loc)
{
  return configSysex[loc];
}

function setCVMidiType(value, letter)
{
  value       = Number(value);
  const base  = letter === 'X' ? 3596 : 3604;
  const flags = configSysex[base];

  if(value < 0)
  {
    setConfigU8(base, flags & 0x7e);
    return;
  }
  
  const typeChannel   = configSysex[base + 1];
  const channel       = typeChannel & 0x0f;
  
  setConfigU8(base,     flags | 0x01);
  setConfigU8(base + 1, (value << 4) | channel);
}

function setCVMidiChannel(value, letter)
{
  value = Number(value);

  const base = letter === "X" ? 3596 : 3604;
  const typeChannel = configSysex[base + 1];

  setConfigU8(base + 1, (typeChannel & 0xf0) | (value & 0x0f));
}

function setCVMidiOut(value, letter, flag)
{
  const base = letter === "X" ? 3596 : 3604;
  const bits =
  {
    outI: 1 << 1,
    outA: 1 << 2,
    outC: 1 << 3,
    outD: 1 << 4,
    outS: 1 << 5
  };

  const bit = bits[flag];

  if (bit === undefined) { return; }

  const flags = configSysex[base];

  setConfigU8(base, value ? flags | bit : flags & ~bit);
}

function disableClock(i)
{
  const loc = 2048+8*i;
  setConfigU8(loc,   0);
  setConfigU8(loc+1, 1);
  setConfigU8(loc+2, 1);
  setConfigU8(loc+3, 0);
  setConfigU8(loc+4, 0);
  setConfigU8(loc+5, 0);
}

  /////////////////////////////////////////////////////////////////////
 //
// Shift Register Random

function disableSrr(index)
{
  let loc = 3708+7*index;
  setConfigU8(loc    ,    0);  // cv
  setConfigU8(loc + 1,    0);  // change
  setConfigU8(loc + 2,    0);  // trigger
  setConfigU8(loc + 3,    0);  // clock
  setConfigU8(loc + 4,    0);  // notes
  setConfigU8(loc + 5,    0);  // channel
  setConfigU8(loc + 6,    0);  // MIDI out
  setConfigU8(4136+index, 3);  // Addendum flags
  
  loc = 2400 + 8*index;
  
  setPresetU8(loc    ,     0);  // STOP
  setPresetU8(loc + 1,     8);  // 8 bits is a good start
  setPresetU8(loc + 2,    64);  // Make it random
  setPresetU8(loc + 3,     6);  // Every sixth 24ppqn
  setPresetU8(loc + 4,   127);  // Full blast
  setPresetU8(loc + 5,     0);  // No scale
  setPresetU8(loc + 6,    12);  // Is 12 the default?
  setPresetU8(loc + 7,     0);  // Gate length set from global
  
  clearMappings("srr", index);
}

function initSrr(index, output)
{
  disableSrr(index);
  setConfigU8(3708+7*index, output+1); // cv output
  setPresetU8(2400+8*index, 1       ); // FORWARD
}

function initMidi(index, output)
{
  disableMidi(index);
  setMidiCVValue( 0, 1,      index);    // Enable it
  setMidiCVValue(11, output, index);    // Map to right output
  setMidiCVValue(12, 0,      index);    // Turn off stride as well
}

function disableMidi(index)
{
  setMidiCVValue( 0, 0, index); // Disable it
  clearMappings("mcv",  index);
  clearMappings("mcv2", index);
  clearMappings("mcv3", index);
}

function initClock(index, output)
{
  setConfigU8(2148+8*index, 1);
  setConfigU8(2152, output); // Set Output
}

function disableEnvelope(index)
{
  console.log("disableEnvelope", index)
}

function initEnvelope(index)
{
  console.log("initEnvelope", index)
}

function disableArp(index)
{
  console.log("disableArp", index)
}

function initArp(index)
{
  console.log("initArp", index)
}

function disableEuc(index)
{
  console.log("disableEuc", index)
}

function initEuc(index)
{
  console.log("initEuc", index)
}