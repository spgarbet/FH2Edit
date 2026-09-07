// FH2Edit An Expert Sleepers Configuration/Preset Edit Tool
// Copyright (C) 2026 Shawn Garbett
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

let midi = null;

async function initMIDI()
{
  log('Initializing MIDI');
  
  if (typeof navigator.requestMIDIAccess !== "function") { return false; }

  try
  {
    midi = await navigator.requestMIDIAccess({ sysex: true });
    return true;
  }
  catch (error)
  {
    console.error("Unable to access Web MIDI:", error);
    return false;
  }
}

function readVersion()
{
  // FIXME: delete this for a release version, left for reference
  // console.trace("readVersion()");
  let output = midi.outputs.get( document.getElementById( "midi-output" ).value );
	let sysex = [ 0xF0, 0x00, 0x21, 0x27, 0x2F, 0x22, 0xF7 ];
	output.send( sysex );
	log( "Version requested" );
	midiLogOut(sysex);
}

function checkConnection()
{
  // If a check is called for, the state reversion occurs until proven otherwise
  appState.connected  = false;
  appState.compatible = false;
  readVersion();
}

function updateMIDIInput()
{
  var inputSelector  = document.getElementById("midi-input");
  var selectedInput  = inputSelector.value;
  var str            = "";
  var inputs         = midi.inputs.values();
  for (var input = inputs.next(); input && !input.done; input = inputs.next())
  {
    str += "<option value='" + input.value.id + "'>" + input.value.name + "</option>";
  }
  if(str == "")
  {
    inputSelector.innerHTML = '<option value="">None Available</option>';
  } else
  {
    inputSelector.innerHTML = str;
  }
  var inputFound = false;
  
  // Does the selected input match last selection?
  for(var i=0; i<inputSelector.options.length; ++i)
  {
    if(inputSelector.options[i].text == fh2InPortName)
    {
      inputSelector.selectedIndex = i;
      inputFound = true;
      break;
    }
  }
  // If it wasn't found, fall back to default
  if (!inputFound)
  {
    for (var i=0; i<inputSelector.options.length; ++i)
    {
      if (inputSelector.options[i].text.startsWith("FH-2"))
      {
        inputSelector.selectedIndex = i;
        break;
      }
    }
  }
  return selectedInput != inputSelector.value;
}

function updateMIDIOutput()
{
  var outputSelector = document.getElementById("midi-output");
  var selectedOutput = outputSelector.value;
  var str            = "";
  var outputs        = midi.outputs.values();
  for (var output = outputs.next(); output && !output.done; output = outputs.next())
  {
    str += "<option value='" + output.value.id + "'>" + output.value.name + "</option>";
  }
  if(str == "")
  {
    outputSelector.innerHTML = '<option value="">None Available</option>';
  } else
  {
    outputSelector.innerHTML = str;
  }
  
  var outputFound          = false;

  // Does the selected output match last selection?
  for(var i=0; i<outputSelector.options.length; ++i)
  {
    if(outputSelector.options[i].text == fh2OutPortName)
    {
      outputSelector.selectedIndex = i;
      outputFound = true;
      break;
    }
  }
  // If it wasn't found, fall back to default
  if (!outputFound)
  {
    for (var i=0; i<outputSelector.options.length; ++i)
    {
      if (outputSelector.options[i].text.startsWith("FH-2"))
      {
        outputSelector.selectedIndex = i;
        break;
      }
    }
  }
  
  return selectedOutput != outputSelector.value;
}

function onMIDIMessage(message)
{
  var data   = message.data;
  
  // Check if it's an FH-2 message, ignore if not
  var header = [ 240, 0, 33, 39, 47 ];
  for (var i=0; i<5; ++i) { if ( header[i] != data[i] ) { return; } }
  midiLogIn(data);
	if ( data[5] == 0x32 )
	{
	  var str = String.fromCharCode.apply(null, data.slice( 6, -1 ));
	  appState.connection = true;
	  log("Received version "+str);
	  appState.compatible = str.startsWith("2.");
	}
	else if ( data[5] == 0x13 )
	{
		log("Received preset");
		// parsePreset( data.slice( 8, -1 ) );
	}	else if ( data[5] == 0x10 ) 
	{
		log("Received configuration");
		// parseConfig( data.slice( 8, -1 ) );
	} else if ( data[5] == 0x4C )
	{
		log("Received pad");
		// parsePad( data.slice( 6, -1 ) );
	} else if ( data[5] == 0x33 )
	{
	  log("Received screenshot");
		//parseScreenshot( data.slice( 8, -1 ) );
	} else
	{
	  log("Received unknown sysex");
	}
	updateFH2Status();
}

function onStateChange()
{
  var inputChanged  = updateMIDIInput();
  if (inputChanged)
  {
    var input = midi.inputs.get( document.getElementById( "midi-input" ).value );
  	input.onmidimessage = onMIDIMessage;
  }
	
  var outputChanged = updateMIDIOutput();
  if (outputChanged) { checkConnection(); }
}

// Save the selected MIDI port to persistent storage
function changeInput()
{
	let inputSelector = document.getElementById("midi-input");
	if (inputSelector.value != "")
	{
	  fh2InPortName = inputSelector.options[inputSelector.selectedIndex].text;
    localStorage.setItem(fh2MIDIInKey, fh2InPortName);
	}
}
function changeOutput()
{
	var outputSelector = document.getElementById("midi-output"); 
  if (outputSelector.value != "")
  {
    fh2OutPortName = outputSelector.options[outputSelector.selectedIndex].text;
    localStorage.setItem(fh2MIDIOutKey, fh2OutPortName);
  }
}

async function initApplication()
{
  // Check for WebMIDI
  appState.webMIDI = await initMIDI();

  updateBrowserStatus();

  if (!appState.webMIDI) { log("ERROR: web-midi not enabled"); return; }

  midi.onstatechange = onStateChange;
  onStateChange();
}

const fh2MIDIInKey       = "fh2MIDIInKey";
const fh2MIDIOutKey      = "fh2MIDIOutKey";
const defaultFH2PortName = "FH-2";
var   fh2InPortName      = localStorage.getItem(fh2MIDIInKey)  || defaultFH2PortName;
var   fh2OutPortName     = localStorage.getItem(fh2MIDIOutKey) || defaultFH2PortName;