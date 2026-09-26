# FH2Editor Plan

## Known Bugs

- SRR is not populating icons on startup.
  Are all the CV outputs set really?, oh, it's could be the "enabled definition"
  Enabled: A CV output is set on *any* and the (Direction is not STOP or a MIDI mapping exists)

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

## In Process

Testing

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

There are 3 remaining major types of output configuration: Envelopes, Arps, and Euclidean. 

An Envelope if enabled is associated with a MIDI/CV and has envelope checked (connecting it to an output as chain). An alternative method of utilizing one of these if via a trigger in envelope mode. 

An Arp is associated with a MIDI/CV, it has a mode 0-10 that turns it off (and a cc). An Arp is
enabled for a MIDI/CV if either the Arp mode is non-zero or it has an assigned cc.

The Euclidean is very much like the SRR, but has two output ports that can be anywhere or none.

Obviously Euclidean fits directly into the same style as SRR. The outstanding question is how to handle the Envelope and Arp. I was thinking that it could be an additional icon with an output editor. The icon to add an Envelope or Arp is only active if a MIDI/CV primary is present. 


Sequencer is utterly confusing 64 checkbox triggers (preset)?, sequencer bank/drum requests?
  - 4x4 4 channel MIDI 32 step sequencer  (spits MIDI out)
  - 1x26 1 drum 32 step sequencer         (spits trigs out)

## Questions

- What is the scale of portamento? 0-127 means what?
