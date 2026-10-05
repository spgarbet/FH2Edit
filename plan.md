# FH2Edit Plan

## Known Bugs

- Tempo limits from configuration seem to be missing

## Completed

- I/O
  - Select MIDI ports
  - Read/Write sysex to file
  - Read/Write sysex from FH-2
  - Read Screen
  - Flash
  - [Internal] MIDI Retry strategy with confirmation
- Internals Data structure for MIDI channel/cc mappings (384 limit)
- Globals
  - Preset
  - Config
  - 8 Global channel/cc mappings (start/stop, etc)
  - CV/MIDI X Y
- Outputs
  - (ICON-Clock) Clock assign to output
  - (ICON-Sine) LFO assign to output with MIDI
  - (ICON-Keys) MAIN 16 Midi to CV
  - (ICON-Criss Cross) 16 Shift Registers
  - (ICON-Drums) 16 Euclidean Patterns
  - (ICON-Envelope) A separate editor for the Envelope
  - (ICON-Arpeggiator) A separate editor for the Arp
  - (ICON-Lightning) Triggers

## In Process

- Drum sequencer!

## TODO

- MIDI Mapping Learn mode
- Testing
  - All the Arps
  - Envelopes
- Tunings 32 slots for Scala/Keyboard
- Outputs
  - (ICON-Gamepad) HID Gamepad, assign to output
  - (ICON-Keyboard) HID Keyboard, assign to output
  - (ICON-Grid) Novation Pad/Sequencer
  
## Questions

- What is the scale of portamento? 0-127 means what?
- When 64 is the center of a value that goes from -100% to 100% over 0 to 127, does the slope change either side of 64 since 63.5 is the center of 0 to 127?
- When in configuration trigger can a note be set to "--"? What value is that? -1?
- Is there a sysex to read the tunings?
- Do paraphonic outputs still maintain stride?
