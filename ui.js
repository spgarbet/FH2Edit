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
  lfo:   Array.from({ length: 64 }, () => ({ enabled: false, output: null })),
  srr:   Array.from({ length: 16 }, () => ({ enabled: false, output: null })),
  euc:   Array.from({ length: 16 }, () => ({ enabled: false, output: null })),
  arp:   Array.from({ length: 16 }, () => ({ enabled: false, output: null })),
  env:   Array.from({ length: 16 }, () => ({ enabled: false, output: null })),
  trig:  Array.from({ length: 64 }, () => ({ enabled: false, output: null }))
};

let   selectedIcon     = null;
let   selectedOutput   = null;
let   selectedSrrIndex = 0;  // Defaults to first one
let   selectedEucIndex = 0;
const chainIcons       = []; // The reference icons

const ICON_DEFS =
{
  midi:  { label: "MIDI",       src: "icons/midi.png",     total: 16 },
  lfo:   { label: "LFO",        src: "icons/lfo.png",      total: 64 },
  clock: { label: "Clock",      src: "icons/clock.png",    total: 32 },
  arp:   { label: "Arpeggiator",src: "icons/arp.png",      total: 16 },
  env:   { label: "Envelope",   src: "icons/envelope.png", total: 16 },
  euc:   { label: "Euclidean",  src: "icons/rhythm.png",   total: 16 },
  srr:   { label: "Shift Reg",  src: "icons/srr.png",      total: 16 },
  trig:  { label: "Trigger",    src: "icons/trigger.png",  total: 64 }
};

// Elements
function elem(id)         { return document.getElementById(id); }

// Putters
function put(id, value  ) { elem(id).value   = value;           }
function check(id, value) { elem(id).checked = value;           }

// Getters
function get(id)          { return(elem(id).value);             }
function num(id)          { return(Number(get(id)));            }
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
	if (n >= 10) { return String.fromCharCode( 'A'.charCodeAt( 0 ) + n - 10 ); }
	return String.fromCharCode( '0'.charCodeAt( 0 ) + n );
}

function optionRange(low, high, selected = null, valueOffset = 0)
{
  for (let i=low; i<=high; ++i)
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

function u7SplitPercentage(selected = 0)
{
  for (let i=1; i<128; ++i)
  {
    const isSelected = i === selected ? ' selected' : '';
    document.write(`<option value="${i}"${isSelected}>${(100*(i-64)/63).toFixed(1)}&#37;</option>`);
  }
}

function optionChannelSelector(includeNone=true, includeGate=false, offset=1)
{
	if ( includeNone )
	{
	  document.write("<option value='"+(0-offset)+"'>--</option>");
	}

	for (let j = 1; j <= 8; ++j)
	{
		document.write("<option value='"+(j-offset)+"'>"+j+"</option>");
	}
	for (let e = 1; e < 8; ++e)
	{
		for (let j = 1; j <= 8; ++j)
		{
			document.write("<option value='"+(e*8+j-offset)+"'>"+e+"/"+j+"</option>" );
		}
	}
	if (includeGate)
	{
  	for (let e = 0; e < 4; ++e)
  	{
  		for (let j = 1; j <= 16; ++j)
  		{
  			document.write("<option value='"+(64+e*16+j-offset)+"'>GT"+e+"/"+j+"</option>" );
  		}
  	}
	}
}

function dumpSysex( data, id )
{
	let len = data.length;
	let h   = "";
	for(let i=0; i<len; ++i)
	{
		let b = data[ i ];
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
    const popup          = document.createElement("span");
    popup.className      = "tooltip-popup";
    popup.textContent    = tooltip.dataset.tooltip;
    popup.tooltipTarget  = tooltip;
    tooltip.tooltipPopup = popup;
    document.body.appendChild(popup);

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
  const popup = tooltip.tooltipPopup;
  if (!popup) { return; }
  if(popup.tooltipTarget !== tooltip) {console.error("popup target not a tooltip"); return; }
  popup.classList.add("visible");
  positionTooltip(popup);
}

function hideTooltip(tooltip)
{
  for (const popup of document.querySelectorAll(".tooltip-popup"))
  {
    if (popup.tooltipTarget === tooltip)
    {
      popup.classList.remove("visible");
    }
  }
}

function positionTooltip(popup)
{
  const target  = popup.tooltipTarget;
  if(!target) { return; }
  const rect    = target.getBoundingClientRect();
  let left      = rect.left;
  let top       = rect.bottom + 6;

  const popupRect = popup.getBoundingClientRect();

  if (left + popupRect.width > window.innerWidth)
  {
    left = window.innerWidth - popupRect.width - 8;
  }

  if (top + popupRect.height > window.innerHeight)
  {
    top = rect.top - popupRect.height - 6;
  }

  left = Math.max(8, left);
  top  = Math.max(8, top);

  popup.style.left = `${left}px`;
  popup.style.top  = `${top}px`;
}

function updateTooltips()
{
  const visible = document.querySelectorAll(".tooltip-popup.visible");

  for (const popup of visible)
  {
    positionTooltip(popup);
  }
}

function initTabs()
{
  const tabs    = document.querySelectorAll(".tab");
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
      
      switch(target)
      {
        case "outputs-screen":
          renderOutputEditor();
          break;
          
        case "srr-screen":
          mountSrrEditor("srr-screen-editor-host");
          renderSrrEditor();
          break;
        
        case "euc-screen":
          mountEucEditor("euc-screen-editor-host");
          renderEucEditor();
          break;
        
        case "drum-screen":
          renderDrumSeq();
          break;
          
        case "sequencer-screen":
          renderSequencer();
          break;
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
      "<img src='" +
      (unit === 0 ? "assets/fh-2-panel.png" : "assets/fhx-8cv-panel.png") +
      "' alt='FH-2 output panel'>";
    
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
      range.addEventListener("change", function()
      {
        setOutputRange(loc, this.value);
        elem("lowgate_lbl_" +loc).textContent = scaleVoltage(this.value, get("lowgate_" +loc));
        elem("highgate_lbl_"+loc).textContent = scaleVoltage(this.value, get("highgate_"+loc));
      });
      
      const lowGate         = document.createElement("input");
      lowGate.id            = "lowgate_"+loc;
      lowGate.type          = "range";
      lowGate.min           = 0;
      lowGate.max           = 16383;
      const lowLabel        = document.createElement("label");
      lowLabel.id           = "lowgate_lbl_"+loc;
      lowLabel.htmlFor      = lowGate.id;
      lowLabel.textContent  = "-10.00";
      lowGate.addEventListener("change", function()
      {
        setOutputLowGate(loc, this.value);
        elem("lowgate_lbl_"+loc).textContent = 
          scaleVoltage(get("rng_"+loc), this.value);
      });
      
      const highGate        = document.createElement("input");
      highGate.id           = "highgate_"+loc;
      highGate.type         = "range";
      highGate.min          = 0;
      highGate.max          = 16383;
      const highLabel       = document.createElement("label");
      highLabel.id          = "highgate_lbl_"+loc;
      highLabel.htmlFor     = highGate.id;
      highLabel.textContent = "-10.00";      
      highGate.addEventListener("change", function()
      {
        setOutputHighGate(loc, this.value);
        elem("highgate_lbl_"+loc).textContent = 
          scaleVoltage(get("rng_"+loc), this.value);
      });
      const icons           = document.createElement("div");
      icons.id              = "outputs-unit"+unit+"-icons" + output;
      icons.className       = "outputs-icon";
    
      element.appendChild(number);
      element.appendChild(range);
      element.appendChild(lowLabel);
      element.appendChild(lowGate);
      element.appendChild(highLabel);
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
  
  if (arr[5] === 0x10) // Config
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
  
  // Clear any clocks hidden by removing expanders
  let state=iconState['clock'];
  for (let i = 0; i<32; ++i)
  {
    if(state[i].enabled && state[i].output >= 8*(expanders+1))
    {
      disableClock(i);
      removeIcon("clock", i);
    }
  }
  
  // Clear any LFO's hidden by removing expanders
  state=iconState['lfo'];
  for (let i=8*(expanders+1); i<64; ++i)
  {
    if(state[i] && state[i].enabled)
    {
      disableLfo(i);
      removeIcon("lfo", i);
    }
  }
  
  // Clear any MIDI/CV Converters hidden by removing expanders
  state = iconState.midi;
  
  for(let i = 0; i < state.length; ++i)
  {
    if(state[i].enabled &&
       state[i].output >= 8*(expanders+1))
    {
      disableMidi(i);
      removeIcon("midi", i);
    }
  }
}

// Icon Code
function sameIcon(a, b)
{
  return a.type   === b.type  &&
         a.index  === b.index;
}

function nextAvailableIcon(type, output)
{
  const state = iconState[type];
  
  if(type === "trig")
  {
    if(!trigAvailable()) { return -1; }
    for(let i = 0; i < iconState.trig.length; ++i)
    {
      if(!iconState.trig[i].enabled) { return i; }
    }

    return -1;
  }
  
  if(type === "arp" || type === "env")
  {
    const midi = iconState.midi;

    for(let i = 0; i < midi.length; ++i)
    {
      if(midi[i].enabled &&
         midi[i].output === output &&
         !state[i].enabled)
      {
        return i;
      }
    }

    return -1;
  }

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
  
  if(type === "lfo")
  {
    if (iconState.lfo[output].enabled) { return false; }
    index = output;
  }
  else
  {
    index = nextAvailableIcon(type, output);
    if (index < 0) { return false; }    
  }
  
  switch(type)
  {
    case "lfo":
      initLfo(output);
      break;
    case "srr":
      initSrr(index, output);
      break;
    case "midi":
      initMidi(index, output);
      break
    case "clock":
      initClock();
      break;
    case "euc":
      initEuc(index, output);
      break;
    case "arp":
      initArp(index, output);
      break;
    case "env":
      initEnv(index, output);
      break;
    case "trig":
      initTrig(index, output);
      break;
  }

  iconState[type][index].enabled = true;
  iconState[type][index].output = output;

  selectedIcon =
  {
    type:   type,
    index:  index,
    output: output,
    elem:   null
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
  
  const parent =
  {
    type,
    index,
    output: icon.output
  };
  if(type === "midi") { rebuildMidiOutputChains(parent, []); }
  if(type === "srr")  { rebuildSrrOutputChains(index, []);  }
  
  const output   = icon.output;
  
  icon.enabled   = false;
  icon.output    = null;

  selectedIcon   = null;
  selectedOutput = output;

  renderOutputIconsFor(output);
  renderOutputEditor();
}

function removeEuc(index)
{
  const outputs = computeEucOutputs(index);
  const anchor  = iconState.euc[index].output;

  disableEuc(index);

  iconState.euc[index].enabled = false;
  iconState.euc[index].output  = null;

  rebuildEucOutputChains(index, []);

  const affected = new Set(outputs);

  if(anchor !== null)
  {
    affected.add(anchor);
  }

  for(const output of affected)
  {
    renderOutputIconsFor(output);
  }

  selectedIcon   = null;
  selectedOutput = anchor;

  renderOutputEditor();
}

function removeSrr(index)
{
  const outputs = computeSrrOutputs(index);
  const anchor  = iconState.srr[index].output;

  disableSrr(index);

  iconState.srr[index].enabled = false;
  iconState.srr[index].output  = null;

  rebuildSrrOutputChains(index, []);

  const affected = new Set(outputs);

  if(anchor !== null)
  {
    affected.add(anchor);
  }

  for(const output of affected)
  {
    renderOutputIconsFor(output);
  }

  selectedIcon   = null;
  selectedOutput = anchor;

  renderOutputEditor();
}

function selectIcon(type, index, output)
{
  selectedIcon =
  {
    type,
    index,
    output,
    elem: null
  };

  if(type === "srr") { selectedSrrIndex = index; }
  if(type === "euc") { selectedEucIndex = index; }

  selectedOutput = output;

  document
    .querySelectorAll(".outputs-icon-item.selected")
    .forEach(button => button.classList.remove("selected"));

  const button = document.querySelector(
    ".outputs-icon-item[data-type='" + type + "'][data-index='" + index + "']"
  );

  if(button)
  {
    button.classList.add("selected");
    selectedIcon.elem = button;
  }

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

  for (const type of ["midi", "lfo", "clock", "srr", "euc", "arp", "env", "trig"])
  {
    const state = iconState[type];

    for (let i=0; i<state.length; ++i)
    {
      if (!state[i].enabled || state[i].output !== output) { continue; }

      const button         = document.createElement("button");
      button.type          = "button";
      button.className     = "outputs-icon-item";
      button.dataset.type  = type;
      button.dataset.index = i;

      if (selectedIcon                &&
          selectedIcon.type  === type &&
          selectedIcon.index === i     )
      {
        button.classList.add("selected");
        selectedIcon.elem = button;
      }

      button.title = ICON_DEFS[type].label + " " + (i + 1);
      const image  = document.createElement("img");
      image.src    = ICON_DEFS[type].src;
      image.alt    = ICON_DEFS[type].label;

      button.appendChild(image);

      button.addEventListener("click", function()
      {
        selectIcon(type, i, output);
      });

      container.appendChild(button);
    }
  }
  
  renderChainIcons(output, container);
}

function buildIconPicker()
{
  const picker = elem("icon-picker");

  for (const type of ["midi", "lfo", "clock", "srr", "euc", "arp", "env", "trig"])
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
  
  elem("clock-editor-trash").addEventListener("click", function()
  {
    disableClock(selectedIcon.index); // Turn off clock
    removeIcon("clock", selectedIcon.index);
  });
  elem("lfo-editor-trash").addEventListener("click", function()
  {
    disableLfo(selectedIcon.output);
    removeIcon("lfo", selectedIcon.index);
  });
  elem("midi-editor-trash").addEventListener("click", function()
  {
    disableMidi(selectedIcon.index);
    removeIcon("midi", selectedIcon.index);
  });
  elem("srr-editor-trash").addEventListener("click", function()
  {
    removeSrr(selectedSrrIndex);
  });
  elem("euc-editor-trash").addEventListener("click", function()
  {
    removeEuc(selectedEucIndex);
  });
  elem("arp-editor-trash").addEventListener("click", function()
  {
    removeIcon("arp", selectedIcon.index);
  });
  elem("env-editor-trash").addEventListener("click", function()
  {
    removeIcon("env", selectedIcon.index);
  });
  elem("trig-editor-trash").addEventListener("click", function()
  {
    disableTriggersOnOutput(selectedIcon.output);
    removeIcon("trig", selectedIcon.index);
  });
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
        : nextAvailableIcon(type, output) >= 0;

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
  if(picker)
  {
    picker.hidden = true;
    delete picker.dataset.output;
  }
}

document.addEventListener("click", function() { hideIconPicker(); });

  ///////////////////////////////////////////////////////////////////////////
 //
// Chain Icons

function rebuildMidiOutputChains(parent, outputs)
{
  const oldOutputs = [];

  // Pull out all associated chains of the parent
  for (let i = chainIcons.length - 1; i >= 0; --i)
  {
    if (sameIcon(chainIcons[i].parent, parent))
    {
      oldOutputs.push(chainIcons[i].output);
      chainIcons.splice(i, 1);
    }
  }

  // Insert new chains
  for (const output of outputs)
  {
    if(output === parent.output) { continue; }
    chainIcons.push({output, parent});
  }

  // deduped set of affected outputs is rerendered
  for (const output of new Set([...oldOutputs, ...outputs]))
  {
    renderOutputIconsFor(output);
  }
}

function renderChainIcons(output, container)
{
  for (const chain of chainIcons)
  {
    if (chain.output !== output) { continue; }

    const button     = document.createElement("button");
    button.className = "outputs-icon-item outputs-icon-chain";
    button.type      = "button";
    button.title     = "Output from "+(chain.parent.output+1);

    const img        = document.createElement("img");
    img.src          = "icons/link.png";
    img.alt          = "Output from "+(chain.parent.output+1);
    
    button.appendChild(img);
    button.addEventListener("click", function(event)
    {
      event.stopPropagation();

      selectIcon(
        chain.parent.type,
        chain.parent.index,
        chain.parent.output
      );
    });

    container.appendChild(button);
  }
}

  //////////////////////////////////////////////////////////////////////
 //
// Midi Mapping via DIN5 icon

function updateMidiMapButtons(query, index)
{
  const buttons  = document.querySelectorAll(query);
  const mappings = allMappings();
  
  for (const button of buttons)
  {
    button.dataset.index = index;
    
    const mapping = locateMapping(
      button.dataset.type,
      button.dataset.dest,
      index,
      mappings
    );

    renderMidiMapButton(button, mapping);
  }
}
  
function renderMidiEditor()
{
  const output = selectedIcon.output;
  const index  = selectedIcon.index;
  const midi   = iconState.midi[index];

  let reader = new ByteReader(configSysex);
  reader.seek(100 + 32*index);

  const mcv = parseMcv(reader);
  renderMcv(mcv);
  updateMidiOutputs();
  
  // Read the Arp values needed
  reader = new ByteReader(presetSysex);
  reader.seek(1253+8*index);
  put("midi-cvrt-porta", reader.u8());  // Arp P
  reader.skip(1);
  put("midi-cvrt-trans", reader.u8());  // Arp E
  
  // This is off in another area as well.
  const scala=parseScala(reader)[index];
  put("midi-cvrt-scl", scala.enable > 0 ? scala.scl : -1);
  put("midi-cvrt-kbm", scala.enable > 0 ? scala.kbm : -1);
  
  // Odd parameter hidden in envelope
  const envelope=parseEnvelope(reader, index);
  put("env-random", envelope.random);
  
  updateMidiMapButtons("#lfo-editor .midi-map-button", index);
}

function renderLfoEditor()
{
  const output = selectedIcon.output;
  let   lfo    = parsePresetLFO(new ByteReader(presetSysex), output);
  const loc    = 16*output;
  
  if(lfo['speed'] === 0)
  {
    put("lfo-speed", 0);
    put("lfo-base",  lfo['base']);
    put("lfo-mult",  lfo['multiplier']);
    elem("lfo-base").disabled = false;
    elem("lfo-mult").disabled = false;
  } else
  {
     put("lfo-speed", short14ToHz(lfo['speed']).toFixed(5));
     put("lfo-base",  0);
     put("lfo-mult",  0); 
     elem("lfo-base").disabled = true;
     elem("lfo-mult").disabled = true;
  }
  
  for(let param of ['center', 'sine', 'pw', 'saw', 'noise', 'fade', 'level',
                    'square','triangle', 'random', 'phase', 'smoothing'])
  {
    put("lfo-"+param,          lfo[param]);
    put("lfo-"+param+"-value", lfo[param]);
  }
  
  updateMidiMapButtons("#lfo-editor .midi-map-button", output);
  
  let   reset  = parseLfoReset(new ByteReader(configSysex),  output);

  put('lfo-reset',    reset.type   );
  put('lfo-reset-v1', reset.channel);
  put('lfo-reset-v2', reset.cc     );
  
  drawWaveform();
}

function renderClockEditor()
{
  const index  = selectedIcon.index;  // Number in clock pool
  const clocks = parseConfigClocks(new ByteReader(configSysex));
  const clock  = clocks[index];

  elem("clock-editor-name").textContent = "Clock "+(selectedIcon.output+1);
  put("clock-editor-type",  clock.type );
  put("clock-editor-base",  clock.base );
  put("clock-editor-mult",  clock.mult );
  put("clock-editor-len",   clock.len  );
  put("clock-editor-shift", clock.shift);
}

function renderOutputEditor()
{
  let sel = selectedIcon?.type || "placeholder";

  for(let x of ["placeholder", "midi", "lfo", "clock", "srr", "euc", "arp", "env", "trig"])
  {
    elem(x+"-editor").hidden = sel !== x;
    
    // For the two screen editors
    if(x === "srr" ||
       x === "euc" )  { elem(x+"-editor-header").hidden = sel !== x; }
  }
  
  switch (sel)
  {
    case "midi":  renderMidiEditor();  break;
    case "lfo":   renderLfoEditor();   break;
    case "clock": renderClockEditor(); break;
    case "env":   renderEnvEditor();   break;
    case "arp":   renderArpEditor();   break;
    case "srr":
      mountSrrEditor("srr-editor-host");
      renderSrrEditor(selectedIcon.index);
      break;
    case "euc":
      mountEucEditor("euc-editor-host");
      renderEucEditor(selectedIcon.index);
      break;
    case "trig":
      renderTrigEditor(selectedIcon.output);
      break;
  }
  updateTooltips();
  if(sel != "placeholder")
  {
    centerToSelected(sel+"-editor");
  }
}

function renderOutputs()
{
  for (let unit = 0; unit < 8; ++unit)
  {
    const element = elem("outputs-unit" + unit);

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

function centerToSelected(id)
{
  if (!selectedIcon.elem) { return; }
  const selected        = selectedIcon.elem;
  const editor          = elem(id);
  const container       = elem('output-editor');
  const containerRect   = container.getBoundingClientRect();
  const selectedRect    = selected.getBoundingClientRect();
  const editorHeight    = editor.offsetHeight;
  // Center of the selected element, relative to the container's top
  const selectedCenterY = (selectedRect.top - containerRect.top) +
                          (selectedRect.height / 2);

  // Desired top for the editor so its center matches the selected element's center
  let top = selectedCenterY - (editorHeight / 2);

  // Clamp so the editor stays fully within the container
  const maxTop = containerRect.height - editorHeight;
  top = Math.max(0, Math.min(top, maxTop));
  
  editor.style.top = `${top}px`;
  //updateTooltips();
}

// LFO Code

function setLFOShort(id, value, base, block)
{
  put('lfo-'+id+'-value', value);
  setPresetShort(base+block*selectedIcon.output, value);
  drawWaveform();
}

function setLFOU8(id, value, base, block)
{
  put('lfo-'+id+'-value', value);
  setPresetU8(base+block*selectedIcon.output, value);
  drawWaveform();
}

function animate(timestamp)
{
  if (!appState.animationRunning) { return; }

  const frameInterval = 1000 / appState.animationFPS;

  if (timestamp - appState.lastFrameTime >= frameInterval)
  {
    drawWaveform();
    appState.lastFrameTime = timestamp;
  }
  
  requestAnimationFrame(animate);
}
    
function startAnimation()
{
  if (appState.animationRunning) { return; }

  appState.animationRunning = true;
  appState.lastFrameTime    = 0;
  requestAnimationFrame(animate);
}
    
function stopAnimation()
{
  appState.animationRunning = false;
}
    
function updateFPS()
{
  const control          = elem("fps");
  const output           = elem("fps-value");
  appState.animationFPS  = Number(control.value);
  output.value           = control.value;
}
    
function drawGuidelines(canvas, context)
{
  const width  = canvas.width;
  const height = canvas.height;
  const middle = height / 2;
  
  for(let i = -4; i < 5; ++i)
  {
    const y = middle-0.2*i*middle;
    context.beginPath();
    context.moveTo(0,     y);
    context.lineTo(width, y);
    if (i === 0) { context.strokeStyle="red";  context.setLineDash([]);}
    else         { context.strokeStyle="lightblue"; context.setLineDash([5,5]);   }
    context.stroke();
  }
  context.strokeStyle = "black";
  context.setLineDash([]);
}

function drawWaveform()
{
  const canvas  = elem("waveform");
  const context = canvas.getContext("2d");
  const lfo     = generateLFOWithStats(  // Sysex is source of truth
                    parsePresetLFO( 
                      new ByteReader(presetSysex),
                      selectedIcon.output));
  const width   = canvas.width;
  const height  = canvas.height;
  const middle  = height / 2;
  
  context.clearRect(0, 0, width, height);
  drawGuidelines(canvas, context);
  
  context.beginPath();
  context.moveTo(0, middle-lfo.samples[0]*middle);
  for (let x = 0; x < width; ++x)
  {
    const sampleIndex = Math.floor(x * LFO_SAMPLE_COUNT / width);
    const y           = middle - lfo.samples[sampleIndex] * middle;

    context.lineTo(x, y);
  }
  context.strokeStyle = "black";
  context.stroke();
  
  // Update Stats
  put("stat-min", scaleVoltage(get("rng_"+selectedIcon.output), lfo.min+1, 2) );
  put("stat-max", scaleVoltage(get("rng_"+selectedIcon.output), lfo.max+1, 2) );
  put("stat-avg", scaleVoltage(get("rng_"+selectedIcon.output), lfo.avg+1, 2) );
}

function initLfoUI()
{
  elem("animate").addEventListener("click", function()
  {
    if (appState.animationRunning)
    {
      stopAnimation();
      this.textContent = "Start Animation";
    }
    else
    {
      startAnimation();
      this.textContent = "Stop Animation";
    }
  });
      
  elem("fps").addEventListener("input", function()
  {
    updateFPS();
  });
}

const LOG10 = 2.302585092994046;

// Best guess at what Expert Sleepers means "logarithmic scaled"
function bitsForHz(x)
{
  return Math.round(16382*((Math.log(x)+LOG10) / LOG10 / 2) + 1);
}

function short14ToHz(x)
{
  return Math.exp(2*LOG10*(x-1)/16382-LOG10);
}

function setLfoBase(v, index=selectedIcon.output)
{
  setPresetU8(164+16*index, Number(v));
}

function setLfoMult(v, index=selectedIcon.output)
{
  setPresetU8(165+16*index, Number(v));
}

function setLfoSpeed(v)
{
  let speed = Number(v);
  const loc = 16*selectedIcon.output;
  if(!speed || speed < 0.1)
  {
    elem("lfo-speed").value = 0;
    elem("lfo-base").disabled = false;
    elem("lfo-mult").disabled = false;
    put("lfo-base", 24);
    put("lfo-mult", 1);
    
    setPresetShort(162+loc, 0); // speed
    setPresetU8(164+loc, 24);   // base
    setPresetU8(165+loc, 1);    // mult
    setPresetU8(174+loc, 1);    // use
  }
  else
  {
    elem("lfo-base").disabled = true;
    elem("lfo-mult").disabled = true;
    put("lfo-base", 0);
    put("lfo-mult", 0);
    
    if(speed > 10.0) { speed = 10.0; }
    
    let bits = bitsForHz(speed);
    elem("lfo-speed").value = short14ToHz(bits).toFixed(5);
    
    setPresetShort(162+loc, bits); // speed
    setPresetU8(164+loc, 0);       // base
    setPresetU8(165+loc, 0);       // mult
    setPresetU8(174+loc, 0);       // use
  }
}

function updateLfoReset()
{
  const type = num("lfo-reset");
  
  setLfoReset(selectedIcon.index,  type, 
              num("lfo-reset-v1"), num("lfo-reset-v2"));
  
  switch(type)
  {
    case 0:
      elem("lfo-reset-v1").hidden = true;
      elem("lfo-reset-v2").hidden = true;
      break;
    case 1:
    case 2:
      elem("lfo-reset-v1").hidden = false;
      elem("lfo-reset-v2").hidden = false;
      break;
    case 3:
    case 4:
    case 5:
      elem("lfo-reset-v1").hidden = true;
      elem("lfo-reset-v2").hidden = false;
      break;
    case 6:
    case 7:
    case 8:
      elem("lfo-reset-v1").hidden = true;
      elem("lfo-reset-v2").hidden = false;
      break;
  }
}

/* Dealing with two global midi mapping exceptions */
function setTapType(value)
{
  setConfigU8(2932, value);
  const button = document.querySelector('.midi-map-button[data-dest="glb_tap"]');
  if(value === "0")
  { renderMidiMapButton(button, false); }
  else
  {
    // This knowledge should be deeper, but this is an exception
    renderMidiMapButton(button,
      mapping({slot: SLOT_GLOBAL_TAP,
               channel: configSysex[2933],
               cc: configSysex[2934]}, 
              "glb", 0, "glb_tap")); 
  }
}

function setStartType(value)
{
  setConfigU8(2936, value);
  const button = document.querySelector('.midi-map-button[data-dest="glb_start"]');
  if(value === "0")
  { 
    renderMidiMapButton(button, false);
  }
  else
  {
    // This knowledge should be deeper, but this is a 2nd exception
    renderMidiMapButton(button,
      mapping({slot: SLOT_GLOBAL_START,
               channel: configSysex[2937],
               cc: configSysex[2938]}, 
              "glb", 0, "glb_start")); 
  }
}

  ///////////////////////////////////////////////////////////
 //
// MIDI CV Converter UI
//
function makeSeries(base, block, replicates)
{
  return Array.from({ length: replicates }, (_, i) => base + i * block);
}

function formatOutputs(outputs)
{
  return outputs.map(output => output + 1).join(", ");
}

// Complex output determination
function computeMidiOutputs(index)
{
  const reader = new ByteReader(configSysex);
  reader.seek(100+32*index);
  
  const mcv     = parseMcv(reader);
  const voices  = mcv.type === 0 ? 1 : mcv.voices;
  const outputs = [];

  let perVoice = 0;
  
  if(mcv.cvOutput   > 0) { perVoice += 1; }
  if(mcv.gateOutput > 0) { perVoice += 1; }
  if(mcv.velGate    > 0) { perVoice += 1; }
  if(mcv.velOutput  > 0) { perVoice += 1; }
  if(mcv.relVel     > 0) { perVoice += 1; }
  if(mcv.trigger    > 0) { perVoice += 1; }
  if(mcv.envelope   > 0) { perVoice += 1; }
  if(mcv.voicePress > 0) { perVoice += 1; }
  if(mcv.random     > 0) { perVoice += 1; }
  if(mcv.type > 1   && 
     mcv.mpeY > 0      ) { perVoice += 1; }

  let   offset = mcv.base;
  const stride = (mcv.type > 0 && mcv.stride > 0) ? mcv.stride : perVoice;
  
  for(const source of [
    "cvOutput",
    "gateOutput",
    "velGate",
    "velOutput",
    "relVel",
    "trigger",
    "envelope",
    "voicePress",
    "random",
    "mpeY"])
  {
    const id = "midi-cvrt-p-"+source;
    if(mcv[source] > 0)
    {
      const ports = makeSeries(offset, stride, voices);
      outputs.push(...ports);
      elem(id).textContent = formatOutputs(ports);
      offset += 1;
    }
    else
    {
      elem(id).textContent = "";
    }
  }

  offset = mcv.base+voices*stride;
  
  elem("midi-cvrt-p-paragate").textContent = mcv.paraGate > 0 ? (offset+1) : "";
  if(mcv.paraGate > 0) { outputs.push(offset); offset += 1; }
  
  elem("midi-cvrt-p-paraafter").textContent = mcv.pressure > 0 ? (offset+1) : "";
  if(mcv.pressure > 0) { outputs.push(offset); offset += 1; }
  
  if(mcv.bendOut > 0)
  {
    const ports = mcv.bendOut === 1 ? [offset] : [offset, offset+1];
    outputs.push(...ports);
    elem("midi-cvrt-p-bend").textContent = formatOutputs(ports);
  }
  else
  {
    elem("midi-cvrt-p-bend").textContent = "";
  }
  
  return outputs;
}

function updateMidiOutputs(index=selectedIcon.index)
{
  const outputs = computeMidiOutputs(index);
  const parent  =
  {
    type:   "midi",
    index,
    output: iconState.midi[index].output
  };
  
  const env = iconState.env[index];
  
  env.enabled = envActive(index);
  env.output  = env.enabled ? parent.output : null;
  
  rebuildMidiOutputChains(parent, outputs);
  renderOutputIconsFor(parent.output);
}

function setMidiCVType(value)
{
  const index  = selectedIcon.index;
  const type   = Number(value[0]);
  const scheme = Number(value[1]);

  // Set the sysex
  setMidiCVValue(4, type  );
  setMidiCVValue(7, scheme);
  if(type === 0)
  {
    setMidiCVValue(5, 1); // Voices=1 for Mono
    elem("midi-cvrt-voices").value = 1;
  }
  
  const fields = document.querySelectorAll(type === 1 ? '.poly-param' : '.mpe-param');
  for (const field of fields)
  {
    field.hidden = type === 0;
  }
  updateMidiOutputs();
}

function setMidiVoices(value)
{
  setMidiCVValue(5, Number(value));
  updateMidiOutputs();
}

function setMidiStride(value)
{
  setMidiCVValue(12, Number(value));
  updateMidiOutputs();
}

function setMidiParaAfter(value)
{
  setMidiCVValue(14, value);
  updateMidiOutputs();  
}

function setMidiParaGate(value)
{
  setMidiCVValue(15, value);
  updateMidiOutputs();  
}

function setMidiCV(value)
{
  setMidiCVValue(16, value);
  updateMidiOutputs();
}

function setMidiGate(value)
{
  setMidiCVValue(17, value);
  updateMidiOutputs();
}

function setMidiVelGate(value)
{
  setMidiCVValue(18, value);
  updateMidiOutputs();
}

function setMidiVelocity(value)
{
  setMidiCVValue(19, value);
  updateMidiOutputs();
}

function setMidiRelVel(value)
{
  setMidiCVValue(20, value);
  updateMidiOutputs();
}

function setMidiTrig(value)
{
  setMidiCVValue(21, value);
  updateMidiOutputs();
}

function setMidiAfter(value)
{
  setMidiCVValue(22, value);
  updateMidiOutputs();  
}

function setMidiMpeY(value)
{
  setMidiCVValue(23, value);
  updateMidiOutputs();  
}

function setMidiEnv(value)
{
  setMidiCVValue(24, value);
  updateMidiOutputs();  
}

function setMidiBendOut(value)
{
  setMidiCVValue(30, value);
  updateMidiOutputs();  
}

function setMidiRandom(value)
{
  setMidiCVValue(31, value);
  updateMidiOutputs();
}

// Tricky state handling to hide "enable" from user
// If both are set to -1 in UI, then it is disabled.
// Sysex must at minimum be 0.
function setScala(scl, kbm)
{
  const enable = scl >= 0 || kbm >= 0;
  setScalaValue(0, enable            ?   1 : 0);
  setScalaValue(1, enable && scl > 0 ? scl : 0);
  setScalaValue(2, enable && kbm > 0 ? kbm : 0);
}

function setScl(value)
{
  setScala(Number(value), num('midi-cvrt-kbm'));
}

function setKbm(value)
{
  setScala(num('midi-cvrt-scl'), Number(value));
}

  ///////////////////////////////////////////////////////////////////////////
 //
// Shift Random Register (SRR)

function computeSrrOutputs(index)
{
  const outputs = [];
  const srr     = parseConfigShiftRegister(new ByteReader(configSysex), index);
  
  if(srr.output  >= 0) { outputs.push(srr.output);  }
  if(srr.change  >= 0) { outputs.push(srr.change);  }
  if(srr.trigger >= 0) { outputs.push(srr.trigger); }
  
  return outputs.sort((a,b) => a - b);
}

function rebuildSrrOutputChains(index, outputs)
{
  const oldAnchor = iconState.srr[index].output;
  const oldOutputs = [];

  // Remove existing chains for this SRR.
  for(let i = chainIcons.length - 1; i >= 0; --i)
  {
    const chain = chainIcons[i];

    if(chain.parent.type === "srr" && chain.parent.index === index)
    {
      oldOutputs.push(chain.output);
      chainIcons.splice(i, 1);
    }
  }

  const affected = new Set(oldOutputs);

  if(outputs.length === 0)
  {
    iconState.srr[index].output = null;

    if(oldAnchor !== null)
    {
      renderOutputIconsFor(oldAnchor);
    }
  
    for(const output of oldOutputs)
    {
      renderOutputIconsFor(output);
    }
  
    return;
  }
  else
  {
    const anchor = outputs[0];

    iconState.srr[index].output = anchor;
    affected.add(anchor);

    const parent =
    {
      type:   "srr",
      index,
      output: anchor
    };

    for(const output of outputs)
    {
      if(output !== anchor)
      {
        chainIcons.push({ output, parent });
        affected.add(output);
      }
    }

    if(oldAnchor !== null)
    {
      affected.add(oldAnchor);
    }
  }

  for(const output of affected)
  {
    renderOutputIconsFor(output);
  }
}

function mountSrrEditor(host)
{
  elem(host).appendChild(elem("srr-editor"));
  elem("srr-editor").hidden = false;
}

function updateSrr(index=selectedSrrIndex)
{
  iconState.srr[index].enabled = srrActive(index);

  const outputs = computeSrrOutputs(index);
  rebuildSrrOutputChains(index, outputs);
}

function setSrrCVOutput(value)
{
  setSrrOut(Number(value), selectedSrrIndex);
  updateSrr(selectedSrrIndex);
}

function setSrrChangeOutput(value)
{
  setSrrChange(Number(value), selectedSrrIndex);
  updateSrr(selectedSrrIndex);
}

function setSrrTriggerOutput(value)
{
  setSrrTrigger(Number(value), selectedSrrIndex);
  updateSrr(selectedSrrIndex);
}


  ///////////////////////////////////////////////////////////////////////////
 //
// Euclidean

function computeEucOutputs(index)
{
  const outputs = [];
  const euc     = parseEuclidean(index);
  
  if(euc.pulses === 0) { return [];                }
  if(euc.onOut  >= 0)  { outputs.push(euc.onOut ); }
  if(euc.offOut >= 0)  { outputs.push(euc.offOut); }

  return outputs.sort((a, b) => a - b);
}

function rebuildEucOutputChains(index, outputs)
{
  const oldAnchor = iconState.euc[index].output;
  const oldOutputs = [];

  // Remove existing chains for this Euclidean.
  for(let i = chainIcons.length - 1; i >= 0; --i)
  {
    const chain = chainIcons[i];

    if(chain.parent.type === "euc" && chain.parent.index === index)
    {
      oldOutputs.push(chain.output);
      chainIcons.splice(i, 1);
    }
  }

  const affected = new Set(oldOutputs);

  if(outputs.length === 0)
  {
    iconState.euc[index].output = null;

    if(oldAnchor !== null)
    {
      renderOutputIconsFor(oldAnchor);
    }
  
    for(const output of oldOutputs)
    {
      renderOutputIconsFor(output);
    }
  
    return;
  }
  else
  {
    const anchor = outputs[0];

    iconState.euc[index].output = anchor;
    affected.add(anchor);

    const parent =
    {
      type:   "euc",
      index,
      output: anchor
    };

    for(const output of outputs)
    {
      if(output !== anchor)
      {
        chainIcons.push({ output, parent });
        affected.add(output);
      }
    }

    if(oldAnchor !== null)
    {
      affected.add(oldAnchor);
    }
  }

  for(const output of affected)
  {
    renderOutputIconsFor(output);
  }
}

function mountEucEditor(host)
{
  elem(host).appendChild(elem("euc-editor"));
  elem("euc-editor").hidden = false;
}

function updateEuc(index=selectedEucIndex)
{
  iconState.euc[index].enabled = eucActive(index);

  const outputs = computeEucOutputs(index);
  rebuildEucOutputChains(index, outputs);
}

function setEucChangeOnOut(value, index = selectedEucIndex)
{
  setEucOnOut(Number(value), index);
  updateEuc(index);
}

function setEucChangeOffOut(value, index=selectedEucIndex)
{
  setEucOffOut(Number(value), index);
  updateEuc(index);
}

function setEucPulses(value, index=selectedEucIndex)
{
  setEucValue(0, Number(value), index);
  updateEuc(index);
}

  ///////////////////////////////////////////////////////////////////////////
 //
// Envelopes
const envScales = [0.2, 0.5, 1, 2, 5, 10, 20, 50];

function formatEnvTime(value, scale)
{
  const seconds = value * envScales[scale];

  if(seconds >= 60)
  {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds - 60 * minutes;

    return remaining > 0
      ? minutes + "m" + formatSeconds(remaining) + "s"
      : minutes + "m";
  }

  return formatSeconds(seconds) + "s";
}

function formatSeconds(seconds)
{
  return Number.isInteger(seconds)
    ? String(seconds)
    : seconds.toFixed(1);
}

function updateEnvTimeOptions()
{
  const scale = num("env-scale");
  
  setEnvValue(4, selectedIcon.index, scale);
  
  for(const id of ["env-attack", "env-decay", "env-release"])
  {
    const select = elem(id);

    for(const option of select.options)
    {
      option.textContent = formatEnvTime(Number(option.value), scale);
    }
  }
}

function setArpMode()
{
  setArpPresetValue(
    0,
    num('arp-mode-coarse')+num('arp-mode-fine'),
    selectedIcon.index);
}

function initTriggerUI()
{
  elem("trig-rows").addEventListener("change", function(event)
  {
    const row = event.target.closest("tr");
    if(!row) { return; }
  
    const index = Number(row.dataset.index);
  
    if(event.target.matches(".trig-type"))
    {
      setTrigType(event.target.value, index);
      row.querySelector(".trig-env").disabled = Number(event.target.value) !== 9;
    }
    else if(event.target.matches(".trig-channel"))
    {
      setTrigChannel(event.target.value, index);
    }
    else if(event.target.matches(".trig-note"))
    {
      setTrigNote(event.target.value, index);
    }
    else if(event.target.matches(".trig-env"))
    {
      setTrigEnv(event.target.value, index);
    }
  });
  elem("trig-rows").addEventListener("click", function(event)
  {
    const button = event.target.closest(".trig-single-trash");
    if(!button) { return; }
  
    const row   = button.closest("tr");
    const tbody = row.closest("tbody");
    const index = Number(row.dataset.index);
    
    setTrigType(index, 0);
  
    row.remove();
    
    elem('trig-available').textContent = "Available: " + (64-trigCount()) ;
    elem('trig-editor-plus').hidden    = false;

    if(tbody.rows.length === 0) { removeIcon("trig", selectedIcon.index); }
  });
  elem("trig-editor-plus").addEventListener("click", function(event)
  {
    const index = nextAvailableTrig();
    if(index === -1) { console.error("Adding a trig with none available"); return; }
    
    initTrig(index, selectedIcon.output);
    
    const trig = parseTrigger(index);
    
    appendTrigRow(trig, elem("trig-rows"));
    
    elem('trig-available').textContent = "Available: " + (64-trigCount()) ;
    
    if(nextAvailableTrig() === -1) { elem("trig-editor-plus").hidden = true; }
    
  });
}

  ///////////////////////////////////////////////////////////////////////////
 //
// Drum Sequencer
function updateDrumMute(lane, muted)
{
  const button = elem("drum-mute-" + lane);
  const image  = button.querySelector("img");

  if(muted)
  {
    image.src = "icons/mute.png";
    image.alt = "Muted lane " + (lane+1);
    button.setAttribute("aria-pressed", "true");
  }
  else
  {
    image.src = "icons/unmute.png";
    image.alt = "Unmuted lane " + (lane+1);
    button.setAttribute("aria-pressed", "false");
  }
}

function toggleDrumMute(lane)
{
  const row   = elem("drum-lane-" + lane);
  const muted = row.classList.toggle("muted");
  updateDrumMute(lane, muted);
  setDrumLanePreset(lane, 4, muted ? 1 : 0);
}

function laneHeaders()
{
  document.write("<td class='spacer'></td>");

  for(let i = 0; i < 32; ++i)
  {
    document.write("<td>" + (i + 1) + "</td>");

    if((i + 1) % 8 === 0)
    {
      document.write("<td class='spacer'></td>");
    }
  }
}

function drumLanes()
{
  for(let lane = 0; lane < 8; ++lane)
  {
    drumLane(lane);
  }
}

function durationOptions(selected)
{
  const musicalRates =
  [
    [3, "1/32"],
    [6, "1/16"],
    [8, "1/8T"],
    [9, "1/16&bull;"],
    [12, "1/8"],
    [16, "1/4T"],
    [18, "1/8&bull;"],
    [21, "1/8&bull;&bull;"],
    [24, "1/4"],
    [32, "1/2T"],
    [36, "1/4&bull;"],
    [42, "1/4&bull;&bull;"],
    [48, "1/2"],
    [72, "1/2&bull;"],
    [84, "1/2&bull;&bull;"],
    [96, "Whole"]
  ];

  const musicalRateValues = new Set();
  
  document.write("<option value='0'>Every</option>");

  for(const [value, label] of musicalRates)
  {
    document.write("<option value='" + value + "'"+(value===selected?' selected':'')+">" + label + "</option>");
    musicalRateValues.add(value);
  }

  for(let i = 1; i <= 127; ++i)
  {
    if(!musicalRateValues.has(i))
    {
      document.write("<option value='" + i + "'"+(i===selected?' selected':'')+">" + i + "</option>");
    }
  }
}

function writeMidiMapButton(id, type, index, dest, aria)
{
  document.write("<button class='midi-map-button' type='button' ");
  document.write("id='"+id+"'");
  document.write("data-type='"+type+"' ");
  document.write("data-index='"+index+"' ");
  document.write("data-dest='"+dest+"' ");
  document.write("aria-label='"+aria+"'>");
  document.write("<img src='icons/midi-din.svg' alt='MIDI DIN5'>");
  document.write("</button>");
}

function drumLane(lane)
{
  document.write("<tr id='drum-lane-" + lane + "'>");
  document.write("<td>" + (lane+1) + "</td>");

  document.write("<td>");
  document.write("<button class='mute-button' type='button'");
  document.write(" id='drum-mute-" + lane + "'");
  document.write(" onclick='toggleDrumMute(" + lane + ")'");
  document.write(" aria-label='Drum sequencer mute for lane " + lane + "'>");
  document.write("<img src='icons/unmute.png' alt='Unmuted lane " + lane + "'>");
  document.write("</button>");
  document.write("</td>");

  document.write("<td><select id='drum-note-" + lane + "'");
  document.write(" onclick='setConfigU8("+(3636+lane)+", this.value)'>");
  midiNoteOptions(lane);
  document.write("</select></td>");

  document.write("<td><select id='drum-start-" + lane + "'");
  document.write(" onchange='updateDrumLaneRange(" + lane + ");");
  document.write("  setDrumLanePreset(" + lane + ", 0, this.value)'>");
  optionRange(1, 32, 1, 1);
  document.write("</select></td>");
  
  document.write("<td><select id='drum-end-" + lane + "'");
  document.write(" onchange='updateDrumLaneRange(" + lane + ");");
  document.write("  setDrumLanePreset(" + lane + ", 1, this.value)'>");
  optionRange(1, 32, 16, 1);
  document.write("</select></td>");

  document.write("<td><select id='drum-rate-" + lane + "'");
  document.write(" onchange='setDrumLanePreset("+lane+", 2, this.value)'>");
  durationOptions();
  document.write("</select>");
    writeMidiMapButton("drum-rate-map-" + lane, "dseql", lane, "T", 
    "MIDI rate for drum lane " + (lane+1));
  document.write("</td>");

  document.write("<td><select id='drum-reset-" + lane + "'");
  document.write(" onchange='setDrumLanePreset("+lane+", 3, this.value)'>");
  document.write("<option value='0'>--</option>");
  optionRange(2, 32, 1, 1);
  document.write("</select>");
  writeMidiMapButton("drum-reset-map-" + lane, "dseql", lane, "S", 
    "MIDI reset for drum lane " + (lane+1));
  document.write("</td>");
  
  document.write("<td>");
  writeMidiMapButton("drum-position-" + lane, "dseql", lane, "P", 
    "MIDI position for drum lane " + (lane+1));
  document.write("</td>");

  laneDrumTrigs(lane);

  document.write("</tr>");
}

function laneDrumTrigs(lane)
{
  document.write("<td class='spacer'></td>");

  for(let i = 0; i < 32; ++i)
  {
    document.write("<td id='drum-step-" + lane + "-" + i + "'>");
    document.write("<button id='drum-trig-" + lane + "-" + i + "'");
    document.write(" data-lane='" + lane + "'");
    document.write(" data-step='" + i + "'");
    document.write(" class='notrig'");
    document.write(" onclick='toggleDrumTrig(this)'>&nbsp;</button>");
    document.write("</td>");

    if((i + 1) % 8 === 0)
    {
      document.write("<td></td>");
    }
  }
}

function updateDrumTrig(trig, value)
{
  trig.classList.remove("notrig");
  trig.classList.remove("trig");
  trig.classList.remove("accent");
  switch(value)
  {
    case 1:
      trig.textContent="o";
      trig.classList.add("trig");
      break;
    case 2:
      trig.textContent="X";
      trig.classList.add("accent");
      break;
    default:
      trig.textContent=" ";
      trig.classList.add("notrig");
      break;
  }
}

function toggleDrumTrig(trig)
{
  let value = trig.textContent==="o" ? 
                2 : 
                (trig.textContent==="X" ? 0 : 1);
  updateDrumTrig(trig, value);
  setDrumTrig(trig.dataset.lane, trig.dataset.step, value);
}

function updateDrumLaneRange(lane)
{
  const start = parseInt(elem("drum-start-" + lane).value);
  const end   = parseInt(elem("drum-end-"   + lane).value);

  for(let i = 0; i < 32; ++i)
  {
    const cell = elem("drum-step-" + lane + "-" + i);

    if(i >= start && i <= end)
    {
      cell.classList.add("step-active");
      cell.classList.remove("step-inactive");
    }
    else
    {
      cell.classList.add("step-inactive");
      cell.classList.remove("step-active");
    }
  }
}

function initDrumSeq()
{
  window.addEventListener("load", function()
  {
    for(let lane=0; lane<8; ++lane)
    {
      updateDrumLaneRange(lane);
    }
  });
}

  ////////////////////////////////////////////////////////////////////////////
 //
// Sequencer

function updateSeqMute(muted)
{
  const button = elem("seq-mute");
  const image  = button.querySelector("img");
  const seqn   = num('seq-screen-index') + 1;

  if(muted)
  {
    image.src = "icons/mute.png";
    image.alt = "Muted sequencer " + seqn;
    button.setAttribute("aria-pressed", "true");
  }
  else
  {
    image.src = "icons/unmute.png";
    image.alt = "Unmuted lane " + seqn;
    button.setAttribute("aria-pressed", "false");
  }
}

function toggleSeqMute()
{
  const muted = elem('seq-mute').classList.toggle("muted");
  updateSeqMute(muted);
  setSeqMute(muted, num('seq-screen-index'));
}

function midiNoteOptions(selected)
{
  const midiNote = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  let   note     = 0;
  let   value    = 0;
  let   number   = -1;
  
  for(let value=0; value<128; ++value)
  {
    document.write("<option value='"+value+"'"+(value===selected ? ' selected':'')+">");
    document.write(value + " " + midiNote[note] + number);
    document.write("</option>");
    
    if(++note > 11)
    {
      note = 0;
      ++number;
    }
  }
}

function updateSeqPatternState(button, state)
{
  const substep = parseInt(button.dataset.substep);
  const step    = parseInt(button.dataset.step);

  button.dataset.state = state;
  button.classList.remove("pattern-off", "pattern-on", "pattern-tie");

  switch(state)
  {
    case 0:
      button.classList.add("pattern-off");

      // See if next step is a tie that needs set to on.
      if(substep < 7)
      {
        const next = elem("seq-pattern-" + step + "-" + (substep + 1));

        if(parseInt(next.dataset.state || "0") === 2)
        {
          next.dataset.state = "1";
          next.classList.remove("pattern-tie");
          next.classList.add("pattern-on");
        }
      }
      break;

    case 1:
      button.classList.add("pattern-on");
      break;

    case 2:
      button.classList.add("pattern-tie");
      break;
  }
}

function toggleSeqPattern(button)
{
  const step    = parseInt(button.dataset.step);
  const substep = parseInt(button.dataset.substep);
  let   state   = parseInt(button.dataset.state || "0");

  switch(state)
  {
    case 0:       // A click in the off state turns it on
      state = 1;
      break;

    case 1:       // A click in the on state
      if(substep === 0) // If it's the first substep, then off it is.
      {
        state=0;  
        break;
      }

      // Get previous
      const previous      = elem("seq-pattern-" + step + "-" + (substep - 1));
      const previousState = parseInt(previous.dataset.state || "0");
      
      state = previousState === 0 ? 0 : 2;
      break;

    case 2:      // A click in the tie state turns it off
      state = 0;
      break;
  }
  
  updateSeqPatternState(button, state);
}

function updateSeqPatternLength(step)
{
  const length = num("seq-length-" + step) + 1;

  for(let sub = 0; sub < 8; ++sub)
  {
    const cell = elem("seq-pattern-" + step + "-" + sub);

    if(sub < length)
    {
      cell.style.display = "";
    }
    else
    {
      cell.style.display = "none";
    }
  }
}

function seqPattern(step)
{
  document.write("<div class='seq-pattern'>");

  for(let substep = 0; substep < 8; ++substep)
  {
    document.write("<button");
    document.write(" id='seq-pattern-" + step + "-" + substep + "'");
    document.write(" class='pattern-off'");
    document.write(" data-step='" + step + "'");
    document.write(" data-substep='" + substep + "'");
    document.write(" onclick='toggleSeqPattern(this)'");
    document.write(" aria-label='Step " + (step + 1) + ", substep " + (substep + 1) + "'>");
    document.write("</button>");
  }

  document.write("</div>");
}

function seqSteps(start, finish)
{
  document.write("<tr><td class='colhdr'>Degree</td>");
  for(let step=start; step<finish; ++step)
  {
    document.write("<td><select id='seq-degree-"+step+"'>");
    optionRange(0,15);
    document.write("</select></td>");
  }
  document.write("</tr>");
  
  document.write("<tr><td class='colhdr'>Octave</td>");
  for(let step=start; step<finish; ++step)
  {
    document.write("<td><select id='seq-octave-"+step+"'>");
    optionRange(0,7,3);
    document.write("</select></td>");
  }
  document.write("</tr>");
  
  document.write("<tr><td class='colhdr'>Pattern</td>");
  for(let step=start; step<finish; ++step)
  {
    document.write("<td class='seq-pattern-cell'>");
    seqPattern(step);
    document.write("</td>");
  }
  document.write("</tr>");
  
  document.write("<tr><td class='colhdr'>Length</td>");
  for(let step=start; step<finish; ++step)
  {
    document.write("<td><select id='seq-length-" + step + "'");
    document.write(" onchange='updateSeqPatternLength(" + step + ")'>");
    optionRange(1, 8, 1, 1);
    document.write("</select></td>");
  }
  document.write("</tr>");
  
  document.write("<tr><td class='colhdr tooltip' data-tooltip='Divide this step into multiple rapid note triggers.'>Ratchet</td>");
  for(let step=start; step<finish; ++step)
  {
    document.write("<td><input id='seq-ratchet-"+step+"' type='checkbox'></td>");
  }
  document.write("</tr>");
  
  document.write("<tr><td class='colhdr tooltip' data-tooltip='Skip this step without advancing the sequence normally.'>Skip</td>");
  for(let step=start; step<finish; ++step)
  {
    document.write("<td><input id='seq-skip-"+step+"' type='checkbox'></td>");
  }
  document.write("</tr>");
  
  document.write("<tr><td class='colhdr tooltip' data-tooltip='Reset the sequence to its first step when playback reaches this step.'>Reset</td>");
  for(let step=start; step<finish; ++step)
  {
    document.write("<td><input id='seq-reset-"+step+"' type='checkbox'></td>");
  }
  document.write("</tr>");
  
  // A flipped view of "mute" to the more common viewpoint of probability
  document.write("<tr><td class='colhdr tooltip' data-tooltip='Chance that this step will play.'>Probability</td>");
  for(let step=start; step<finish; ++step)
  {
    document.write("<td><select id='seq-prob-"+step+"'>");
    document.write("<option value='0'>100%</option>");
    document.write("<option value='1'>86%</option>");
    document.write("<option value='2'>71%</option>");
    document.write("<option value='3'>57%</option>");
    document.write("<option value='4'>43%</option>");
    document.write("<option value='5'>29%</option>");
    document.write("<option value='6'>14%</option>");
    document.write("<option value='7'>0%</option>");
    document.write("</select></td>");
  }
  document.write("</tr>");
  
  window.addEventListener("load", function()
  {
    for(let step = 0; step < 32; ++step)
    {
      updateSeqPatternLength(step);
    }
  });
}
