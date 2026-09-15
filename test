function testMapping(mapping)
{
  writeMapping(
    mapping.slot,
    mapping.type,
    mapping.index,
    mapping.dest,
    mapping.channel,
    mapping.cc,
    mapping.relative
  );

  const raw    = parseMapping(new ByteReader(configSysex), mapping.slot);
  const result = transformMapping(raw, mapping.type, mapping.index, mapping.dest);

  console.assert(
    JSON.stringify(result) === JSON.stringify(mapping),
    "Mapping round-trip failed",
    mapping,
    result
  );
}

function testAllMappings()
{
  const types =
  {
    lfo:   [lfoLowControls, lfoHighControls],
    arp:   [arpControls],
    euc:   [eucControls],
    mcv:   [mcvControls],
    mcv2:  [mcv2Controls],
    seq:   [seqControls],
    dseq:  [dseqControls],
    dseql: [dseqlControls],
    srr:   [srrControls],
    mcv3:  [mcv3Controls],
    glb:   [globalControls]
  };

  for (const [type, tables] of Object.entries(types))
  {
    for (const table of tables)
    {
      for (let index = 0; index < table.length; ++index)
      {
        const dest = table[index];
        if (dest === null) { continue; }

        testMapping(
          {
            slot:     Math.floor(Math.random() * 364),
            channel:  Math.floor(Math.random() *  16),
            cc:       Math.floor(Math.random() * 128),
            relative: Math.random() < 0.5,
            type,
            index:    Math.floor(Math.random() *  16),
            dest
          }
        );
      }
    }
  }
}