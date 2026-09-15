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
  const reader = new ByteReader(sysexConfig);
  reader.seek(612);
  for(let i=0; i<384; ++i)
  {
    x = reader.u8();
    if ((x >> 4 ) == 3) { return i; }
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
    case "dseq":  t0 = 13; t1 = (index+4) << 4) | inverseLUT(dest, dseqControls);  break;
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

function transformMapping(map, type, index, dest)
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

function commonMapping(map, type, index, controls)
{
  const k = map.t1 & 0x07;

  if (k >= controls.length)
  {
    console.error("Invalid mapping", map);
    return null;
  }

  return transformMapping(map, type, index, controls[k]);
}

function isSeqMap(map)
{
  return (map.t1 >> 4) < 4;
}

// Make a mapping interpretable and directly useable
function transformMappings(rawMappings)
{
  const mappings = Object.fromEntries(
    [ "lfo", "arp", "seq", "dseq", "dseql", "mcv2", "mcv3", "mcv", "euc", "srr", "glb"
    ].map(key => [key, []])
  );

  for (let i = 0; i < 384; ++i)
  {
    const map = rawMappings[i];
    if ((map.channel >> 4) !== 3) { continue; }
    const typeCode = map.t0 & ~0x20;

    // LFO controllers
    if (typeCode <= 8)
    {
      const dest = (map.t1 < 64 ? lfoLowControls : lfoHighControls)[typeCode];

      if (dest !== null && dest !== undefined)
      {
        mappings.lfo.push(transformMapping(map, "lfo", map.t1 & 0x3f, dest));
      }

      continue;
    }

    switch (typeCode)
    {
      case 9:
        const result = commonMapping(map, "arp", (map.t1 >> 3), index, arpControls);
        if (result) { mappings.arp.push(result); }
        break;
      case 10:
        const result = commonMapping(map, "euc", (map.t1 >> 3), index, eucControls);
        if (result) { mappings.euc.push(result); }
        break;
      case 11:
        const result = commonMapping(map, "mcv", (map.t1 >> 3), index, mcvControls);
        if (result) { mappings.mcv.push(result); }
        break;
      case 12:
        const result = commonMapping(map, "mcv2", (map.t1 >> 3), mcv2Controls);
        if (result) { mappings.mcv2.push(result); }
        break;
      case 13:
        const index = map.t1 >> 4;
        if (isSeqMap(map))
        {
          const result = commonMapping(map, "seq", index, seqControls);
          if (result) { mappings.seq.push(result); }
        }
        else
        {
          const result = commonMapping(map, "dseq", index - 4, dseqControls);
          if (result) { mappings.dseq.push(result); }
        }
        break;
      case 14:
        const result = commonMapping(map, "dseql", (map.t1 >> 4), dseqlControls);
        if (result) { mappings.dseql.push(result); }
        break;
      case 15:
        const result = commonMapping(map, "srr", (map.t1 >> 3), index, srrControls);
        if (result) { mappings.srr.push(result); }
        break;
      case 16:
        const result = commonMapping(map, "mcv3", (map.t1 >> 3), index, mcv3Controls);
        if (result) { mappings.mcv3.push(result); }
        break;
      default:
        if (typeCode >= 69 && typeCode <= 79)
        {
          const dest = globalControls[typeCode - 69];

          if (dest !== null && dest !== undefined)
          {
            mappings.glb.push(transformMapping(map,"glb",0,dest));
          }
        }
        else
        {
          console.error("Invalid controller mapping", map);
        }
        break;
    }
  }

  return mappings;
}