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

// Functions

// # Returns 0-383, or null if none found
function nextMappingSlot()
{
  const reader = new ByteReader(configSysex);
  reader.seek(612);
  for(let i=0; i<384; ++i)
  {
    x = reader.u8();
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

function writeMapping(slot, type, index, dest, channel, cc, rel)
{
  const loc = 612 + slot * 4;

  setConfigU8(loc,     48 + (channel & 0xf));
  setConfigU8(loc + 1, cc);

  let t0 = 0;
  let t1 = 0;

  switch(type)
  {
    case "lfo":
      t0 = inverseLUT(dest, lfoLowControls);
      t1 = index;
      if (t0 === null)
      {
        t0 = inverseLUT(dest, lfoHighControls);
        t1 += 64;
      }
      break;
    case "arp":   t0 =  9; t1 = (index << 3)    | inverseLUT(dest, arpControls);   break;
    case "euc":   t0 = 10; t1 = (index << 3)    | inverseLUT(dest, eucControls);   break;
    case "mcv":   t0 = 11; t1 = (index << 3)    | inverseLUT(dest, mcvControls);   break;
    case "mcv2":  t0 = 12; t1 = (index << 3)    | inverseLUT(dest, mcv2Controls);  break;
    case "seq":   t0 = 13; t1 = (index << 4)    | inverseLUT(dest, seqControls);   break;
    case "dseq":  t0 = 13; t1 = ((index+4) << 4)| inverseLUT(dest, dseqControls);  break;
    case "dseql": t0 = 14; t1 = (index << 4)    | inverseLUT(dest, dseqlControls); break;
    case "srr":   t0 = 15; t1 = (index << 3)    | inverseLUT(dest, srrControls);   break;
    case "mcv3":  t0 = 16; t1 = (index << 3)    | inverseLUT(dest, mcv3Controls);  break;
    case "glb":   t0 = inverseLUT(dest, globalControls) + 69;                      break;
    default:
      console.error("Invalid writeMapping request", slot, type, index, dest);
      return;
  }

  if (rel === true || rel > 0) { t0 |= 0x20; }

  setConfigU8(loc + 2, t0);
  setConfigU8(loc + 3, t1);
}

function clearMapping(slot)
{
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
  const k = map.t1 & 0x07;

  if (k >= controls.length)
  {
    console.error("Invalid mapping", map);
    return null;
  }

  return mapping(map, type, index, controls[k]);
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
  const mappings = Object.fromEntries(
    [ "lfo",  "arp", "seq", "dseq", "dseql", "mcv2", 
      "mcv3", "mcv", "euc", "srr",  "glb"            
    ].map(key => [key, []])
  );
  
  for (let i = 0; i < 384; ++i)
  {
    const compiled = compileMapping(rawMappings[i]);
    if(compiled)    { mappings[compiled.dest].push(compiled); }
  }
  
  return mappings;
}
