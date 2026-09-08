# FH2Edit
A user oriented configuration tool for the Expert Sleepers FH-2.

[Expert Sleepers](https://www.expert-sleepers.co.uk/) have graciously provided
[open source editors](https://github.com/expertsleepersltd/FH-2_tools) for
their [FH-2](https://www.expert-sleepers.co.uk/fh2.html) Eurorack MIDI/CV
converter and utilities. This project is complementary to their product and
does not change the need for their official provided one. This effort
would not exist without Expert Sleepers openly sharing their tool, code,
and sysex specification. Much gratitude for their community support.

How is it complementary and what does it add? The official tool is very 
much focused on the machine layout and it's internal structure. This tool
takes the viewpoint of an electronic musician and their needs. This interface
seeks to have clear visual and intuitive feedback about the state of an output
port, and the ability to quickly edit it's options without visual clutter
or wondering the meaning of 8192 when saying '50%' would be clearer.

Another way to look at it is the viewpoint of the task, "Expose all
machine operations in an atomic manner", or "As a user I want to put something, 
e.g. LFO, on a specified port.". The later is directly in the users interest,
but couldn't exist without the first being complete.

One key point is that it will handle checking communication state and
preset/configuration are done together. The main editor focused on ports.

It is still undergoing development and will remain woefully incomplete for
a good while. It will have bugs and issues, but participation in it's build
is encouraged.
