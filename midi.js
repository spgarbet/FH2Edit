// FH2Edit An Expert Sleepers FH-2 Configuration/Preset Edit Tool
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

let   midi = null;
const FH2_SYSEX_HEADER = [ 0xF0, 0x00, 0x21, 0x27, 0x2F ];

async function initWebMIDI()
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

function makeSysex(request)
{
  return FH2_SYSEX_HEADER.concat(request).concat([0xF7]);
}

function midiOutput()
{
  return midi.outputs.get( get( "midi-output" ));
}

function request(id, logMsg, check=true)
{
  if(check && !isCompatible(logMsg)) { return; }
  
  var sysex = makeSysex(id);
	midiOutput().send(sysex);
	log( logMsg );
	midiLogOut(sysex);
}

function readScreen()  { request([0x01], "Take screenshot"  );  }
function readVersion() { request([0x22], "Version requested", false);  }
function readConfig()  { request([0x21], "Config requested" );  }
function readPreset()  { request([0x23], "Preset requested" );  }

function isCompatible(name)
{
  if(appState.compatible) { return true; }
  log("Unable to "+name);
  return false;
}

// Slot 0 means the current preset slot
function flashPreset(slot)
{
  if(!isCompatible('flash preset')) { return; }
  
  if (!Number.isInteger(slot) || slot < 0 || slot > 30)
  {
    alert("flashPreset() invalid slot");
    return;
  }
  request([0x19, slot], "Flash preset");
}
function flashConfig(slot)
{
  if(!isCompatible('flash config')) { return; }
  
  if (!Number.isInteger(slot) || slot < 0 || slot > 30)
  {
    alert("flashConfig() invalid slot");
    return;
  }
  console.log("Slot: "+slot);
  request([0x18, slot], "Flash configuration");
}

function writeMessage()
{
  if(!isCompatible('write message')) { return; }
    
  var text = "Hello!\nThis message\nwas sent from\nthe config tool.";
  var request = [0x02];
  for (var i = 0; i < text.length; ++i) { request.push(text.charCodeAt(i)); }
  var sysex = makeSysex(request);
  midiOutput().send(sysex);
  log("Sent message");
  midiLogOut(sysex);
}

async function retryPreset()
{
  for (let i=0; i<4; ++i)
  {
    await new Promise(resolve => setTimeout(resolve, 750));

    if (!appState.presetReq) { break; }

    midiOutput().send(presetSysex);
    log("Retried preset");
    midiLogOut(presetSysex);
  }
  if(!appState.presetReq && checked('flash-mode'))
  { 
    flashPreset(num('preset-slot')); 
  }
  appState.presetReq = false; // Make sure to give up
}

function writePreset()
{
  if(!isCompatible('write preset')) { return; }
  
  appState.presetReq = true;
 
  midiOutput().send(presetSysex);
  log("Sent preset");
  midiLogOut(presetSysex);
  
  // The FH-2 sysex timing cannot reliably receive large sysex from Linux/mioXL
  // This will do a number of retries that will hopefully hit the magic timing.
  retryPreset();
}

async function retryConfig()
{
  for (let i=0; i<4; ++i)
  {
    await new Promise(resolve => setTimeout(resolve, 750));

    if (!appState.configReq) { break; }

    midiOutput().send(configSysex);
    log("Retried config");
    midiLogOut(configSysex);
  }
  if(!appState.configReq && checked('flash-mode'))
  { 
    configPreset(num('config-slot')); 
  }
  appState.configReq = false; // Make sure to give up
}

function writeConfig()
{
  if(!isCompatible('write config')) { return; }
  
  appState.configReq = true;
 
  midiOutput().send(configSysex);
  log("Sent configuration");
  midiLogOut(presetSysex);
  
  // The FH-2 sysex timing cannot reliably receive large sysex from Linux/mioXL
  // This will do a number of retries that will hopefully hit the magic timing.
  retryConfig();
}

function checkConnection()
{
  // If a check is called for, the state reversion occurs until proven otherwise
  appState.connection = false;
  appState.compatible = false;
  updateFH2Status();
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
  if (data[5] == 0x22) { return; } // Asking if this is an FH-2! Loopback
  midiLogIn(data);
  
  appState.connection = true;
	if ( data[5] == 0x32 && data[6] == 0x76 ) // Version
	{
	  var str = String.fromCharCode.apply(null, data.slice(7, -1 ));

	  log("Received version "+str);
	  appState.compatible = str.startsWith("2.");
	}
	else if ( data[5] == 0x32 && data[6] == 0x70) // Preset OK
	{
	  appState.presetReq = false;
	  log(capitalizeFirstLetter(String.fromCharCode.apply(null, data.slice(6, -1))));
	}
	else if ( data[5] == 0x32 && data[6] == 0x63) // Config OK
	{
	  appState.configReq = false;
	  log(capitalizeFirstLetter(String.fromCharCode.apply(null, data.slice(6, -1))));
	}
	else if ( data[5] == 0x13 )
	{
		log("Received preset");
		if ( renderPreset( data ) ) { presetSysex = data; }
	}	else if ( data[5] == 0x10 ) 
	{
		log("Received configuration");
		if ( renderConfig( data ) ) { configSysex = data; }
	} else if ( data[5] == 0x4C )
	{
		log("Received pad");
		// renderPad( data.slice( 6, -1 ) );
	} else if ( data[5] == 0x33 )
	{
	  log("Received screenshot");
		renderScreenshot( data );
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
    var input = midi.inputs.get( get( "midi-input" ) );
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

async function initMIDI()
{
  // Check for WebMIDI
  appState.webMIDI = await initWebMIDI();

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