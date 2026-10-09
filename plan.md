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
  - (ICON-Gamepad)  HID Gamepad, assign to output
  - (ICON-Keyboard) HID Keyboard, assign to output
- Drum sequencer
- Sequencer

## In Process

- Better defaults for gamepad. 

## TODO

- MIDI Mapping Learn mode
- MIDI Map display routes page
- Testing
  - All the Arps
  - Envelopes
  - Drum Sequencer
- Read/Write sequences from Novation
- Deal properly with Gate expanders

### Separate project

The tunings scala/keyboard interface lacks a means to read what's on the device.
Any state presented could be invalid, unless the editor was the only program
that did the editing. It would be nice to have labeled dropdowns, but I'm 
thinking having another program to upload scala is the way to go. 

## Questions

- What is the scale of portamento? 0-127 means what?
- Do paraphonic outputs still maintain stride?
