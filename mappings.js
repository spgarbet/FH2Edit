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

// # Returns 0-363, or -1 if none found
function nextMappingSlot()
{
  
}

// Or should this be writeMapping(slot, type, rec) ?
function writeMapping(slot, type, dest, channel, cc, rel)
{

}

function clearMapping(slot)
{
  
}

//  Returns list of transformed mappings, keyed by type somehow
function transformMappings(config)
{
  
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

function transformConfigMappings(config)
{
  const mappings = Object.fromEntries(
    ["lfo", "arp", "seq", "dseq", "dseql", "mcv2", "mcv3", "mcv", "euc", "srr", "glb"]
      .map(key => [key, []])
  );
  
  for(let map in config.mappings)
  {
    if(( map.channel >> 4 ) != 3) { continue; }
  
  	map.channel  = mapping.channel & 0xf;  # Lower Nibble Channel
		map.relative = ( map.t0 & 32 ) != 0;  # t0 bit 6 is set, thus relative check
		map.t0       = map.t0 & ~32;
    if(map.t0 <= 8) // lfo
    {
      map.dest = (t1 < 64 lfoLowControls ? lfoHighControls)[map.t0];
      if(map.dest !== null) mappings.lfo.push(map);
      continue;
    } 

    switch(map.t0)
    { 
      case  9: mappings.arp.push(  commonMapping(map, arpControls  )); break;
      case 10: mappings.euc.push(  commonMapping(map, eucControls  )); break;
      case 11: mappings.mcv.push(  commonMapping(map, mcvControls  )); break;
      case 12: mappings.mcv2.push( commonMapping(map, mcv2Controls )); break;
      case 13: // seq and dseq
// FIXME, weird case
        break;
      case 14: mappings.dseql.push(commonMapping(map, dseqlControls)); break;
      case 15: mappings.ssr.push(  commonMapping(map, srrControls  )); break;
      case 16: mappings.mcv3.push( commonMapping(map, mcv3Controls )); break;
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
