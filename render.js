function renderMcv(mcv, m)
{
  let enable    = !!mcv.enable;
  let channel   = (mcv.channel >= 0 && mcv.channel <= 15) ? mcv.channel + 1 : 0;
  let min       = (mcv.min >= 0 && mcv.min <= 127)        ? mcv.min : 0;
  let max       = (mcv.max >= 0 && mcv.max <= 127)        ? mcv.max : 0;
  let type      = mcv.type;
  let voices    = (mcv.voices >= 1 && mcv.voices <= 16)   ? mcv.voices : 0;
  let bend      = mcv.bend;
  let scheme    = mcv.scheme;
  let stealing  = !!mcv.stealing;
  let GA        = !!mcv.gatedPress;
  let SUS       = mcv.sustain;
  let base      = (mcv.base >= 0 && mcv.base <= 63)       ? mcv.base : 0;
  let stride    = (mcv.stride >= 1 && mcv.stride <= 32)   ? mcv.stride : 0;
  let lastMPE   = (mcv.lastMPE >= 0 && mcv.lastMPE <= 15) ? mcv.lastMPE + 1 : 0;
  let A         = !!mcv.pressure;
  let G         = !!mcv.paraGate;
  let VC        = !!mcv.cvOutput;
  let VG        = !!mcv.gateOutput;
  let VVG       = !!mcv.velGate;
  let VV        = mcv.velOutput;
  let VR        = mcv.relVel;
  let VT        = !!mcv.trigger;
  let VP        = !!mcv.voicePress;
  let VY        = mcv.mpeY;
  let VE        = !!mcv.envelope;
  let basegate  = (mcv.baseGate >= 64 && mcv.baseGate <= 127) ? mcv.baseGate : 0;
  let MT        = !!mcv.retrigger;
  let IG        = !!mcv.intGate;
  let ZS        = !!mcv.zeroStart;
  let benddown  = mcv.bendDown;
  let PB        = mcv.pitchBend;
  let VRND      = !!mcv.random;

  check("mcv_enable_"   + m, enable   );
  put(  "mcv_ch_"       + m, channel  );
  put(  "mcv_min_"      + m, min      );
  put(  "mcv_max_"      + m, max      );
  put(  "mcv_type_"     + m, type     );
  put(  "mcv_voices_"   + m, voices   );
  put(  "mcv_bend_"     + m, bend     );
  put(  "mcv_scheme_"   + m, scheme   );
  check("mcv_stealing_" + m, stealing );
  check("mcv_GA_"       + m, GA       );
  put(  "mcv_SUS_"      + m, SUS      );
  put(  "mcv_base_"     + m, base     );
  put(  "mcv_stride_"   + m, stride   );
  put(  "mcv_lastMPE_"  + m, lastMPE  );
  check("mcv_A_"        + m, A        );
  check("mcv_G_"        + m, G        );
  check("mcv_VC_"       + m, VC       );
  check("mcv_VG_"       + m, VG       );
  check("mcv_VVG_"      + m, VVG      );
  put(  "mcv_VV_"       + m, VV       );
  put(  "mcv_VR_"       + m, VR       );
  check("mcv_VT_"       + m, VT       );
  check("mcv_VP_"       + m, VP       );
  put(  "mcv_VY_"       + m, VY       );
  check("mcv_VE_"       + m, VE       );
  put(  "mcv_basegate_" + m, basegate );
  check("mcv_MT_"       + m, MT       );
  check("mcv_IG_"       + m, IG       );
  check("mcv_ZS_"       + m, ZS       );
  put(  "mcv_benddown_" + m, benddown );
  put(  "mcv_PB_"       + m, PB       );
  check("mcv_VRND_"     + m, VRND     );

  changeType(m);
}

function renderConfig(data)
{
  const reader = new ByteReader(data);
  const config = parseConfig(reader);

  for (let j = 0; j < ac.length; ++j)
  {
    for (let i = 0; i < 64; ++i)
    {
      const ccid = "out_" + ac[j] + "_cc_" + i;
      const chid = "out_" + ac[j] + "_ch_" + i;

      put(chid, -1);
      put(ccid, -1);

      document.getElementById(ccid).style.display = "none";
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

    document.getElementById(global_mappable[i] + "_cc").style.display = "none";
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
      const relativeElement = document.getElementById(ccid + "_rel");

      if (relativeElement) { relativeElement.checked = relative; }
    }
  }
}