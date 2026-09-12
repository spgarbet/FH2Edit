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


// UI State and Keys
const flashModeKey        = "flashmode";
const expandersKey        = "expanders";

const iconState =
{
  midi:  Array.from({ length: 16 }, () => ({ enabled: false, output: null })),
  clock: Array.from({ length: 32 }, () => ({ enabled: false, output: null })),
  lfo:   Array.from({ length: 64 }, () => ({ enabled: false, output: null }))
};

let selectedIcon   = null;
let selectedOutput = null;

const ICON_DEFS =
{
  midi:      { label: "MIDI",       src: "icons/midi.png",     total: 16 },
  lfo:       { label: "LFO",        src: "icons/lfo.png",      total: 64 },
  clock:     { label: "Clock",      src: "icons/clock.png",    total: 32 } /*,
  control:   { label: "Controller", src: "icons/clock.png",    total: 32 },
  arp:       { label: "Arpeggiator",src: "icons/arp.png",      total: 32 },
  envelope:  { label: "Envelope",   src: "icons/envelope.png", total: 32 },
  euclid:    { label: "Euclidean",  src: "icons/rhythm.png",   total: 32 },
  sequencer: { label: "Sequencer",  src: "icons/sequencer.png",total: 32 },
  shift_reg: { label: "Shift Reg",  src: "icons/shift_reg.png",total: 32 } */
};

// Elements
function elem(id)         { return document.getElementById(id); }

// Putters
function put(id, value  ) { elem(id).value   = value;           }
function check(id, value) { elem(id).checked = value;           }

// Getters
function get(id)          { return(elem(id).value);             }
function num(id)          { Number(get(id));                    }
function checked(id)      { return(elem(id).checked);           }

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
    const isSelected = String(i) === String(selected) ? ' selected' : '';
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
	elem(id).textContent = h + "\n";
}

function showChainPrompt(message, onConfirm)
{
  let prompt  = elem('chain-prompt');
  let msgEl   = elem('chain-prompt-message');
  let okBtn   = elem('chain-prompt-ok');

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
  elem('chooseFiles').addEventListener('change', handleFileSelect, false);
}

function buildOutputs()
{
  const list      = elem("outputs-list");
  const expanders = Number(localStorage.getItem(expandersKey)) || 0;

  for (let unit = 0; unit < 8; ++unit)
  {
    const element       = document.createElement("div");
    element.id          = "outputs-unit" + unit;
    element.className   = "outputs-unit";
    element.hidden      = unit > expanders;
    const panel         = document.createElement("div");
    panel.className     = "outputs-panel";
    panel.style.gridRow = "1 / span 8";
    panel.innerHTML =
      "<img src=\"" +
      (unit === 0 ? "assets/fh-2-panel.png" : "assets/fhx-8cv-panel.png") +
      "\" alt=\"FH-2 output panel\">";
    
    element.appendChild(panel);

    for (let output = 0; output < 8; ++output)
    {
      const number       = document.createElement("div");
      number.className   = "outputs-output";
      number.textContent = (unit === 0 ? "" : unit+ "/") + (output + 1);
      const range        = document.createElement("select");
      const loc          = unit*8+output;
      range.id           = "rng_"+loc;
      range.className    = "outputs-range";
      range.innerHTML    = "<option value=0>0-10V</option><option value=1>&plusmn;5V</option><option value=2>0-1V</option><option value=3>0-5V</option><option value=4>0-8V</option>";
      
      const lowGate      = document.createElement("input");
      lowGate.id         = "lowgate_"+loc;
      lowGate.type       = "range";
      lowGate.min        = 0;
      lowGate.max        = 16383;
      
      const highGate      = document.createElement("input");
      highGate.id         = "highgate_"+loc;
      highGate.type       = "range";
      highGate.min        = 0;
      highGate.max        = 16383;
      
      range.addEventListener("change", function(){setConfigU8(loc+36, this.value);});
      
      const icons        = document.createElement("div");
      icons.id           = "outputs-unit"+unit+"-icons" + output;
      icons.className    = "outputs-icon";
    
      element.appendChild(number);
      element.appendChild(range);
      element.appendChild(lowGate);
      element.appendChild(highGate);
      element.appendChild(icons);
      
      renderOutputIcons(loc, icons);
    }

    list.appendChild(element);
  }
}

// Main UI Functions

function updateFH2Status()
{
  const status = elem("fh2-status");  
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
  const status = elem("browser-status");
  const text   = elem("browser-status-text");
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
  const logElement = elem("midi-log");
  const timestamp  = new Date().toLocaleTimeString();

  if (!logElement) { console.error("Log element missing", message); return; }
  logElement.textContent += `[${timestamp}] ${message}\n`;
  logElement.scrollTop = logElement.scrollHeight;
  
  elem('io-feedback').textContent = message;
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

function onLoad() { elem('chooseFiles').click(); }

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

function setExpanders(v)
{
  localStorage.setItem(expandersKey, v);
  
  const expanders = Number(localStorage.getItem(expandersKey)) || 0;
  for (let unit = 0; unit < 8; ++unit)
  {
    elem('outputs-unit'+unit).hidden = unit > expanders;
  }
}

// Icon Code

function nextAvailableIcon(type)
{
  const state = iconState[type];

  for (let i = 0; i < state.length; ++i)
  {
    if (!state[i].enabled) { return i; }
  }

  return -1;
}

function canAddLfo(output) { return !iconState.lfo[output].enabled; }

function addIcon(type, output)
{
  let index;
  const previousOutput = selectedIcon ? selectedIcon.output : null;


  if (type === "lfo")
  {
    if (iconState.lfo[output].enabled) { return false; }
    index = output;
  }
  else
  {
    index = nextAvailableIcon(type);
    if (index < 0) { return false; }
  }

  iconState[type][index].enabled = true;
  iconState[type][index].output = output;

  selectedIcon =
  {
    type:   type,
    index:  index,
    output: output
  };

  selectedOutput = output;

  if (previousOutput !== null && previousOutput !== output)
  {
    renderOutputIconsFor(previousOutput);
  }
  renderOutputIconsFor(output);
  renderOutputEditor();

  return true;
}


function removeIcon(type, index)
{
  const icon = iconState[type][index];

  if (!icon.enabled) { return; }
  
  const output = icon.output;

  icon.enabled = false;
  icon.output = null;

  selectedIcon   = null;
  selectedOutput = output;

  renderOutputIconsFor(output);
  renderOutputEditor();
}

function selectIcon(type, index, output)
{
  selectedIcon =
  {
    type: type,
    index: index,
    output: output
  };

  selectedOutput = output;

  renderOutputs();
  renderOutputEditor();
}

function renderOutputIcons(output, container)
{
  container.replaceChildren();

  const addButton     = document.createElement("button");
  addButton.type      = "button";
  addButton.className = "outputs-icon-add";
  addButton.title     = "Add output source";
  const addImage      = document.createElement("img");
  addImage.src        = "icons/curly-plus.png";
  addImage.alt        = "Add";

  addButton.appendChild(addImage);

  addButton.addEventListener("click", function(event)
  {
    event.stopPropagation();
    showIconPicker(output, addButton);
  });

  container.appendChild(addButton);

  for (let type of ["midi", "lfo", "clock"])
  {
    const state = iconState[type];

    for (let i = 0; i < state.length; ++i)
    {
      if (!state[i].enabled || state[i].output !== output) { continue; }

      const button = document.createElement("button");

      button.type = "button";
      button.className = "outputs-icon-item";

      if (
        selectedIcon &&
        selectedIcon.type === type &&
        selectedIcon.index === i
      )
      {
        button.classList.add("selected");
      }

      button.title = ICON_DEFS[type].label + " " + (i + 1);

      const image = document.createElement("img");

      image.src = ICON_DEFS[type].src;
      image.alt = ICON_DEFS[type].label;

      button.appendChild(image);

      button.addEventListener("click", function()
      {
        selectIcon(type, i, output);
      });

      container.appendChild(button);
    }
  }
}

function buildIconPicker()
{
  const picker = elem("icon-picker");

  for (let type of ["midi", "lfo", "clock"])
  {
    const button        = document.createElement("button");
    button.type         = "button";
    button.className    = "icon-picker-item";
    button.dataset.type = type;
    const image         = document.createElement("img");
    image.src           = ICON_DEFS[type].src;
    image.alt           = ICON_DEFS[type].label;

    button.appendChild(image);

    button.addEventListener("click", function(event)
    {
      event.stopPropagation();
      
      const output = Number(picker.dataset.output);

      if(addIcon(type, output)) { hideIconPicker(); }
    });

    picker.appendChild(button);
  }
}

function showIconPicker(output, anchor)
{
  const picker = elem("icon-picker");

  picker.dataset.output = output;

  for (const button of picker.children)
  {
    const type = button.dataset.type;
    const available = 
      type === "lfo"
        ? !iconState.lfo[output].enabled
        : nextAvailableIcon(type) >= 0;

    button.disabled = !available;
    button.classList.toggle("disabled", !available);
  }

  const rect = anchor.getBoundingClientRect();

  picker.style.left = rect.left + "px";
  picker.style.top  = (rect.bottom + 4) + "px";
  picker.hidden     = false;
}

function hideIconPicker()
{
  const picker = elem("icon-picker");
  picker.hidden = true;
  delete picker.dataset.output;
}

document.addEventListener("click", function() { hideIconPicker(); });

function renderMidiEditor()
{
  const output = selectedIcon.output;
  const index  = selectedIcon.index;
  const midi   = iconState.midi[index];


  <!-- Pull from parsed structure here -->
}

function renderLfoEditor()
{
  const output = selectedIcon.output;
  const lfo    = iconState.lfo[output];
  
  <!-- Pull from parsed structure here -->
}

function renderClockEditor()
{
  const output = selectedIcon.output;
  const index  = selectedIcon.index;
  const clock  = iconState.lfo[output];
  
  elem("clock-editor-name").textContent = "Clock "+(index+1);
  <!-- Pull from parsed structure here -->
}

function renderOutputEditor()
{
  let sel = selectedIcon?.type || "placeholder";

  for(let x of ["placeholder", "midi", "lfo", "clock"])
  {
    elem(x+"-editor").hidden = sel !== x;
  }

  switch (sel)
  {
    case "midi":  renderMidiEditor();  break;
    case "lfo":   renderLfoEditor();   break;
    case "clock": renderClockEditor(); break;
  }
}

function renderOutputs()
{
  for (let unit = 0; unit < 8; ++unit)
  {
    const element = document.getElementById("outputs-unit" + unit);

    if (!element) { continue; }

    for (let output = 0; output < 8; ++output)
    {
      const icons = element.querySelector(
        "#outputs-unit" + unit + "-icons" + output
      );

      if (icons){ renderOutputIcons(unit * 8 + output, icons); }
    }
  }
}

function renderOutputIconsFor(output)
{
  const unit      = Math.floor(output / 8);
  const port      = output % 8;
  const id        = "outputs-unit" + unit + "-icons" + port;
  const container = elem(id);

  if (!container) { console.error("Missing icon container:", id); return; }

  renderOutputIcons(output, container);
}

function removeSelectedIcon()
{
  if (!selectedIcon) { return; }

  const icon    = iconState[selectedIcon.type][selectedIcon.index];
  icon.enabled  = false;
  icon.output   = null;
  
  const output  = selectedIcon.output;
  selectedIcon  = null;
  selectedOutput = output;

  renderOutputIconsFor(output);
  renderOutputEditor();
}