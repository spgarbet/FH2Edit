# FH2Editor Plan

## Known Bugs

* Changing expanders loses focus on LFO
* Default configuration has every LFO turned on. 

## In Process

* Need to index MIDI mapping buttons in LFO editor
* Need to add speed / clock MIDI mapping buttons

## Completed

- I/O
  - Select MIDI ports
  - Read/Write sysex to file
  - Read/Write sysex from FH-2
  - Read Screen
  - Flash
  - [Internal] MIDI Retry strategy with confirmation
- Globals
  - Preset
  - Config
- Outputs
  - (ICON-Clock) Clock assign to output
  - (ICON-Sine) LFO assign to output
- [Internals] Data structure for MIDI channel/cc mappings (364 limit)

## TODO

- Global
  - 2 CV to MIDI X/Y ins
  - 8 Global channel/cc mappings (start/stop, etc)
- Outputs
  - (ICON-Sine) ADD: channel/cc mappings
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
