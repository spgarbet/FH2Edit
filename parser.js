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

// A parser can READ sysex and deliver a Javascript object

// A Monadic byte parser
class ByteReader
{
  constructor(data)
  {
    this.view   = new DataView(data.buffer, data.byteOffset, data.byteLength);
    this.offset = 0;
  }

  ensure(bytes)
  {
    if (this.offset + bytes > this.view.byteLength)
    {
      log("Parse Error");
      throw new Error("Unexpected end of data");
    }
  }

  u8()
  {
    this.ensure(1);
    return (this.view.getUint8(this.offset++) & 0x7f);
  }

  u32LE()
  {
    this.ensure(4);
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }
  
  i32LE()
  {
    this.ensure(4);
    const value = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return value;
  }
  
  uShort() { return this.u8() | ((this.u8() << 7) & 0x3f80); }
  
  sShort()
  {
    const value = this.uShort();

    if (value & 0x2000) { return value - 16384; }
    return value;
  }

  s8()
  {
    const value = this.u8();
    if (value & 0x40) { return value - 128; }
    return value;
  }

  uLong()
  {
    const value = this.u32LE();
  
    return (value & 0x7f)            |
           ((value >> 1) & 0x3f80)   |
           ((value >> 2) & 0x1fc000) |
           ((value >> 3) & 0xfe00000);
  }
  
  screenWord()
  {
    return this.uShort()         | (this.uShort() << 8) |
           (this.uShort() << 16) | (this.uShort() << 24);
  }

  bytes(length)
  {
    this.ensure(length);

    const result = new Uint8Array(
      this.view.buffer, 
      this.view.byteOffset + this.offset,
      length
    );

    this.offset += length;
    return result;
  }

  fixedString(length)
  {
    const bytes = this.bytes(length);

    let end = bytes.indexOf(0);
    if (end === -1) { end = bytes.length; }

    return new TextDecoder().decode(bytes.subarray(0, end));
  }

  skip(length)
  {
    this.ensure(length);
    this.offset += length;
  }
  
  seek(offset)
  {
    if (offset < 0 || offset > this.view.byteLength)
    {
      log("Parse Error");
      throw new Error("Invalid seek position");
    }

    this.offset = offset;
  }
  
  get position() { return this.offset; }
}

function parsePresetDirectLevel(reader)
{
  reader.seek(32);
  const direct = [];
	for (let i = 0; i<64; ++i) { direct.push(reader.uShort()); }
	return direct;
}

// Unfortunate bit of logical coupling
// Smoothing was an addendum, and it out of sequence when parsing
// This can be used to pull a specific lfo by specifying lfo number
// or if lfo is undefined, just parses the main body without smoothing
// addendum
function parsePresetLFO(reader, index)
{
  if(index !== undefined) { reader.seek(160+16*index); }
  const lfo =
  {                               // Relative offsets
    level:      reader.uShort(),  //  0
    speed:      reader.uShort(),  //  2
    base:       reader.u8(),      //  4
    multiplier: reader.u8(),      //  5
    sine:       reader.u8(),      //  6
    square:     reader.u8(),      //  7
    triangle:   reader.u8(),      //  8
    pw:         reader.u8(),      //  9
    saw:        reader.u8(),      // 10
    random:     reader.u8(),      // 11
    noise:      reader.u8(),      // 12
    fade:       reader.u8(),      // 13
    use:        reader.u8(),      // 14
    phase:      reader.u8()       // 15
  };
  
  // If a specific LFO is requested, grab the direct and smoothing
  if(index !== undefined)
  {
    reader.seek(32+2*index);
    lfo.center = reader.uShort();
    reader.seek(1184+index);
    lfo.smoothing = reader.u8();
  }
  
  return lfo;
}

function parsePresetLFOs(reader)
{
  reader.seek(160);
  
  const lfos = [];
  for (let i=0; i<64; ++i) { lfos.push(parsePresetLFO(reader)); }
  for (let i=0; i<64; ++i) { lfos[i].smo = reader.u8();         } 
  
  return lfos;
}

function parseScala(reader)
{
  reader.seek(1636);
  const scala = [];
  for (let i=0; i<16; ++i)
  {
    scala.push(
      {
        enable: reader.u8(),
        scl:    reader.u8(),
        kbm:    reader.u8()
      });
    reader.skip(1);
  }
  
  return scala;
}

function parsePresetArpeggiator(reader, index=null)
{
  if(index !== null) { reader.seek(1248 + 8*index); }
  
  return {
    mode:       reader.u8(), // M 0
    range:      reader.u8(), // R 1
    gate:       reader.u8(), // G 2
    latch:      reader.u8(), // L 3
    rate:       reader.u8(), // T 4
    portamento: reader.u8(), // P 5
    reset:      reader.u8(), // S 6
    transpose:  reader.u8()  // E 7
  };
}

function parsePresetArpeggiators(reader)
{
  reader.seek(1248);
  const arpeg = [];
  for (let i=0; i<16; ++i)
  {
    arpeg.push(parsePresetArpeggiator(reader));
  }
  return arpeg;
}

function parsePresetShiftRegister(reader, index=null)
{
  if(index !== null) { reader.seek(2400 + 8*index); }
  return {
    direction:   reader.u8(),
    bits:        reader.u8(),
    random:      reader.u8(),
    rate:        reader.u8(),
    attenuation: reader.u8(),
    scale:       reader.u8(),
    key:         reader.u8(),
    gateLength:  reader.u8()
  };
}

function parsePresetEuclidean(reader, index=null)
{
  if(index !== null) { reader.seek(1380 + 8*index); }
  
  const euclidean = 
  {
    pulses:   reader.u8(),
    steps:    reader.u8(),
    rotation: reader.u8(),
    rate:     reader.u8(),
    gateLen:  reader.u8(),
    accRate:  reader.u8(),
    reset:    reader.u8()
  };
  reader.skip(1);
  
  return euclidean;
}

function parsePresetEuclideans(reader)
{
  const euclideans=[];
  for(let i=0; i<16; ++i)
  {
    euclideans.push(parsePresetEuclidean(reader, i));
  }
  
  return euclideans;
}

function parsePresetTriggers(reader)
{
  // Addendum Jump
  reader.seek(4104);

  const trigEnabled = []; 

  for (let i = 0; i < 16; ++i)
  {
    const value = reader.u8();

    for (let j = 0; j < 4; ++j)
    {
      trigEnabled.push((value >> j) & 1);
    }
  }
  
  return trigEnabled;
}

function parseEnvelopePartOne(reader, index=null)
{
  if(index !== null) { reader.seek(1508+8*index); }
  
  return {
    attack:   reader.u8(), // 0
    decay:    reader.u8(), // 1
    sustain:  reader.u8(), // 2
    release:  reader.u8(), // 3
    range:    reader.u8(), // 4
    depth:    reader.u8(), // 5
    velocity: reader.u8(), // 6
    random:   reader.u8()  // 7
  };
}

function parseEnvelope(reader, index)
{
  const envelope=parseEnvelopePartOne(reader, index);
  
  reader.seek(2532+8*index);
  envelope.as = reader.u8(); //  8  in model setter
  envelope.ds = reader.u8(); //  9
  envelope.rs = reader.u8(); // 10
  
  return envelope;
}

function parseEnvelopes(reader)
{
  const envelopes=[];
  for(i=0; i<16; ++i)
  {
    envelopes.push(parseEnvelope(reader,i))
  }
  return envelopes;
}

function parsePresetGlobals(reader)
{
  reader.seek(8);
  const version = reader.u32LE();                             //   8
  if (version !== 8)
  {
    log("Preset Version Unsupported");
    alert("This version of the tool does not support the preset version number.");
    return null;
  }

  const name = reader.fixedString(16).trimEnd();              //   12
  
  reader.skip(1);
  const swingType       = reader.u8();                        //   29
  const swingAmount     = reader.u8();                        //   30
  reader.seek(1376);
  const tempo           = reader.uLong() * 0.1;               // 1376
  reader.seek(2528);
  const swing           = [reader.u8(), reader.u8(), reader.u8()]; // 2528

  return (
  {
    version,
    name,
    tempo,
    swingType,
    swingAmount,
    swing
  });
}

function parsePresetDrumSeq(reader)
{
  reader.seek(1702);
  
  const drum = 
  {
    active:   reader.u8() & 1,
    mute:     reader.u8() & 1,
    lanes:    []
  };
  
  reader.seek(2256);
  
  for (let j = 0; j < 8; ++j)
  {
    const h    = reader.u32LE();  //  0, 16, ...
    const a    = reader.u32LE();  //  4, 20, ...
    const lane =
    {
      pattern: Array(32).fill(0),
      start:   reader.u8(),       //  8, 24, ...
      end:     reader.u8(),       //  9, 25, ...
      rate:    reader.u8(),       // 10, 26, ...
      reset:   reader.u8(),       // 11, 27, ...
      mute:    reader.u8()        // 12, 28, ...
    };

    for (let m = 0; m < 4; ++m)
    {
      for (let n = 0; n < 4; ++n)
      {
        const bit = m * 8 + n;
        const hit = (h >> bit) & 1;
        const acc = (a >> bit) & 1;
        
        // 0=Off, 1=Hit, 2=Accent Hit
        if(hit) { lane.pattern[bit] = acc ? 2 : 1; }
      }
    }

    reader.skip(3);
    
    drum.lanes.push(lane);
  }
  
  drum.reset = reader.u8(); // 2384
  
  // Drum sequencer addendum
  reader.seek(4380);

  for (let j = 0; j < 8; ++j)
  {
    const h       = reader.u32LE();
    const a       = reader.u32LE();
    const pattern = drum.lanes[j].pattern;

    for (let m = 0; m < 4; ++m)
    {
      for (let n = 0; n < 4; ++n)
      {
        const source = m * 8 + n;
        const bit    = source + 4;
        const hit    = (h >> source) & 1;
        const acc    = (a >> source) & 1;

        if(hit) { pattern[bit] = acc ? 2 : 1; }
      }
    }
  }
  
  return drum;
}

function parsePresetSequencers(reader)
{
  reader.seek(1700);
  
  const running    = reader.u8(); // 1700
  const muted      = reader.u8(); // 1701
  const sequencers = [];

  for (let i=0; i<4; ++i)
  {
    sequencers.push({
      active: (running >> i) & 1,
      mute:   (muted   >> i) & 1
    });
  }
  
  reader.seek(1712);
  for (let i=0; i<4; ++i)
  {
    const sequencer = sequencers[i];

    sequencer.steps = [];

    for (let j = 0; j < 32; ++j)
    {
      const pattern = reader.uShort();
      const v0      = reader.u8();
      const v1      = reader.u8();

      sequencer.steps.push({
          value:   pattern,
          degree:  v0 & 0xf,
          octave:  (v0 >> 4) & 0x7,
          len:     v1 & 0x7,
          ratchet: (v1 >> 3) & 1,
          reset:   (v1 >> 4) & 1
      });
    }

    sequencer.start     = reader.u8();
    sequencer.end       = reader.u8();
    sequencer.rate      = reader.u8();
    sequencer.gateLen   = reader.u8();
    sequencer.reset     = reader.u8();
    sequencer.rootNote  = reader.u8();
    sequencer.direction = reader.u8();
    reader.skip(1);
  }
  
  // Sequencer Addendum
  reader.seek(4120);
  for (let i=0; i<4; ++i)
  {
    const sequencer       = sequencers[i];
    sequencer.permutation = reader.u8();

    for (let j=0; j<32; ++j)
    {
      const v0      = reader.u8();
      const v1      = reader.u8();
      const step    = sequencer.steps[j];

      step.value    = step.value | (v0 << 14);
      step.skip     = v1 & 1;
      step.mute     = (v1 >> 1) & 0x7;
      step.pattern  = [];

      for (let k = 0; k < 8; ++k)
      {
        step.pattern.push((step.value >> (2 * k)) & 3);
      }
    }
  }

  return sequencers;
}

/* For reference purposes
function parsePreset(reader)
{
  reader.skip(8);
  const version = reader.u32LE();                             //   8
  if (version !== 8)
  {
    log("Preset Version Unsupported");
    alert("This version of the tool does not support the preset version number.");
    return null;
  }

  const name = reader.fixedString(16).trimEnd();              //   12
  
  reader.skip(1);
  const swingType       = reader.u8();                        //   29
  const swingAmount     = reader.u8();                        //   30

	const directLevel     = parsePresetDirectLevel(reader);     //   32
	const lfos            = parsePresetLFOs(reader);            //  160
  const arpeg           = parsePresetArpeggiators(reader);    // 1248
  const tempo           = reader.uLong() * 0.1;               // 1376
  const euclidean       = parsePresetEuclideans(reader);      // 1380
  const envelope        = parseEnvelopes(reader);             // 1508
  const scala           = parseScala(reader);                 // 1636
  const sequencerActive = reader.u8();                        // 1700
  const sequencerMute   = reader.u8();                        // 1701

  const sequencers = [];                    
  for (let i=0; i<4; ++i)
  {
    sequencers.push({
      active: (sequencerActive >> i) & 1,
      mute:   (sequencerMute   >> i) & 1
    });
  }

  const drumActive = reader.u8();             // 1702
  const drumMute   = reader.u8();             // 1703

  const drumSequencers = [];
  for (let i=0; i<1; ++i)
  {
    drumSequencers.push(
      {
        active: (drumActive >> i) & 1,
        mute:   (drumMute   >> i) & 1
      }
    );
  }
  reader.skip(8);

  // Main Sequencer                           1712
  for (let i = 0; i < 4; ++i)
  {
    const sequencer = sequencers[i];

    sequencer.pattern = [];

    for (let j = 0; j < 32; ++j)
    {
      const pattern = reader.uShort();

      const v0 = reader.u8();
      const v1 = reader.u8();

      sequencer.pattern.push({
          value:   pattern,
          degree:  v0 & 0xf,
          octave:  (v0 >> 4) & 0x7,
          length:  v1 & 0x7,
          ratchet: (v1 >> 3) & 1,
          reset:   (v1 >> 4) & 1
      });
    }

    sequencer.a = reader.u8();
    sequencer.e = reader.u8();
    sequencer.t = reader.u8();
    sequencer.g = reader.u8();
    sequencer.s = reader.u8();
    sequencer.n = reader.u8();
    sequencer.d = reader.u8();

    reader.skip(1);
  }

  // Drum Sequencer                      2256
  for (let i = 0; i < 1; ++i)
  {
    const drum = drumSequencers[i];

    drum.patterns = [];

    for (let j = 0; j < 8; ++j)
    {
      const h = reader.u32LE();
      const a = reader.u32LE();

      drum.patterns.push(
        {
          high: h,
          accent: a
        }
      );

      for (let m = 0; m < 4; ++m)
      {
        for (let n = 0; n < 4; ++n)
        {
          const bit = m * 8 + n;

          drum.patterns[j]["h" + bit] = (h >> bit) & 1;
          drum.patterns[j]["a" + bit] = (a >> bit) & 1;
        }
      }

      drum.patterns[j].a = reader.u8();
      drum.patterns[j].e = reader.u8();
      drum.patterns[j].t = reader.u8();
      drum.patterns[j].s = reader.u8();
      drum.patterns[j].m = reader.u8();

      reader.skip(3);
    }

    drum.s = reader.u8();

    reader.skip(15);
  }

  const shiftRegisters = [];   // 2400

  for (let i = 0; i < 16; ++i)
  {
    shiftRegisters.push(parsePresetShiftRegister(reader));
  }

  const swing = [reader.u8(), reader.u8(), reader.u8()]; // 2528

  // Envelope Part two                  2532 - 2659 (16 blocks)
  
  const trigEnabled = parsePresetTriggers(reader);

  // Sequencer Addendum 4120
  reader.seek(4120);
  for (let i = 0; i < 4; ++i)
  {
    const sequencer = sequencers[i];

    sequencer.patternSelect = reader.u8();

    for (let j = 0; j < 32; ++j)
    {
      const v0 = reader.u8();
      const v1 = reader.u8();

      const pattern = sequencer.pattern[j];

      pattern.value =
        pattern.value |
        (v0 << 14);

      pattern.skip = v1 & 1;
      pattern.mute = (v1 >> 1) & 0x7;

      pattern.steps = [];

      for (let k = 0; k < 8; ++k)
      {
        pattern.steps.push(
          (pattern.value >> (2 * k)) & 3
        );
      }
    }
  }

  // Drum sequencer addendum  4380
  for (let i = 0; i < 1; ++i)
  {
    const drum = drumSequencers[i];

    for (let j = 0; j < 8; ++j)
    {
      const h = reader.u32LE();
      const a = reader.u32LE();

      const pattern = drum.patterns[j];

      for (let m = 0; m < 4; ++m)
      {
        for (let n = 0; n < 4; ++n)
        {
          const bit = m * 8 + n + 4;

          pattern["h" + bit] = (h >> (m * 8 + n)) & 1;
          pattern["a" + bit] = (a >> (m * 8 + n)) & 1;
        }
      }
    }
  }

  return (
  {
    version,
    name,
    swingType,
    swingAmount,
    directLevel,
    lfos,
    arpeg,
    tempo,
    euclidean,
    envelope,
    scala,
    sequencers,
    drumSequencers,
    trigEnabled,
    shiftRegisters,
    swing
  });
}

*/

function parseMcv(reader)  // 32 bytes total
{
  return (
  {                           // Relative Offset (not Absolute)
    enabled:    reader.u8(),  //  0
    channel:    reader.u8(),  //  1
    min:        reader.u8(),  //  2
    max:        reader.u8(),  //  3
    type:       reader.u8(),  //  4
    voices:     reader.u8(),  //  5
    bendUp:     reader.u8(),  //  6
    scheme:     reader.u8(),  //  7
    stealing:   reader.u8(),  //  8
    gatedPress: reader.u8(),  //  9
    sustain:    reader.u8(),  // 10
    base:       reader.u8(),  // 11
    stride:     reader.u8(),  // 12
    lastMPE:    reader.u8(),  // 13
    pressure:   reader.u8(),  // 14   Single paraphonic out
    paraGate:   reader.u8(),  // 15
    cvOutput:   reader.u8(),  // 16
    gateOutput: reader.u8(),  // 17
    velGate:    reader.u8(),  // 18
    velOutput:  reader.u8(),  // 19
    relVel:     reader.u8(),  // 20
    trigger:    reader.u8(),  // 21
    voicePress: reader.u8(),  // 22    Per voice pressure
    mpeY:       reader.u8(),  // 23
    envelope:   reader.u8(),  // 24
    baseGate:   reader.u8(),  // 25
    retrigger:  reader.u8(),  // 26
    intGate:    reader.u8(),  // 27
    zeroStart:  reader.u8(),  // 28
    bendDown:   reader.u8(),  // 29
    bendOut:    reader.u8(),  // 30
    random:     reader.u8()   // 31
  });
}

function parseConfigClocks(reader)
{
  // Clocks
  reader.seek(2148);
  var clocks = [];    
  for (let i = 0; i < 32; ++i)
  {
    clocks.push(
      {
        type:   reader.u8(),
        base:   reader.u8(),
        mult:   reader.u8(),
        len:    reader.u8(),
        output: reader.u8(),
        shift:  reader.u8()
      }
    );
    reader.skip(2);
  }
  return(clocks);
}

function parseMapping(reader, slot, seek=true)
{
  if(seek) { reader.seek(612+4*slot); }
  return {
    channel: reader.u8(),
    cc:      reader.u8(),
    t0:      reader.u8(),
    t1:      reader.u8(),
    slot
  };
}

function parseConfigShiftRegister(reader, index=null)
{
  // QUESTION: Why is the shift register the only one not 8 byte aligned?
  if(index !== null)
  { 
    reader.seek(3708 + 7*index);
  }
  else
  {
    index = Math.round((reader.offset - 3708)/7);
  }
  
  const shiftRegister =
  {
    output:  reader.u8()-1,
    change:  reader.u8(),
    trigger: reader.u8(),
    clock:   reader.u8(),
    notes:   reader.u8(),
    channel: reader.u8()
  };
  
  const outputs = reader.u8();

  shiftRegister.int    = (outputs >> 0) & 1;
  shiftRegister.usbc   = (outputs >> 1) & 1;
  shiftRegister.usba   = (outputs >> 2) & 1;
  shiftRegister.din    = (outputs >> 3) & 1;
  shiftRegister.sel    = (outputs >> 4) & 1;
  
  const loc = reader.offset;
  
  reader.seek(4136+index);
  const addendum = reader.u8();
  if(addendum & 0x01) { shiftRegister.change  = -1; }
  if(addendum & 0x02) { shiftRegister.trigger = -1; }
  
  reader.seek(loc);
  
  return shiftRegister;
}

function parseConfigShiftRegisters(reader)
{
  reader.seek(3708);
  shiftRegisters = [];
  for (let i = 0; i < 16; ++i)
  {
    shiftRegisters.push(parseConfigShiftRegister(reader));
  }
  
  return shiftRegisters;
}

function parseMappings(reader)
{
  reader.seek(612);

  mappings = [];                    
  for (let i = 0; i < 384; ++i)
  {
    mappings.push(parseMapping(reader, i, false));
  }
  return mappings;
}

function parseLfoReset(reader, index=null)
{
  if(index !== null) { reader.seek(3468+2*index); }
  
  const typeChannel = reader.u8();

  return (
  {
    type:    typeChannel >> 4,
    channel: typeChannel & 0x0f,
    cc:      reader.u8()
  });
}

function parseLfoResets(reader)
{
  reader.seek(3468);
  const lfoResets = [];
  for (let i = 0; i < 64; ++i)
  {
    lfoResets.push(parseLfoReset(reader));
  }
  return lfoResets;
}

// Note: Does not leave byte seek in contiguous location
function parseConfigEuclidean(reader, index)
{
  const euc = {};
  
  reader.seek(2916 + index);
  euc.onOut  = reader.u8();
  
  reader.seek(2940 + index);
  euc.offOut = reader.u8();
  
  reader.seek(4104 + index);
  if(reader.u8()) { euc.onOut  = -1; }
  
  reader.seek(4120 + index);
  if(reader.u8()) { euc.offOut = -1; }
  
  return euc;
}

function parseConfigEuclideans(reader)
{
  reader.seek();
  const euclidean = [];
  for (let i = 0; i < 16; ++i)
  {
    euclidean.push(parseConfigEuclidean(reader, i));
  }
  return euclidean;
}

function parseConfigTrigger(reader, index=null)
{
  if(index !== null) { reader.seek(2660+4*index); }
  
  const typeEnv     = reader.u8();
  const channelNote = reader.u8();
  const note        = reader.u8();
  const output      = reader.u8();

  return {
    type:     typeEnv & 0x0f,
    channel:  (channelNote & 0x0f),
    note:     ((channelNote >> 5) & 1) ? -1 : note,
    output:   output,
    envelope: (((typeEnv >> 4) << 1) | ((channelNote >> 4) & 1))
  };
}

function parseConfigTriggers(reader)
{
  const triggers=[];
  
  reader.seek(2660);
  for (let i = 0; i < 64; ++i)
  {
    triggers.push(parseConfigTrigger(reader));
  }
  
  return triggers;
}

function trigEnabled(index)
{
  const value = presetSysex[4104 + (index >> 2)];
  return (value >> (index & 0x03)) & 1;
}

function parseTrigger(index)
{
  const trigger   = parseConfigTrigger(new ByteReader(configSysex), index);
  trigger.enabled = trigEnabled(index);
  trigger.index   = index;
  
  return trigger;
}

function parseTriggers()
{
  const triggers = parseConfigTriggers(new ByteReader(configSysex));
  const enabled  = parsePresetTriggers(new ByteReader(presetSysex));
  
  for(let i=0; i<64; ++i)
  {
    triggers[i].enabled = enabled[i];
    triggers[i].index   = i;
  }
  
  return triggers;
}

function parseConfigArpeggiator(reader, index=null)
{
  if(index !== null) { reader.seek(3644+4*index); }
  
  const clock   = reader.u8();
  const outputs = reader.u8();
  
  reader.skip(2);

  return {
    clock:   clock,
    channel: outputs & 0x0f,
    usbc:    (outputs >> 4) & 1,
    usba:    (outputs >> 5) & 1,
    din:     (outputs >> 6) & 1
  };
}

function parseGamepad()
{
  reader = new ByteReader(configSysex);
  
  // Gamepad / HID mappings
  reader.seek(2956);
  const gamepad = [];              
  for (let i = 0; i < 32; ++i)
  {
    gamepad.push(
      {
        usage:   reader.u8(),
        output:  reader.u8(),
        scale:   reader.sShort(),
        offset:  reader.sShort()
      }
    );

    reader.skip(2);
  }
  
  return gamepad;
}

function parseKeyboard()
{ 
  reader = new ByteReader(configSysex);
  reader.seek(3212);
  const keyboard = [];
  for (let i = 0; i < 32; ++i)
  {
    const type   = reader.u8();
    const output = reader.u8();
    const key    = reader.u8();

    reader.skip(1);

    keyboard.push(
      {
        type:    type,
        output:  output,
        key:     key,
        release: reader.uShort(),
        press:   reader.uShort()
      }
    );
  }
  
  return keyboard;
}

function parseGateLevels(reader)
{
  reader.seek(2404);
  const gateLevels = [];
  for (let i = 0; i < 64; ++i)
  {
    gateLevels.push(
      {
        low:  reader.uShort(),
        high: reader.uShort()
      }
    );
  }
  
  return gateLevels;
}

function parseCvMidi(reader)
{
  reader.seek(3596);
  const cvMidi = [];
  for (let i = 0; i < 2; ++i)
  {
    const flags       = reader.u8();       // 3596 or 3604
    const typeChannel = reader.u8();       // 3597 or 3605

    cvMidi.push(
      {
        enable:  (flags & (1 << 0)) != 0,
        outI:    (flags & (1 << 1)) != 0,
        outA:    (flags & (1 << 2)) != 0,
        outC:    (flags & (1 << 3)) != 0,
        outD:    (flags & (1 << 4)) != 0,
        outS:    (flags & (1 << 5)) != 0,

        type:    typeChannel >> 4,
        channel: typeChannel & 0x0f,

        cc:      reader.u8()                // 3598 or 3606
      }
    );

    reader.skip(1);

    cvMidi[i].zeroV = reader.sShort();  // 3600 or 3608
    cvMidi[i].fiveV = reader.sShort();  // 3602 or 3610
  }
  
  return cvMidi;
}

function parseConfigArpeggiators(reader)
{
  reader.seek(3644);
  const arpeggiators = [];                
  for (let i = 0; i < 16; ++i)
  {
    arpeggiators.push(parseConfigArpeggiator(reader));
  }
  
  return arpeggiators;
}

function parseConfigGlobalMidi(reader)
{  
  reader.seek(2932);
  return {
    tapType:      reader.u8(),
    tapChannel:   reader.u8(),
    tapCC:        reader.u8(),
    eucAccent:    reader.u8(),
    startType:    reader.u8(),
    startChannel: reader.u8(),
    startCC:      reader.u8()
  };
}

function parseTempoLimits(reader)
{
  reader.seek(3612);
  return {
    min: reader.u8(),
    max: reader.u8()
  };
}

function parseConfigSequencers(reader)
{
  // Sequencers
  reader.seek(3616);
  const sequencers = [];
  for (let i = 0; i < 4; ++i)
  {
    const channel = reader.u8();
    const outputs = reader.u8();

    sequencers.push(
      {
        channel:  channel,
        internal: (outputs >> 0) & 1,
        usbc:     (outputs >> 1) & 1,
        usba:     (outputs >> 2) & 1,
        din:      (outputs >> 3) & 1,
        sel:      (outputs >> 4) & 1,
        clock:    reader.u8()
      }
    );

    reader.skip(1);
  }
  
  return sequencers;
}

function parseConfigDrumSeq(reader)
{
  reader.seek(3632);
  const channel = reader.u8();   // 3632
  const outputs = reader.u8();   // 3633

  const drum =
  {
    channel:  channel,
    internal: (outputs >> 0) & 1,
    usbc:     (outputs >> 1) & 1,
    usba:     (outputs >> 2) & 1,
    din:      (outputs >> 3) & 1,
    select:   (outputs >> 4) & 1,
    notes:    []
  };

  reader.skip(2);

  for (let j = 0; j < 8; ++j)
  { 
    drum.notes.push(reader.u8()); // 3636+j
  }

  return drum;
}

function parseOutputRanges(reader)
{
  reader.seek(36);
  
  const outputRanges = [];
  for (let i = 0; i < 64; ++i)
  {
    outputRanges.push(reader.u8());
  }

  return outputRanges;
}

function parseMcvs(reader)
{
  reader.seek(100);
  const mcvs = [];
  for (let i = 0; i < 16; ++i)
  {
    mcvs.push(parseMcv(reader));
  }

  return mcvs;
}

function parseConfigGlobals(reader)
{
  reader.seek(29);
  
  return {
    triglen:      reader.u8(),             // 29
    transpose:    reader.s8(),             // 30
    legvel:       reader.u8(),             // 31
    extclkmult:   reader.u8(),             // 32
    extclkrun:    reader.u8(),             // 33
    presetprogch: reader.u8(),             // 34
    softtakeover: reader.u8()              // 35
  };
}

function parseConfigAllGlobals(reader)
{
  reader.seek(8);

  const version = reader.u32LE(); // 8

  if (version !== 11)
  {
    log("FH-2 Config Version Unsupported");
    alert("This version of the tool does support the configuration version.");
    return null;
  }

  const config =
  {
    version: version,
    name:    reader.fixedString(16).trimEnd() // 12
  };

  // Globals
  config.globals        = parseConfigGlobals(reader);
  config.outputRanges   = parseOutputRanges(reader);         //   36
  config.gateLevels     = parseGateLevels(reader);           // 2404
  config.cvMidi         = parseCvMidi(reader);
  config.globalMidi     = parseConfigGlobalMidi(reader);
  config.tempo          = parseTempoLimits(reader);          // 3612
  
  return config;
}

/* For reference purposes
function parseConfig(reader)
{
  reader.skip(8);

  const version = reader.u32LE(); // 8

  if (version !== 11)
  {
    log("FH-2 Config Version Unsupported");
    alert("This version of the tool does support the configuration version.");
    return null;
  }

  const config =
  {
    version: version,
    name:    reader.fixedString(16).trimEnd() // 12
  };

  // Globals
  config.globals        = parseConfigGlobals(reader);        //   29
  config.outputRanges   = parseOutputRanges(reader);         //   36
  config.mcvs           = parseMcvs(reader);                 //  100
  config.mappings       = parseMappings(reader);             //  612 
  config.clocks         = parseConfigClocks(reader);         // 2148
  config.gateLevels     = parseGateLevels(reader);           // 2404
  config.triggers       = parseConfigTriggers(reader);       // 2660
  config.euclidean      = parseConfigEuclideans(reader); 
  config.globalMidi     = parseConfigGlobalMidi(reader);
  config.gamepad        = parseGamepad(reader);
  config.keyboard       = parseKeyboard(reader);
  config.lfoResets      = parseLfoResets(reader);            // 3468
  config.cvMidi         = parseCvMidi(reader);
  config.tempo          = parseTempoLimits(reader);          // 3612
  config.sequencers     = parseConfigSequencers(reader);     // 3616
  config.drumSequencer  = parseConfigDrumSeq(reader);        // 3632
  config.arpeggiators   = parseConfigArpeggiators(reader);   // 3644
  config.shiftRegisters = parseConfigShiftRegisters(reader); // 3708

  return config;
}
*/

function parseScreenshot(reader)
{
  var screen    = new Uint32Array(128);
  var canvas    = document.createElement("canvas");
  var ctx       = canvas.getContext("2d");
  canvas.width  = 128;
  canvas.height = 32;
  var imgData   = ctx.getImageData(0, 0, 128, 32);
  var d         = imgData.data;
  
  reader.skip(8);

  for (var i = 0; i < 128; ++i) { screen[i] = reader.screenWord(); }

  for (var y = 31; y >= 0; --y)
  {
    for (var x = 0; x < 128; ++x)
    {
      var pix = 128 * y + x;
      var v   = (screen[x] & (1 << y)) ? 0xff : 0;

      d[4 * pix + 0] = 0;
      d[4 * pix + 1] = v;
      d[4 * pix + 2] = v;
      d[4 * pix + 3] = 0xff;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  return canvas;
}

function parseArpeggiator(index)
{
  return { ...(parsePresetArpeggiator(new ByteReader(presetSysex), index)),
           ...(parseConfigArpeggiator(new ByteReader(configSysex), index)) };
}

function parseSrr(index)
{
  return { ...(parsePresetShiftRegister(new ByteReader(presetSysex), index)),
           ...(parseConfigShiftRegister(new ByteReader(configSysex), index)) };
}

function parseEuclidean(index)
{
  return { ...(parsePresetEuclidean(new ByteReader(presetSysex), index)),
           ...(parseConfigEuclidean(new ByteReader(configSysex), index)) };
}

function parseDrumSeq()
{
  return { ...(parsePresetDrumSeq(new ByteReader(presetSysex))),
           ...(parseConfigDrumSeq(new ByteReader(configSysex))) };
}

function parseSequencers()
{
  const preset = parsePresetSequencers(new ByteReader(presetSysex));
  const config = parseConfigSequencers(new ByteReader(configSysex));

  return preset.map((sequencer, i) => ({...sequencer, ...config[i] }));
}