# FH2Editor Plan

## Known Bugs

- Changing expanders loses focus on LFO
- Default configuration has every LFO turned on. 

## In Process

- 2 CV to MIDI X/Y ins

## Completed

- I/O
  - Select MIDI ports
  - Read/Write sysex to file
  - Read/Write sysex from FH-2
  - Read Screen
  - Flash
  - [Internal] MIDI Retry strategy with confirmation
- [Internal] Data structure for MIDI channel/cc mappings (384 limit)
- Globals
  - Preset
  - Config
  - 8 Global channel/cc mappings (start/stop, etc)
- Outputs
  - (ICON-Clock) Clock assign to output
  - (ICON-Sine) LFO assign to output with MIDI

## TODO

- Outputs
  - (ICON-Keys) 16 Midi to CV
    - Main
    - Envelope (13 channel/cc)
    - Arpeggiator (13 channel/cc)
    - Tuning
    - Ghost icons to show consumed outputs.
  - (ICON-Criss Cross) 16 Shift Registers (8 channel/cc)
  - (ICON-Drums) 16 Euclidean Patterns, (7 channel/cc)
  - (ICON-Lightning) 64 Triggers, (? channel/cc)
- Tunings 32 slots for Scala/Keyboard
- Gates tab (edit things on Gates like Expanders)
- Outputs (cont)
  - (ICON-Game Controller) 32 HID Gamepad, assign to output
  - (ICON-Keyboard) 32 HID Keyboard, assign to output
  - (ICON ? ) ? Novation Pad This is so far down the list I will probably never do it
  
## Not Understood

Sequencer is utterly confusing 64 checkbox triggers (preset)?, sequencer bank/drum requests?
  - 4x4 4 channel MIDI 32 step sequencer  (spits MIDI out)
  - 1x26 1 drum 32 step sequencer         (spits trigs out)
