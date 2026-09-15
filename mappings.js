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
    if(( map.channel >> 4 ) == 3) { return i; }
    reader.skip(3);
  }
  return null;
}

function inverseMap(dest, map)
{
  for(let i=0; i<map.length; ++i) { if(dest === map[i]) { return i; } }
  return null;
}

function writeMapping(slot, type, dest, channel, cc, rel)
{
  const loc = 612+slot*4;
  setConfigU8(loc,   48 + (channel & 0xf));
  setConfigU8(loc+1, cc);
  
// FIXME Bit mathy reverse map here
  let t0 = 0;
  let t1 = 0;
  switch(type)
  {
    case "lfo":
      t0 = inverseMap(dest, lfoLowControls);
      if(!t0)
      {
        t0 = inverseMap(dest, lfoHighControls);
        t1 = 64;
      }
      break;
    case "arp":   t0= 9; t1=inverseMap(dest, arpControls  ); break;
    case "seq":   t0=13; t1=inverseMap(dest, seqControls  ); break;
    case "dseq":  t0=13; t1=inverseMap(dest, dseqControls ) | 0x70; break;
    case "dseql": t0=14; t1=inverseMap(dest, dseqlControls); break;
    case "mcv2":  t0=12; t1=inverseMap(dest, mcv2Controls ); break;
    case "mcv3":  t0=16; t1=inverseMap(dest, mcv3Controls ); break;
    case "mcv":   t0=11; t1=inverseMap(dest, mcvControls  ); break;
    case "euc":   t0=10; t1=inverseMap(dest, eucControls  ); break;
    case "srr":   t0=15; t1=inverseMap(dest, srrControls  ); break;
    case "glb":   t0=inverseMap(dest, globalControls)+69;    break;
    default:
      console.error("Invalid writeMapping request", slot, type, dest);
      break;
  }
  if(typeof rel !== 'undefined' && (rel === true || rel > 0)) { t0 |= 32; }
  
  setConfigU8(loc+2, t0);
  setConfigU8(loc+3, t1);
}

function clearMapping(slot)
{
  const loc = 612+slot*4
  setConfigU8(loc,   0);
  setConfigU8(loc+1, 0);
  setConfigU8(loc+2, 0);
  setConfigU8(loc+3, 0);
}

function commonMapping(map, dest)
{
  let k = map.t1 & 0xf;
  if(k < 0 || k >= dest.length)
  {
    console.error("Invalid mapping", map);
    return;
  }
  map.dest = dest[k];
  return map;
}

function isSeqMap(map)
{
  return ( map.t1 >> 4 ) < 4;
}

function transformMappings(config)
{
  const mappings = Object.fromEntries(
    ["lfo", "arp", "seq", "dseq", "dseql", "mcv2", "mcv3", "mcv", "euc", "srr", "glb"]
      .map(key => [key, []])
  );
  
  let map = null;
  for(let i=0; i<384; ++i)
  {
    map = config.mappings[i];
    if(( map.channel >> 4 ) != 3) { continue; }
   
    map.slot     = i;
  	map.channel  = mapping.channel & 0xf;  # Lower Nibble Channel
		map.relative = ( map.t0 & 32 ) != 0;   # t0 bit 6 is set, thus relative check
		map.t0       = map.t0 & ~32;
		
    if(map.t0 <= 8) // lfo
    {
      map.dest = (t1 < 64 lfoLowControls ? lfoHighControls)[map.t0];
      if(map.dest !== null) mappings.lfo.push(map);
      continue;
    } 

    switch(map.t0)
    { 
      case  9: mappings.arp   .push(commonMapping(map, arpControls  )); break;
      case 10: mappings.euc   .push(commonMapping(map, eucControls  )); break;
      case 11: mappings.mcv   .push(commonMapping(map, mcvControls  )); break;
      case 12: mappings.mcv2  .push(commonMapping(map, mcv2Controls )); break;
      case 13: if(isSeqMap(map))
               { mappings.seq .push(commonMapping(map, seqControls  )); }
               else
               { mappings.dseq.push(commonMapping(map, dseqControls )); }
               break;
      case 14: mappings.dseql .push(commonMapping(map, dseqlControls)); break;
      case 15: mappings.ssr   .push(commonMapping(map, srrControls  )); break;
      case 16: mappings.mcv3  .push(commonMapping(map, mcv3Controls )); break;
      default: // 69-79, global
        if(map.t0 >= 69 && map.to <= 79)
        {
          map.dest = globalControls[map.t0-69];
          mappings.glb.push(map);
        }
        else { console.error("invalid controller mapping", map); }
        break;
    }
  }
  
  return mappings;
}
