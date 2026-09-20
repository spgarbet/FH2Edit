
var globalControls       = [ "tempo", null, "dispmode", "dispitem", null, "swingtype", "swingamt", "nudgefaster", "nudgeslower", "inctempo", "dectempo"];
var arpControls          = [ "M", "R", "G", "L", "T", "P", "S", "E" ];
var seqControls          = [ "T", "S", "G", "P" ];
var dseqControls         = [ "S", "P" ];
var dseqlControls        = [ "T", "S", "P" ];
var mcv2Controls         = [ "A", "D", "S", "R", "N", "P", "V", "RND" ];
var mcv3Controls         = [ "AS", "DS", "RS" ];
var mcvControls          = [ "A", "R", "T", "N", "P", "K", "O" ];
var eucControls          = [ "P", "S", "R", "T", "G", "A", "E" ];
var srrControls          = [ "D", "L", "R", "T", "A", "S", "K", "G" ];
var lfoLowControls       = ["DC", "LFO", "PW", "TRI", "CLK", "CLKM", "MLT", "SQR", "SIN"];
var lfoHighControls      = [null, null, null, "SAW", "RND", "NSE", "SMO", "PHS", "FAD"];
var typeMappings         = [ "lfo",  "arp", "seq", "dseq", "dseql", "mcv2", 
                             "mcv3", "mcv", "euc", "srr",  "glb"];

const SLOT_GLOBAL_TAP   = -1;
const SLOT_GLOBAL_START = -2;

// # Returns 0-383, or null if none found
function nextMappingSlot()
{
  const reader = new ByteReader(configSysex);
  reader.seek(612);
  for(let i=0; i<384; ++i)
  {
    const x = reader.u8();
    if ((x >> 4 ) !== 3) { return i; }
    reader.skip(3);
  }
  return null;
}

function inverseLUT(dest, map)
{
  for(let i=0; i<map.length; ++i) { if(dest === map[i]) { return i; } }
  
  return null;
}

function inverseLUTWithCheck(dest, map)
{
  const index = inverseLUT(dest, map);
  if(index === null) { throw new Error("Invalid mapping destination "+dest); }
  return index;
}

function writeMapping(slot, type, index, dest, channel, cc, rel)
{
  if(slot === SLOT_GLOBAL_TAP)
  {
    if(configSysex[2932] === 0) { setConfigU8(2932, 1); }
    setConfigU8(2933, channel);
    setConfigU8(2934, cc);
    return;
  }
  
  if(slot === SLOT_GLOBAL_START)
  {
    if(configSysex[2936] === 0) { setConfigU8(2936, 1); }
    setConfigU8(2937, channel);
    setConfigU8(2938, cc);
    return;
  }

  const loc = 612 + slot * 4;

  let t0 = 0;
  let t1 = 0;

  switch(type)
  {
    case "lfo":
      t0 = inverseLUT(dest, lfoLowControls);
      t1 = index;
      if (t0 === null)
      {
        t0 = inverseLUTWithCheck(dest, lfoHighControls);
        t1 += 64;
      }
      break;
    case "arp":   t0 =  9; t1 = (index << 3)    | inverseLUTWithCheck(dest, arpControls);   break;
    case "euc":   t0 = 10; t1 = (index << 3)    | inverseLUTWithCheck(dest, eucControls);   break;
    case "mcv":   t0 = 11; t1 = (index << 3)    | inverseLUTWithCheck(dest, mcvControls);   break;
    case "mcv2":  t0 = 12; t1 = (index << 3)    | inverseLUTWithCheck(dest, mcv2Controls);  break;
    case "seq":   t0 = 13; t1 = (index << 4)    | inverseLUTWithCheck(dest, seqControls);   break;
    case "dseq":  t0 = 13; t1 = ((index+4) << 4)| inverseLUTWithCheck(dest, dseqControls);  break;
    case "dseql": t0 = 14; t1 = (index << 4)    | inverseLUTWithCheck(dest, dseqlControls); break;
    case "srr":   t0 = 15; t1 = (index << 3)    | inverseLUTWithCheck(dest, srrControls);   break;
    case "mcv3":  t0 = 16; t1 = (index << 3)    | inverseLUTWithCheck(dest, mcv3Controls);  break;
    case "glb":   t0 = inverseLUTWithCheck(dest, globalControls) + 69;                      break;
    default:
      console.error("Invalid writeMapping request", slot, type, index, dest);
      return;
  }

  if (rel === true || rel > 0) { t0 |= 0x20; }

  setConfigU8(loc,     48 + (channel & 0xf));
  setConfigU8(loc + 1, cc);
  setConfigU8(loc + 2, t0);
  setConfigU8(loc + 3, t1);
}

function clearMapping(slot)
{
  if(slot === SLOT_GLOBAL_TAP)
  {
    setConfigU8(2932, 0);
    setConfigU8(2933, 0);
    setConfigU8(2934, 0);
    return;
  }
  
  if(slot === SLOT_GLOBAL_START)
  {
    setConfigU8(2936, 0);
    setConfigU8(2937, 0);
    setConfigU8(2938, 0);
    return;
  }
  const loc = 612+slot*4
  setConfigU8(loc,   0);
  setConfigU8(loc+1, 0);
  setConfigU8(loc+2, 0);
  setConfigU8(loc+3, 0);
}

function mapping(map, type, index, dest)
{
  return {
    slot:     map.slot,
    channel:  map.channel & 0x0f,
    cc:       map.cc,
    relative: (map.t0 & 0x20) !== 0,
    type,
    index,
    dest
  };
}

function decodeMapping(map, type, index, controls)
{
  return mapping(map, type, index, controls[map.t1 & 0x07]);
}

function compileMapping(raw)
{
  if ((raw.channel >> 4) !== 3) { return null; }
    
  const typeCode = raw.t0 & ~0x20;

  // LFO controllers
  if (typeCode <= 8)
  {
    const dest = (raw.t1 < 64 ? lfoLowControls : lfoHighControls)[typeCode];

    if (dest !== null && dest !== undefined)
    {
      return mapping(raw, "lfo", raw.t1 & 0x3f, dest);
    }

    throw new Error("invalid mapping type code", raw);
  }
  
  switch (typeCode)
  {
    case 9:  return decodeMapping(raw, "arp",   (raw.t1 >> 3), arpControls  );
    case 10: return decodeMapping(raw, "euc",   (raw.t1 >> 3), eucControls  );
    case 11: return decodeMapping(raw, "mcv",   (raw.t1 >> 3), mcvControls  );
    case 12: return decodeMapping(raw, "mcv2",  (raw.t1 >> 3), mcv2Controls );
    case 14: return decodeMapping(raw, "dseql", (raw.t1 >> 4), dseqlControls);
    case 15: return decodeMapping(raw, "srr",   (raw.t1 >> 3), srrControls  );
    case 16: return decodeMapping(raw, "mcv3",  (raw.t1 >> 3), mcv3Controls );
    case 13:
      index = raw.t1 >> 4;
      if (index < 4)
      { return decodeMapping(raw, "seq",  index,   seqControls); }
      else
      { return decodeMapping(raw, "dseq", index-4, dseqControls); }
    default:
      if (typeCode >= 69 && typeCode <= 79)
      {
        const dest = globalControls[typeCode - 69];
        if (dest !== null && dest !== undefined) { return mapping(raw,"glb",0,dest); }
      }
  }
  throw new Error("Invalid mapping", raw);
}

// Make a mapping interpretable and directly useable
function compileMappings(rawMappings)
{
  const mappings = Object.fromEntries(typeMappings.map(key => [key, []]));
  
  for (let i = 0; i < 384; ++i)
  {
    const compiled = compileMapping(rawMappings[i]);
    if(compiled)    { mappings[compiled.type].push(compiled); }
  }

  return mappings;
}

function allMappings()
{
  const mappings = compileMappings(parseMappings(new ByteReader(configSysex)));
  
  // Exceptions for 2 globals, UGH
  if(configSysex[2932] > 0)
  {
    mappings["glb"].push(
      mapping({slot: SLOT_GLOBAL_TAP,
               channel: configSysex[2933],
               cc: configSysex[2934]}, 
              "glb", 0, "glb_tap"));
  }
  if(configSysex[2936] > 0)
  {
    mappings["glb"].push(
      mapping({slot: SLOT_GLOBAL_START,
               channel: configSysex[2937],
               cc: configSysex[2938]}, 
              "glb", 0, "glb_start"));
  }
  
  return mappings;
}

function locateMapping(type, dest, index, mappings=allMappings())
{
  const submap = mappings[type];
  for(let i=0; i<submap.length; ++i)
  {
    if(submap[i]                 &&
       submap[i].dest  === dest  &&
       submap[i].index === index) 
    { return submap[i]; }
  }
  return null;
}

function readMapping(slot)
{
  if(slot === SLOT_GLOBAL_TAP)
  {
    return mapping({slot: SLOT_GLOBAL_TAP,
               channel: configSysex[2933],
               cc: configSysex[2934]}, 
              "glb", 0, "glb_tap");
  }
  if(slot === SLOT_GLOBAL_START)
  {
    return mapping({slot: SLOT_GLOBAL_START,
               channel: configSysex[2937],
               cc: configSysex[2938]}, 
              "glb", 0, "glb_start");
  }
  return compileMapping(parseMapping(new ByteReader(configSysex), slot));
}
