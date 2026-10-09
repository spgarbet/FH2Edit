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

  ////////////////////////////////////////////////////////
 // 
// LFO

function disableLfo(i)
{
  const loc = 160 + 16*i;
  
  setPresetShort(loc    , 0);  // Level off
  setPresetShort(loc + 2, 0); 
  
  setPresetU8(loc +  4,  24);
  setPresetU8(loc +  5,   1);
  setPresetU8(loc +  6,   0);
  setPresetU8(loc +  7,   0);
  setPresetU8(loc +  8,   0);
  setPresetU8(loc +  9,  64);
  setPresetU8(loc + 10,  64);
  setPresetU8(loc + 11,   0);
  setPresetU8(loc + 12,   0);
  setPresetU8(loc + 13,   0);
  setPresetU8(loc + 14,   1);
  setPresetU8(loc + 15,   0);
  
  setPresetShort(32 + 2*i, 8192); // Center
  
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

function lfoActive(index, mappings=allMappings())
{ 
  return locateMapping("lfo", "LFO", index, mappings) !== null ||
         locateMapping("lfo", "DC",  index, mappings) !== null ||
         presetSysex[160 + 16*index] !== 0                   ||
         presetSysex[161 + 16*index] !== 0;
}


  ////////////////////////////////////////////////////////
 // 
// Config Model

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

  if (bit === undefined) { console.error("Undefined flag"); return; }

  const flags = configSysex[base];

  setConfigU8(base, value ? flags | bit : flags & ~bit);
}

function setOutputRange(index, value)
{
  setConfigU8(36 + index, Number(value));
}

function setOutputLowGate(index, value)
{
  setConfigShort(2404 + 2*index, Number(value));
}

function setOutputHighGate(index, value)
{
  setConfigShort(2406 + 2*index, Number(value));
}

  /////////////////////////////////////////////////////////////////////
 //
// Shift Register Random

function setConfigSrrValue(offset, value, index=selectedSrrIndex)
{
  setConfigU8(3708 + 7*index + offset, Number(value));
}

function setPresetSrrValue(offset, value, index=selectedSrrIndex)
{ 
  setPresetU8(2400 + 8*index + offset, Number(value));
}

function setConfigSrrAddValue(bit, disabled, index)
{
  const loc   = 4136 + index;
  const flags = configSysex[loc];

  setConfigU8(loc, disabled ? flags | (1 << bit) : flags & ~(1 << bit));
}

function setSrrOut(value, index)
{
  setConfigSrrValue(0, value+1, index);
}

function setSrrChange(value, index)
{
  setConfigSrrValue(1, value < 0 ? 0 : value, index);
  setConfigSrrAddValue(0, value < 0, index);
}

function setSrrTrigger(value, index)
{
  setConfigSrrValue(2, value < 0 ? 0 : value, index);
  setConfigSrrAddValue(1, value < 0, index);
}


// Called like setSrrMidiOut(3,this.checked) from html checkbox
function setSrrMidiOut(bit, value, index=selectedSrrIndex)
{
  const loc   = 3716 + 7*index;
  const flags = configSysex[loc];
  
  setConfigU8(loc, value ? flags | (1 << bit) : flags & ~(1 << bit));
}

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

function srrActive(index)
{
// FIXME: This should include the "Direction != 0" or a mapping to direction exists.
  return computeSrrOutputs(index).length > 0;
}

  /////////////////////////////////////////////////////////////////////
 //
//  Midi to CV Converter values by indexed offset

function setMidiCVValue(offset, value, index=selectedIcon.index)
{
  setConfigU8(100+offset+32*index, value);
}

function disableMidi(index)
{
  setMidiCVValue( 0, 0, index); // Disable it
  clearMappings("mcv",  index);
  clearMappings("arp",  index);
  clearMappings("env",  index);
  clearMappings("envs", index);
}

function initMidi(index, output)
{
  disableMidi(index);
  setMidiCVValue( 0, 1,      index);    // Enable it
  setMidiCVValue(11, output, index);    // Map to right output
  setMidiCVValue(12, 0,      index);    // Turn off stride as well
}


function setScalaValue(offset, value)
{
  setPresetU8(1248 + offset + 4*selectedIcon.index, value);
}

function midiActive(index)
{
  return configSysex[100 + 32*index] > 0;
}

  /////////////////////////////////////////////////////////////////////
 //
// Clock


function disableClock(i)
{
  const loc = 2148+8*i;
  setConfigU8(loc,   0);
  setConfigU8(loc+1, 1);
  setConfigU8(loc+2, 1);
  setConfigU8(loc+3, 0);
  setConfigU8(loc+4, 0);
  setConfigU8(loc+5, 0);
}

function initClock(index, output)
{
  setConfigU8(2148+8*index, 1);
  setConfigU8(2152, output); // Set Output
}

function clockActive(index)
{
  return configSysex[2148 + 8*index] > 0;
}

function clockOutput(index)
{
  return configSysex[2152 + 8*index];
}

  /////////////////////////////////////////////////////////////////////
 //
// Euclidean

function disableEuc(index)
{
  setConfigU8(2916 + index,   0);
  setConfigU8(2940 + index,   0);
  setConfigU8(4104 + index,   1);
  setConfigU8(4120 + index,   1);
  setPresetU8(1380 + 8*index, 0);
}

function initEuc(index, output)
{
  setConfigU8(2916 + index,   output);
  setConfigU8(2940 + index,   0);
  setConfigU8(4104 + index,   0);
  setConfigU8(4120 + index,   1);
  setPresetU8(1380 + 8*index, 8);
}

function setEucOnOut(value, index)
{
  setConfigU8(2916 + index,   value > 0 ? value : 0);
  setConfigU8(4104 + index,   value < 0);
}

function setEucOffOut(value, index)
{
  setConfigU8(2940 + index,   value > 0 ? value : 0);
  setConfigU8(4120 + index,   value < 0);
}

function setEucValue(offset, value, index=selectedEucIndex)
{
  setPresetU8(1380+offset+8*index, Number(value));
}

function eucActive(index)
{
  const euc = parseEuclidean(index);
  
  return (euc.onOut >= 0 || euc.offOut >= 0) &&
         euc.pulses > 0;
}


  /////////////////////////////////////////////////////////////////////
 //
// Envelope

function setEnvValue(offset, index, value)
{
  if(offset < 8) { setPresetU8(1508 + offset + 8*index,     value); }
  else           { setPresetU8(2532 + offset - 8 + 8*index, value); }
}

function disableEnv(index)
{
  // Envelopes are always active, but maybe not used
}

function initEnv(index)
{
  setEnvValue( 0, index,   0);
  setEnvValue( 1, index,   0);
  setEnvValue( 2, index, 127);
  setEnvValue( 3, index,   0);
  setEnvValue( 4, index,   0);
  setEnvValue( 5, index, 127);
  setEnvValue( 6, index,  64);
  setEnvValue( 8, index,  64);
  setEnvValue( 9, index,  64);
  setEnvValue(10, index,  64);
}

function envActive(index)
{
  return configSysex[124+32*index] != 0;
}

  /////////////////////////////////////////////////////////////////////
 //
// Arp

function setArpPresetValue(offset, value, index)
{
  setPresetU8(1248 + 8*index + offset, Number(value));
}

function setArpConfigValue(offset, value, index)
{
  setConfigU8(3644 + 4*index + offset, Number(value));
}

function disableArp(index)
{
  setArpPresetValue(0, 0, index); // Mode = off
  clearMappings("arp", index);
}

function initArp(index, output)
{
  setArpPresetValue(0,     11, index); // Mode = up
  setArpPresetValue(1,      0, index);
  setArpPresetValue(2,      0, index);
  setArpPresetValue(3,      0, index);
  setArpPresetValue(4,      0, index);
  setArpPresetValue(6,      0, index);
  setArpConfigValue(0, output, index);
  setArpConfigValue(1,      0, index);
  
  clearMappings("arp", index);
}

function arpActive(index, mappings=null)
{
  if(presetSysex[1248 + 8*index] > 10) { return true; }
  
  // Only read if the above check failed
  if(mappings === null) { mappings = allMappings(); }
  
  if(locateMapping("arp", "M", index, mappings) !== null) { return true; }
  
  return false;
}

function setArpC(value, index)
{
  const loc   = 3645 + 4*index;
  const byte  = configSysex[loc];

  setConfigU8(loc, value ? byte | 0x10 : byte & ~0x10);
}

function setArpA(value, index)
{
  const loc   = 3645 + 4*index;
  const byte  = configSysex[loc];

  setConfigU8(loc, value ? byte | 0x20 : byte & ~0x20);
}

function setArpDin(value, index)
{
  const loc   = 3645 + 4*index;
  const byte  = configSysex[loc];

  setConfigU8(loc, value ? byte | 0x40 : byte & ~0x40);
}

function setArpChannel(value, index)
{
  const loc   = 3644 + 4*index + 1;
  const byte  = configSysex[loc];

  setConfigU8(loc, (byte & 0x70) | (Number(value) & 0x0f));
}

  /////////////////////////////////////////////////////////////////////
 //
// Triggers

function trigActive(output)
{
  const triggers = parseTriggers();
  for(let i=0; i<64; ++i)
  {
    if(triggers[i].output === output &&
       triggers[i].type > 0)
    {
      return true;
    }
  }
  
  return false;
}

function trigCount()
{
  const triggers = parseTriggers();
  let   active   = 0;
  for(let i=0; i<64; ++i)
  {
    if(triggers[i].type > 0) { ++active; }
  }
  return active;
}

function trigAvailable()
{
  return trigCount() < 64;
}

function enableTrig(index)
{
  presetSysex[4104 + (index >> 2)] |= (1 << (index & 0x03));
}

function disableTrig(index)
{
  presetSysex[4104 + (index >> 2)] &= ~(1 << (index & 0x03));
  configSysex[triggerAddress(index)] = 0;
}

function disableTriggersOnOutput(output)
{
  const triggers = parseTriggers();
  for(let i=0; i<64; ++i)
  {
    if(triggers[i].output === output &&
       triggers[i].type > 0)
    {
      disableTrig(i);
    }
  }
}

function triggerAddress(index) { return 2660 + 4 * index; }

function setTrigType(index, type)
{
  const address        = triggerAddress(index);
  configSysex[address] = (configSysex[address] & 0xf0) | (type & 0x0f);
}

function setTrigChannel(index, channel)
{
  const address = triggerAddress(index) + 1;
  configSysex[address] = (configSysex[address] & 0xf0) | (channel & 0x0f);
}

function setTrigNote(index, note)
{
  const address = triggerAddress(index);

  if(note < 0)
  {
    configSysex[address + 1] |= 0x20;
  }
  else
  {
    configSysex[address + 1] &= ~0x20;
    configSysex[address + 2] = note & 0x7f;
  }
}

function setTrigOutput(index, output)
{
  configSysex[triggerAddress(index) + 3] = output & 0xff;
}

function setTrigEnv(index, envelope)
{
  const address = triggerAddress(index);

  // upper bits of the envelope live in the high nibble of byte 0
  configSysex[address] =
    (configSysex[address] & 0x0f) | (((envelope >> 1) & 0x0f) << 4);

  // lowest bit of the envelope lives in bit 4 of byte 1
  configSysex[address + 1] =
    (configSysex[address + 1] & ~0x10) | ((envelope & 1) << 4);
}

function initTrig(index, output)
{ 
  enableTrig(index);
  setTrigOutput(index, output);
  setTrigType(index, 1);
  setTrigChannel(index, 1);
  setTrigNote(index, 0);
  setTrigEnv(index, 1);
}

function triggersForOutput(output)
{
  return parseTriggers().filter(trig => trig.output === output && trig.type > 0);
}

function nextAvailableTrig()
{
  const trigs = parseTriggers();
  
  for(let i=0; i<64; ++i)
  {
    if(trigs[i].type === 0) { return i; }
  }
  
  return -1;
}

function setDrumTrig(lane, step, value)
{
  lane  = Number(lane);
  step  = Number(step);
  value = Number(value);

  const main   = step % 8 < 4;
  const source = main ? step : step - 4;
  const byte   = Math.floor(source / 8);
  const bit    = source % 4;
  const stride = main ? 16 : 8;
  const base   = main ? 2256 : 4380;
  const hLoc   = base + stride*lane + byte;
  const aLoc   = hLoc + 4;
  const mask   = 1 << bit;

  setPresetU8(hLoc, value > 0
    ? presetSysex[hLoc] | mask
    : presetSysex[hLoc] & ~mask);

  setPresetU8(aLoc, value === 2
    ? presetSysex[aLoc] | mask
    : presetSysex[aLoc] & ~mask);
}

// Offsets
// 0 => start
// 1 => end
// 2 => rate
// 3 => reset
// 4 => mute
function setDrumLanePreset(lane, offset, value)
{
  setPresetU8(2264+lane*16+offset, Number(value));
}

function setDrumMidiOut(value, flag)
{
  const bits =
  {
    i: 1 << 0,
    c: 1 << 1,
    a: 1 << 2,
    d: 1 << 3,
    s: 1 << 4
  };

  const bit = bits[flag];

  if (bit === undefined) { console.error("Undefined flag"); return; }

  const base  = 2633;
  const flags = configSysex[base];

  setConfigU8(base, value ? flags | bit : flags & ~bit);
}

function setSeqChannel(value, index=num('seq-screen-index'))
{
  const loc = 3616 + 4*index;
  setConfigU8(loc, value);
}

function setSeqClock(value, index=num('seq-screen-index'))
{
  const loc = 3618 + 4*index;
  setConfigU8(loc, value);
}

function setSeqMidiOut(value, flag, index=num('seq-screen-index'))
{
  const bits =
  {
    i: 1 << 0,
    c: 1 << 1,
    a: 1 << 2,
    d: 1 << 3,
    s: 1 << 4
  };

  const bit = bits[flag];

  if (bit === undefined) { console.error("Undefined flag"); return; }

  const base  = 3617 + 4*index;
  const flags = configSysex[base];

  setConfigU8(base, value ? flags | bit : flags & ~bit);
}

function setSeqActive(value, index=num('seq-screen-index'))
{
  const flags = presetSysex[1700];
  const mask  = 1 << index;

  setPresetU8(1700, value ? flags | mask : flags & ~mask);
}

function setSeqMute(value, index=num('seq-screen-index'))
{
  const flags = presetSysex[1701];
  const mask  = 1 << index;

  setPresetU8(1701, value ? flags | mask : flags & ~mask);
}

function setSeqStart(value, index=num('seq-screen-index'))
{
  setPresetU8(1840 + 128*index, value);
}

function setSeqEnd(value, index=num('seq-screen-index'))
{
  setPresetU8(1841 + 128*index, value);
}

function setSeqRate(value, index=num('seq-screen-index'))
{
  setPresetU8(1842 + 128*index, value);
}

function setSeqGateLen(value, index=num('seq-screen-index'))
{
  setPresetU8(1843 + 128*index, value);
}

function setSeqReset(value, index=num('seq-screen-index'))
{
  setPresetU8(1844 + 128*index, value);
}

function setSeqRootNote(value, index=num('seq-screen-index'))
{
  setPresetU8(1845 + 128*index, value);
}

function setSeqDirection(value, index=num('seq-screen-index'))
{
  setPresetU8(1846 + 128*index, value);
}

function setSeqPermutation(value, index=num('seq-screen-index'))
{
  setPresetU8(4120 + 65*index, value);
}

function setSeqDegree(value, step, index)
{
  const loc = 1714 + 136*index + 4*step;
  const v   = presetSysex[loc];

  setPresetU8(loc, (v & 0xf0) | (Number(value) & 0x0f));
}

function setSeqOctave(value, step, index)
{
  const loc = 1714 + 136*index + 4*step;
  const v   = presetSysex[loc];

  setPresetU8(loc, (v & 0x8f) | ((Number(value) & 0x7) << 4));
}

function setSeqLen(value, step, index=num("seq-screen-index"))
{
  const loc = 1715 + 136*index + 4*step;
  const v   = presetSysex[loc];

  setPresetU8(loc, (v & 0xf8) | (Number(value) & 0x7));
}

function setSeqRatchet(value, step, index=num("seq-screen-index"))
{
  const loc = 1715 + 136*index + 4*step;
  const v   = presetSysex[loc];

  setPresetU8(loc, value ? v | 0x08 : v & ~0x08);
}

function setSeqReset(value, step, index=num("seq-screen-index"))
{
  const loc = 1715 + 136*index + 4*step;
  const v   = presetSysex[loc];

  setPresetU8(loc, value ? v | 0x10 : v & ~0x10);
}

function setSeqSkip(value, step, index=num("seq-screen-index"))
{
  const loc = 4122 + 65*index + 2*step;
  const v   = presetSysex[loc];

  setPresetU8(loc, value ? v | 0x01 : v & ~0x01);
}

function setSeqMute(value, step, index=num("seq-screen-index"))
{
  const loc = 4122 + 65*index + 2*step;
  const v   = presetSysex[loc];

  setPresetU8(loc, (v & 0x01) | ((Number(value) & 0x7) << 1));
}

function setSeqSubstep(value, step, substep, index=num("seq-screen-index"))
{
  value = Number(value) & 0x3;
  
  const main = 1712 + 136*index + 4*step;
  const add  = 4121 +  65*index + 2*step;
  
  let pattern = presetSysex[main] |
                (presetSysex[main + 1] << 7) |
                (presetSysex[add] << 14);

  const shift = 2*substep;
  pattern = (pattern & ~(0x3 << shift)) | (value << shift);

  setPresetShort(main, pattern & 0x3fff);
  setPresetU8(add, pattern >> 14);
}

  /////////////////////////////////////////////////////////////////////
 //
// HID Gamepad

function gamepadActive(output)
{
  const gamepads = parseGamepad();
  for(let i=0; i<32; ++i)
  {
    if(gamepads[i].output === output &&
       gamepads[i].usage > 0)
    {
      return true;
    }
  }
  
  return false;
}

function gamepadCount()
{
  const gamepads = parseGamepad();
  let   active   = 0;
  for(let i=0; i<32; ++i)
  {
    if(gamepads[i].output > 0 && gamepads[i].usage > 0) { ++active; }
  }
  return active;
}

function gamepadAvailable()
{
  return gamepadCount() < 32;
}

function disableGamepad(index)
{
  setGamepadOutput(index, 0);
  setGamepadUsage( index, 0);
}

function disableGamepadsOnOutput(output)
{
  const gamepads = parseGamepad();
  for(let i=0; i<32; ++i)
  {
    if(gamepads[i].output === output)
    {
      disableGamepad(i);
    }
  }
}

function setGamepadUsage(index, value)
{
  setConfigU8(2956 + 8*index, value);
}

function setGamepadScale(index, value)
{
  setConfigShort(2958 + 8*index, value);
}

function setGamepadOffset(index, value)
{
  setConfigShort(2960 + 8*index, value);
}

function setGamepadOutput(index, value)
{
  setConfigU8(2957 + 8*index, value);
}

function initGamepad(index, output)
{ 
  setGamepadUsage(  index,     20 );
  setGamepadScale(  index,    -16 );
  setGamepadOffset( index,   4096 );
  setGamepadOutput( index, output );
}

function gamepadsForOutput(output)
{
  return parseGamepad().filter(game => game.output === output && game.usage > 0);
}

function nextAvailableGamepad()
{
  const gamepads = parseGamepad();
  
  for(let i=0; i<32; ++i)
  {
    if(gamepads[i].output === 0 || gamepads[i].usage === 0) { return i; }
  }
  
  return -1;
}
