# FH2Edit Plan

## Known Bugs

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

- Drum sequencer
  - Hook up reading values
  - Hook writing values
- Sequencer
  - Hook up reading values
  - Hook up writing values.
  - Fix MIDI Mapping buttons.

## TODO

- MIDI Mapping Learn mode
- MIDI Map display routes
- Testing
  - All the Arps
  - Envelopes
- Tunings 32 slots for Scala/Keyboard
  - Use local memory? 
- Outputs
  - (ICON-Gamepad) HID Gamepad, assign to output
  - (ICON-Keyboard) HID Keyboard, assign to output
- Read/Write sequences from Novation
- Deal properly with Gate expanders
 
## Questions

- What is the scale of portamento? 0-127 means what?
- When in configuration trigger can a note be set to "--"? What value is that? -1?
- Do paraphonic outputs still maintain stride?
