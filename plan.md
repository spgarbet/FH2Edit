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

## In Process

- (ICON-Lightning) 64 Triggers Independent like clocks

## TODO

- MIDI Mapping Learn mode
- Testing
  - Flash
  - MIDI/CV Center effects
  - All the Arps
- Tunings 32 slots for Scala/Keyboard
- Outputs
  - (ICON-Gamepad) HID Gamepad, assign to output
  - (ICON-Keyboard) HID Keyboard, assign to output
  - (ICON-Grid) Novation Pad/Sequencer. Probably not going to do.
  
## Notes

Sequencer is utterly confusing 64 checkbox triggers (preset)?, sequencer bank/drum requests?
  - 4x4 4 channel MIDI 32 step sequencer  (spits MIDI out)
  - 1x26 1 drum 32 step sequencer         (spits trigs out)

## Questions

- What is the scale of portamento? 0-127 means what?
- Why does every output go red with my default configuration that I send?
- When 64 is the center of a value that goes from -100% to 100% over 0 to 127, does the slope change either side since 63.5 is the center of 0 to 127?
- When in configuration trigger can a note be set to "--"? What value is that? -1

