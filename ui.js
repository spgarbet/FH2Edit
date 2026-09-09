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

// UI functions have a few categories
// - helpers to construct the interface
// - event handlers that write to the Sysex in memory

const flashModeKey        = "flashmode";

// Putters
function put(id, value  ) { document.getElementById(id).value   = value; }
function check(id, value) { document.getElementById(id).checked = value; }

// Getters
function get(id)          { return(document.getElementById(id).value);   }
function num(id)          { Number(get(id));                             }
function checked(id)      { return(document.getElementById(id).checked); }

// Helpers
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function capitalizeFirstLetter(str)
{
  if (!str) return ''; // Handle empty strings safely
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function nybbleChar( n )
{
	if ( n >= 10 ) { return String.fromCharCode( 'A'.charCodeAt( 0 ) + n - 10 ); }
	return String.fromCharCode( '0'.charCodeAt( 0 ) + n );
}


function optionRange(low, high, selected = null, valueOffset = 0)
{
  for ( let i=low; i<=high; ++i)
  {
    const isSelected = i === selected ? ' selected' : '';
    document.write(`<option value="${i-valueOffset}"${isSelected}>${i}</option>`);
  }
}

function u7PercentRange(selected = 0)
{
  for (let i=0; i<128; ++i)
  {
    const isSelected = i === selected ? ' selected' : '';
    document.write(`<option value="${i}"${isSelected}>${(100*i/127).toFixed(1)}&#37;</option>`);
  }
}

function dumpSysex( data, id )
{
	var len = data.length;
	var h   = "";
	for (var i=0; i<len; ++i)
	{
		var b = data[ i ];
		h += nybbleChar( b >> 4 );
		h += nybbleChar( b & 0xf );
		h += " ";
		if (( i & 0xf ) === 0xf) { h += "\n"; }
	} 
	document.getElementById(id).textContent = h + "\n";
}

function showChainPrompt(message, onConfirm)
{
  let prompt  = document.getElementById('chain-prompt');
  let msgEl   = document.getElementById('chain-prompt-message');
  let okBtn   = document.getElementById('chain-prompt-ok');

  msgEl.textContent = message;
  prompt.style.display = 'block';

  okBtn.onclick = function()
  {
    prompt.style.display = 'none';
    onConfirm();
  };
}

// Initializations
function initTooltips()
{
  const tooltips = document.querySelectorAll(".tooltip");

  for (const tooltip of tooltips)
  {
    const popup = document.createElement("span");

    popup.className = "tooltip-popup";
    popup.textContent = tooltip.dataset.tooltip;

    tooltip.appendChild(popup);

    tooltip.addEventListener("mouseenter", () =>
    {
      showTooltip(tooltip);
    });

    tooltip.addEventListener("mouseleave", () =>
    {
      hideTooltip(tooltip);
    });

    tooltip.addEventListener("focusin", () =>
    {
      showTooltip(tooltip);
    });

    tooltip.addEventListener("focusout", () =>
    {
      hideTooltip(tooltip);
    });
  }

  window.addEventListener("resize", updateTooltips);
  window.addEventListener("scroll", updateTooltips, true);
}


function showTooltip(tooltip)
{
  const popup = tooltip.querySelector(".tooltip-popup");
  if (!popup) { return; }
  popup.classList.add("visible");

  positionTooltip(tooltip);
}


function hideTooltip(tooltip)
{
  const popup = tooltip.querySelector(".tooltip-popup");
  if (!popup) { return; }
  popup.classList.remove("visible");
}


function positionTooltip(tooltip)
{
  const popup = tooltip.querySelector(".tooltip-popup");
  if (!popup || !popup.classList.contains("visible")) { return; }
  const anchor = tooltip.getBoundingClientRect();

  /*
   * Start with the tooltip above the control.
   * We need it visible before measuring it.
   */
  popup.style.left = "0px";
  popup.style.top = "0px";

  const popupRect = popup.getBoundingClientRect();

  const gap = 8;
  const margin = 8;

  const viewportWidth  = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;

  // Prefer above.
  let top = anchor.top - popupRect.height - gap;

  // If there isn't enough room above, put it below.
  if (top < margin) { top = anchor.bottom + gap; }

  // If it doesn't fit below either, clamp it vertically.
  if (top + popupRect.height > viewportHeight - margin)
  {
    top = Math.max(
      margin,
      viewportHeight - popupRect.height - margin
    );
  }

  // Center horizontally on the control.
  let left = anchor.left + (anchor.width - popupRect.width) / 2;

  // Keep the tooltip inside the left edge.
  if (left < margin) { left = margin; }

  // Keep the tooltip inside the right edge.
  if (left + popupRect.width > viewportWidth - margin)
  {
    left = viewportWidth - popupRect.width - margin;
  }

  // Apply the final position.
  popup.style.left = `${left}px`;
  popup.style.top  = `${top}px`;
}

function updateTooltips()
{
  const visible = document.querySelectorAll(
    ".tooltip-popup.visible"
  );

  for (const popup of visible)
  {
    positionTooltip(popup.parentElement);
  }
}

function initTabs()
{
  const tabs = document.querySelectorAll(".tab");
  const screens = document.querySelectorAll(".screen");

  for (const tab of tabs)
  {
    tab.addEventListener("click", () =>
    {
      const target = tab.dataset.target;

      for (const otherTab of tabs)
      {
        otherTab.classList.toggle("active", otherTab === tab);
      }

      for (const screen of screens)
      {
        screen.classList.toggle("active", screen.id === target);
      }
    });
  }
}

function initFileChooser()
{
  document.getElementById('chooseFiles').addEventListener('change', handleFileSelect, false);
}

// Main UI Functions

function updateFH2Status()
{
  const status = document.getElementById("fh2-status");  
  const text   = status;
  
  if(appState.compatible)
  {
    text.textContent = "FH-2: Connected";
    status.classList.remove("alarm");
  } else if(appState.connection)
  {
    text.textContent = "FH-2: Incompatible Version";
    status.classList.add("alarm");
  } else
  {
    text.textContent = "FH-2: Disconnected";
    status.classList.add("alarm");
  }
}

function updateBrowserStatus()
{
  const status = document.getElementById("browser-status");
  const text   = document.getElementById("browser-status-text");
  const popup  = status.querySelector(".tooltip-popup");
  
  if (appState.webMIDI)
  {
    text.textContent = "Browser: Web MIDI Enabled";
    status.classList.remove("tooltip");
    if(popup) { popup.remove(); }
  }
  else
  {
    text.textContent = "Browser: UNSUPPORTED";
    status.classList.add("alarm");
  }
}

function log(message)
{
  const logElement = document.getElementById("midi-log");
  const timestamp  = new Date().toLocaleTimeString();

  if (!logElement) { console.error("Log element missing", message); return; }
  logElement.textContent += `[${timestamp}] ${message}\n`;
  logElement.scrollTop = logElement.scrollHeight;
  
  document.getElementById('io-feedback').textContent = message;
}

function midiLogOut(sysex) { dumpSysex( sysex, "raw-midi-output" ); }
function midiLogIn(sysex)  { dumpSysex( sysex, "raw-midi-input" );  }	

// Simple forwards from view layer to midi operation
function onFlashPreset() { flashPreset(num('preset-slot')); }
function onFlashConfig() { flashConfig(num('config-slot')); }
function onReadScreen()  { readScreen();                    }
function onReadVersion() { readVersion();                   }
function onReadConfig()  { readConfig();                    }
function onReadPreset()  { readPreset();                    }
function onWriteConfig() { writeConfig();                   }
function onWritePreset() { writePreset();                   }

function onSavePreset()
{
  const blob    = new Blob([presetSysex], { type: "application/octet-stream" });
  const url     = URL.createObjectURL(blob);
  const link    = document.createElement("a");
  const name    = get("preset-name").trimEnd().replace(/[\\/:*?"<>|]/g, "_");
  const suffix  = name != "" ? "-" : "";
  link.href     = url;
  link.download = "preset"+suffix+name+".syx";
  link.click();

  URL.revokeObjectURL(url);
}

function onSaveConfig()
{
  const blob    = new Blob([configSysex], { type: "application/octet-stream" });
  const url     = URL.createObjectURL(blob);
  const link    = document.createElement("a");
  const name    = get("config-name").trimEnd().replace(/[\\/:*?"<>|]/g, "_");
  const suffix  = name != "" ? "-" : "";

  link.href     = url;
  link.download = "config"+suffix+name+".syx";
  link.click();

  URL.revokeObjectURL(url);
}

function onInitPreset()
{
  presetSysex = structuredClone(PRESET_DEFAULT_SYSEX);
  renderPreset(presetSysex);
}

function onInitConfig()
{
  configSysex = structuredClone(CONFIG_DEFAULT_SYSEX);
  renderConfig(configSysex);
}

function onLoad() { document.getElementById('chooseFiles').click(); }

function handleFileSelect(evt)
{
  let files = evt.target.files;

  if (!files || files.length === 0) { return; }

  for (let i = 0; i < files.length; i++) { readSysexFile(files[i]); }
}

function readSysexFile(f)
{
  let reader = new FileReader();

  reader.onload = function(e)
  {
    processSysexData(new Uint8Array(e.target.result), f.name);
  };

  reader.readAsArrayBuffer(f);
}

function processSysexData(arr, filename)
{
  let hasValidHeader = 
    FH2_SYSEX_HEADER.every(function(byte, i) { return arr[i] === byte; });
  if(  arr.length < 7
		|| !hasValidHeader
		|| (arr[5] != 0x10 && arr[5] != 0x13)
    || arr[arr.length - 1] != 0xF7)
  {
    alert("Not a valid sysex file: "+filename);
    log("Invalid syex file: "+filename);
    return;
  }
  
  if (arr[5] == 0x10) // Config
  {
    if (renderConfig(arr)) { configSysex = arr; }
    log("Loaded configuration "+filename);
  }
  else // Must be 0x13 Preset
  {
    if (renderPreset(arr)) { presetSysex = arr; }
    log("Loaded preset "+filename);
  }
}

// Compound Ops
function onSave()        { onSavePreset();  onSaveConfig();  }
function onWrite()       { onWritePreset(); onWriteConfig(); }
async function onRead()  { onReadPreset();  await sleep(500); onReadConfig();  }
function onFlash()       { onFlashPreset(); onFlashConfig(); }
function onInitialize()  { onInitPreset();  onInitConfig();  }
