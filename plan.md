# FH2Editor Plan

## Known Bugs

- Changing expanders loses focus on LFO

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

## In Process

- (ICON-Criss Cross) 16 Shift Registers (8 channel/cc)

## TODO

- Outputs
  - (ICON-Drums) 16 Euclidean Patterns, (7 channel/cc)
  - (ICON-Lightning) 64 Triggers Independent like clocks, (? channel/cc)
  - (ICON-Envelope) A separate editor for the Envelope (13 channels/cc)
  - (ICON-Arpeggiator) A separate editor for the Arp (13 channels/cc)
- Tunings 32 slots for Scala/Keyboard
- MIDI Routing - A visual display of all MIDI routes.
- Outputs (cont)
  - (ICON-Game Controller) 32 HID Gamepad, assign to output
  - (ICON-Keyboard) 32 HID Keyboard, assign to output
  - (ICON ? ) ? Novation Pad This is so far down the list I will probably never do it
- Gates tab (edit things on Gates like Expanders)
  
## Notes

An Envelope if enabled is associated with a MIDI/CV

An Arp is associated with a MIDI/CV, it has a mode 0-10 that turns it off (and a cc)

Euclidean can produce output on
- Output Port VelGate/Trig (anywhere or none)
- Output Port Off VelGate/Trig (anywhere or none)

Sequencer is utterly confusing 64 checkbox triggers (preset)?, sequencer bank/drum requests?
  - 4x4 4 channel MIDI 32 step sequencer  (spits MIDI out)
  - 1x26 1 drum 32 step sequencer         (spits trigs out)

## Questions

- What is the scale of portamento? 0-127 means what?
