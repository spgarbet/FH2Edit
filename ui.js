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

  if (!popup)
  {
    return;
  }

  popup.classList.add("visible");

  positionTooltip(tooltip);
}


function hideTooltip(tooltip)
{
  const popup = tooltip.querySelector(".tooltip-popup");

  if (!popup)
  {
    return;
  }

  popup.classList.remove("visible");
}


function positionTooltip(tooltip)
{
  const popup = tooltip.querySelector(".tooltip-popup");

  if (!popup || !popup.classList.contains("visible"))
  {
    return;
  }

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

  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;

  /*
   * Prefer above.
   */
  let top = anchor.top - popupRect.height - gap;

  /*
   * If there isn't enough room above, put it below.
   */
  if (top < margin)
  {
    top = anchor.bottom + gap;
  }

  /*
   * If it doesn't fit below either, clamp it vertically.
   */
  if (top + popupRect.height > viewportHeight - margin)
  {
    top = Math.max(
      margin,
      viewportHeight - popupRect.height - margin
    );
  }

  /*
   * Center horizontally on the control.
   */
  let left = anchor.left +
    (anchor.width - popupRect.width) / 2;

  /*
   * Keep the tooltip inside the left edge.
   */
  if (left < margin)
  {
    left = margin;
  }

  /*
   * Keep the tooltip inside the right edge.
   */
  if (left + popupRect.width > viewportWidth - margin)
  {
    left = viewportWidth - popupRect.width - margin;
  }

  /*
   * Apply the final position.
   */
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
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
}

function nybbleChar( n )
{
	if ( n >= 10 ) { return String.fromCharCode( 'A'.charCodeAt( 0 ) + n - 10 ); }
	return String.fromCharCode( '0'.charCodeAt( 0 ) + n );
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

function midiLogOut(sysex) { dumpSysex( sysex, "raw-midi-output" ); }
function midiLogIn(sysex)  { dumpSysex( sysex, "raw-midi-input" );  }	

function optionRange(low, high)
{
  for ( let i=low; i<=high; i++)
  {
  	document.write( '<option value=' + i + '>' + i + '</option>' );
  }
}

