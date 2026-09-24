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

function renderPreset(data)
{
  const reader = new ByteReader(data);
  const preset = parsePreset(reader);
  if (preset === null) { return false; }
  presetSysex  = data;
  
  // Globals
  preset.swing = clampSwing(preset.swing);
  elem("preset-name-status").textContent =  "Preset: "+preset.name.trimEnd();
  put('preset-name',  preset.name);
  put('tempo',        preset.tempo);
  put('swing_type',   preset.swingType);
  put('swing_amount', preset.swingAmount);
  put('swing_pos1',   preset.swing[0]);
  put('swing_pos2',   preset.swing[1]);
  put('swing_pos3',   preset.swing[2]);
  
  // Update LFO state based on reading PRESET
  const lfoState = iconState["lfo"];
  for(let i=0; i<64; ++i)
  {
    if(preset.lfos[i].level > 0) // If level is greater than zero, than enabled
    {
      iconState["lfo"][i].enabled=true;
      iconState["lfo"][i].output=i;
      renderOutputIconsFor(i);
    }
  }

  return true;
}

function renderMcv(mcv)
{
  // Some sanity checks on render
  let channel   = (mcv.channel >= 0 && mcv.channel <= 15) ? mcv.channel : 0;
  let min       = (mcv.min >= 0 && mcv.min <= 127)        ? mcv.min     : 0;
  let max       = (mcv.max >= 0 && mcv.max <= 127)        ? mcv.max     : 0;
  let type      = String(mcv.type) + String(mcv.scheme);
  let voices    = (mcv.voices >= 1 && mcv.voices <= 16)   ? mcv.voices  : 0;
  let base      = (mcv.base >= 0 && mcv.base <= 63)       ? mcv.base    : 0;
  let stride    = (mcv.stride >= 1 && mcv.stride <= 32)   ? mcv.stride  : 0;

  put(  "midi-cvrt-channel",  channel         );
  put(  "midi-cvrt-note-min", min             );
  put(  "midi-cvrt-note-max", max             );
  put(  "midi-cvrt-type",     type            );
  put(  "midi-cvrt-voices",   voices          );
  put(  "midi-cvrt-bendup",   mcv.bendUp      );
  check("midi-cvrt-no-steal", !!mcv.stealing  );
  check("midi-cvrt-gatepress",!!mcv.gatedPress);
  put(  "midi-cvrt-sustain",  mcv.sustain     );
  put(  "midi-cvrt-stride",   stride          );
  put(  "midi-cvrt-lastchan", mcv.lastMPE & 0xf );
  check("midi-cvrt-paraafter",!!mcv.pressure  );
  check("midi-cvrt-paragate", !!mcv.paraGate  );
  check("midi-cvrt-cv",       !!mcv.cvOutput  );
  check("midi-cvrt-gate",     !!mcv.gateOutput);
  check("midi-cvrt-velgate",  !!mcv.velGate   );
  put(  "midi-cvrt-vel",      mcv.velOutput   );
  put(  "midi-cvrt-relvel",   mcv.relVel      );
  check("midi-cvrt-trig",     !!mcv.trigger   );
  check("midi-cvrt-after",    !!mcv.voicePress);
  put(  "midi-cvrt-mpey",     mcv.mpeY        );
  check("midi-cvrt-env",      !!mcv.envelope  );
  check("midi-cvrt-retrig",   !!mcv.retrigger );
  check("midi-cvrt-intgate",  !!mcv.intGate   );
  check("midi-cvrt-envzero",  !!mcv.zeroStart );
  put(  "midi-cvrt-bendup",   mcv.bendDown    );
  put(  "midi-cvrt-bend",     mcv.bendOut     );
  check("midi-cvrt-rnd",      !!mcv.random    );
  
  elem("midi-editor-name").textContent = "MIDI/CV ("+(selectedIcon.index+1)+")";
}

function scaleVoltage(range, level, scale=16383)
{
  let rng  = 0;
  let base = 0;
  switch(Number(range))
  {
    case 0:  rng = 10;  base =  0;  break;
    case 1:  rng = 10;  base = -5;  break;
    case 2:  rng =  1;  base =  0;  break;
    case 3:  rng =  5;  base =  0;  break;
    case 4:  rng =  8;  base =  0;  break;
    default: throw new Error("voltage scaling not supported "+range+" "+level);
  }
  
  return ((level/scale) * rng + base).toFixed(3);
}

function renderConfig(data)
{
  const reader = new ByteReader(data);
  const config = parseConfig(reader);
  if (config === null) { return false; }
  configSysex  = data;
  
  put("config-name", config.name);
  elem("config-name-status").textContent = "Config: "+config.name.trimEnd();
  check("glb_legvel",       config.globals.legvel);
  put(  "glb_transpose",    config.globals.transpose);
  put(  "glb_triglen",      config.globals.triglen);
  put(  "glb_extclkmult",   config.globals.extclkmult);
  put(  "glb_extclkrun",    config.globals.extclkrun);
  put(  "glb_eucaccent",    config.globalMidi.eucAccent);
  put(  "glb_presetprogch", config.globals.presetprogch);
  check("glb_softtakeover", config.globals.softtakeover);
  
  for(let i=0; i<64; ++i)
  { 
    put("rng_"+i,           config.outputRanges[i]);  
    put("lowgate_"+i,       config.gateLevels[i].low);  
    put("highgate_"+i,      config.gateLevels[i].high);

    elem("lowgate_lbl_"+i ).textContent =
      scaleVoltage(config.outputRanges[i], config.gateLevels[i].low );
    elem("highgate_lbl_"+i).textContent = 
      scaleVoltage(config.outputRanges[i], config.gateLevels[i].high);
  }
  
  for(let i=0; i<32; ++i)
  {
    if(config.clocks[i].type > 0)
    {
      iconState["clock"][i].enabled=true;
      iconState["clock"][i].output=config.clocks[i].output;
      renderOutputIconsFor(config.clocks[i].output);
    }
  }
  
  // Update LFO state based on reading MIDI Mappings
  const mappings = allMappings();
  const lfoMaps  = mappings["lfo"];
  for(let i in lfoMaps)
  {
    // Is there a MIDI map that enables LFO output?
    if(lfoMaps[i].type === "LFO" || 
       lfoMaps[i].type === "DC") 
    {
      var output = lfoMaps[i].index;
      iconState["lfo"][output].enabled=true;
      iconState["lfo"][output].output=output;
      renderOutputIconsFor(output);
    }
  }
  
  for(let i=0; i<16; ++i)
  {
    if(config.mcvs[i].enabled > 0)
    {
      iconState["midi"][i].enabled = true;
      iconState["midi"][i].output  = config.mcvs[i].base;
      renderOutputIconsFor(iconState["midi"][i].output);
      updateMidiOutputs(i);
    }
  }
  
  // CV/MIDI XY
  var cvMidi = config.cvMidi[0];
  put(  "cvmx_type",     cvMidi.enable ? cvMidi.type : -1);
  put(  "cvmx_channel",  cvMidi.channel);
  put(  "cvmx_cc",       cvMidi.cc);
  put(  "cvmx_0v",       cvMidi.zeroV);
  put(  "cvmx_5v",       cvMidi.fiveV);
  check("cvmx_out_int",  cvMidi.outI);
  check("cvmx_out_usba", cvMidi.outA);
  check("cvmx_out_usbc", cvMidi.outC);
  check("cvmx_out_din",  cvMidi.outD);
  check("cvmx_out_sel",  cvMidi.outS);
  
  cvMidi = config.cvMidi[1];
  put(  "cvmy_type",     cvMidi.enable ? cvMidi.type : -1);
  put(  "cvmy_channel",  cvMidi.channel);
  put(  "cvmy_cc",       cvMidi.cc);
  put(  "cvmy_0v",       cvMidi.zeroV);
  put(  "cvmy_5v",       cvMidi.fiveV);
  check("cvmy_out_int",  cvMidi.outI);
  check("cvmy_out_usba", cvMidi.outA);
  check("cvmy_out_usbc", cvMidi.outC);
  check("cvmy_out_din",  cvMidi.outD);
  check("cvmy_out_sel",  cvMidi.outS);
  
  /* INCLUDE OTHER MAPPING RELATED RENDERINGS HERE */
  
/*
  for (let j = 0; j < ac.length; ++j)
  {
    for (let i = 0; i < 64; ++i)
    {
      const ccid = "out_" + ac[j] + "_cc_" + i;
      const chid = "out_" + ac[j] + "_ch_" + i;

      put(chid, -1);
      put(ccid, -1);

      elem(ccid).style.display = "none";
    }
  }

  for (let j = 1; j < 17; ++j)
  {
    clearMappings("arpeg"  + j + "_", arpControls);
    clearMappings("mcvcom" + j + "_", mcvCommands);
    clearMappings("mcvm2_" + j + "_", mcvMappable2Controls);
    clearMappings("mcvm3_" + j + "_", mcvMappable3Controls);
    clearMappings("euc_"   + j + "_", eucControls);
    clearMappings("srr_"   + j + "_", srrControls);
  }

  for (let j = 0; j < 4; ++j)
  {
    clearMappings("seq" + j + "_", seqControls);
  }

  clearMappings("dseq0_", dseqControls);

  for (let j = 0; j < 8; ++j)
  {
    clearMappings("dseq0_" + j + "_", dseqlControls);
  }

  for (let i = 0; i < global_mappable.length; ++i)
  {
    put(global_mappable[i] + "_ch", -1);
    put(global_mappable[i] + "_cc", -1);

    elem(global_mappable[i] + "_cc").style.display = "none";
  }

  for (let i = 0; i < config.mappings.length; ++i)
  {
    const mapping = config.mappings[i];

    if ((mapping.channel >> 4) !== 3) { continue; }

    const ch = mapping.channel & 0xf;
    const relative = (mapping.type0 & 32) !== 0;
    const target = mapping.type0 & ~32;
    const value = mapping.type1;

    let ccid = "";

    if (target <= 8)
    {
      let aci = acMapLow[target];
      let index = value;

      if (index >= 64)
      {
        index -= 64;
        aci = acMapHigh[target];
      }

      if (aci >= 0 && index >= 0 && index < 64)
      {
        const id = "out_" + ac[aci] + "_ch_" + index;

        ccid = "out_" + ac[aci] + "_cc_" + index;

        put(id, ch + 1);
        put(ccid, mapping.cc);

        changeMIDIChannel(id, ccid);
      }
    }
    else if (target === 9)
    {
      const j = (value >> 3) + 1;
      const k = value & 7;

      if (k < arpControls.length)
      {
        const id = "arpeg" + j + "_" + arpControls[k];

        ccid = id + "_cc";

        put(id + "_ch", ch + 1);
        put(ccid, mapping.cc);

        changeMIDIChannel(id + "_ch", ccid);
      }
    }
    else if (target === 10)
    {
      const j = (value >> 3) + 1;
      const k = value & 7;

      if (k < eucControls.length)
      {
        const id = "euc_" + j + "_" + eucControls[k];

        ccid = id + "_cc";

        put(id + "_ch", ch + 1);
        put(ccid, mapping.cc);

        changeMIDIChannel(id + "_ch", ccid);
      }
    }
    else if (target === 11)
    {
      const j = (value >> 3) + 1;
      const k = value & 7;

      if (k < mcvCommands.length)
      {
        const id = "mcvcom" + j + "_" + mcvCommands[k];

        ccid = id + "_cc";

        put(id + "_ch", ch + 1);
        put(ccid, mapping.cc);

        changeMIDIChannel(id + "_ch", ccid);
      }
    }
    else if (target === 12)
    {
      const j = (value >> 3) + 1;
      const k = value & 7;

      if (k < mcvMappable2Controls.length)
      {
        const id = "mcvm2_" + j + "_" + mcvMappable2Controls[k];

        ccid = id + "_cc";

        put(id + "_ch", ch + 1);
        put(ccid, mapping.cc);

        changeMIDIChannel(id + "_ch", ccid);
      }
    }
    else if (target === 13)
    {
      let j = value >> 4;
      const k = value & 0xf;

      if (j < 4)
      {
        if (k < seqControls.length)
        {
          const id = "seq" + j + "_" + seqControls[k];

          ccid = id + "_cc";

          put(id + "_ch", ch + 1);
          put(ccid, mapping.cc);

          changeMIDIChannel(id + "_ch", ccid);
        }
      }
      else
      {
        j -= 4;

        if (k < dseqControls.length)
        {
          const id = "dseq" + j + "_" + dseqControls[k];

          ccid = id + "_cc";

          put(id + "_ch", ch + 1);
          put(ccid, mapping.cc);

          changeMIDIChannel(id + "_ch", ccid);
        }
      }
    }
    else if (target === 14)
    {
      const j = value >> 4;
      const k = value & 0xf;

      if (k < dseqlControls.length)
      {
        const id = "dseq0_" + j + "_" + dseqlControls[k];

        ccid = id + "_cc";

        put(id + "_ch", ch + 1);
        put(ccid, mapping.cc);

        changeMIDIChannel(id + "_ch", ccid);
      }
    }
    else if (target === 15)
    {
      const j = (value >> 3) + 1;
      const k = value & 7;

      if (k < srrControls.length)
      {
        const id = "srr_" + j + "_" + srrControls[k];

        ccid = id + "_cc";

        put(id + "_ch", ch + 1);
        put(ccid, mapping.cc);

        changeMIDIChannel(id + "_ch", ccid);
      }
    }
    else if (target === 16)
    {
      const j = (value >> 3) + 1;
      const k = value & 7;

      if (k < mcvMappable3Controls.length)
      {
        const id = "mcvm3_" + j + "_" + mcvMappable3Controls[k];

        ccid = id + "_cc";

        put(id + "_ch", ch + 1);
        put(ccid, mapping.cc);

        changeMIDIChannel(id + "_ch", ccid);
      }
    }
    else
    {
      const globalMap =
      {
        69: [ "glb_tempo_ch",        "glb_tempo_cc"        ],
        71: [ "dispmode_ch",         "dispmode_cc"         ],
        72: [ "dispitem_ch",         "dispitem_cc"         ],
        74: [ "glb_swing_type_ch",   "glb_swing_type_cc"   ],
        75: [ "glb_swing_amount_ch", "glb_swing_amount_cc" ],
        76: [ "nudgefaster_ch",      "nudgefaster_cc"      ],
        77: [ "nudgeslower_ch",      "nudgeslower_cc"      ],
        78: [ "inctempo_ch",         "inctempo_cc"         ],
        79: [ "dectempo_ch",         "dectempo_cc"         ]
      };

      const ids = globalMap[target];

      if (ids)
      {
        put(ids[0], ch + 1);
        put(ids[1], mapping.cc);

        changeMIDIChannel(ids[0], ids[1]);

        ccid = ids[1];
      }
    }

    if (ccid !== "")
    {
      const relativeElement = elem(ccid + "_rel");

      if (relativeElement) { relativeElement.checked = relative; }
    }
  }
  */
  
  return true;
}

function renderScreenshot(data)
{
  const reader = new ByteReader(data);
  const canvas = parseScreenshot(reader);
  elem("fh2-screenshot").src = canvas.toDataURL();
  elem("fh2-screenshot").hidden = false;
}


function renderSrrEditor(index=null)
{
  console.log("renderSrrEditor", index);
  if(index === null) { index = Number(get("srr-screen-index")); }
  selectedSrrIndex = index;
  
  const srr = { ...(parsePresetShiftRegister(new ByteReader(presetSysex), index)),
                ...(parseConfigShiftRegister(new ByteReader(configSysex), index)) };
  
  put(  'srr-cv-output',      srr.output      );
  put(  'srr-change-output',  (srr.addendum & 1) ? -1 : srr.change  );
  put(  'srr-trigger-output', (srr.addendum & 2) ? -1 : srr.trigger );
  put(  'srr-notes-input',    srr.notes       );
  check('srr-midi-i',         srr.int         );
  check('srr-midi-c',         srr.usbc        );
  check('srr-midi-a',         srr.usba        );
  check('srr-midi-d',         srr.din         );
  check('srr-midi-s',         srr.sel         );
  put(  'srr-clock',          srr.clock       );
  put(  'srr-direction',      srr.direction   );
  put(  'srr-length',         srr.bits        );
  put(  'srr-rate',           srr.rate        );
  put(  'srr-random',         srr.random      );
  put(  'srr-attenuator',     srr.attenuation );
  put(  'srr-scale',          srr.scale       );
  put(  'srr-key',            srr.key         );
  put(  'srr-gate-len',       srr.gateLength  );
  
  console.log("renderSrrEditor");
}
