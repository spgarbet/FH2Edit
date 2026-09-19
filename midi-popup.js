let midiMapButton = null;

function initMidiMapButtons()
{
  const mappings = allMappings();
  const buttons  = document.querySelectorAll(".midi-map-button");
 
  for (const button of buttons)
  {
    const mapping = locateMapping(
      button.dataset.type,
      button.dataset.dest,
      Number(button.dataset.index),
      mappings
    );

    renderMidiMapButton(button, mapping);

    button.addEventListener("click", function(event)
    {
      event.stopPropagation();
      showMidiMapPopup(this);
    });
  }

  elem("midi-map-assign"  ).addEventListener("click",  hideMidiMapPopup );
  elem("midi-map-remove"  ).addEventListener("click",  removeMidiMap    );
  elem("midi-map-channel" ).addEventListener("change", updateMidiMap    );
  elem("midi-map-cc"      ).addEventListener("change", updateMidiMap    );
  elem("midi-map-relative").addEventListener("change", updateMidiMap    );
}

function showMidiMapPopup(button)
{
  midiMapButton = button;

  const mapping = locateMapping(
    button.dataset.type,
    button.dataset.dest,
    Number(button.dataset.index)
  );
  
  button.dataset.slot = mapping ? mapping.slot : "";

  elem("midi-map-channel").value    = mapping ? mapping.channel  : 0;
  elem("midi-map-cc"     ).value    = mapping ? mapping.cc       : 0;
  elem("midi-map-relative").checked = mapping ? mapping.relative : false;

  const rect  = button.getBoundingClientRect();
  const popup = elem("midi-map-popup");

  popup.hidden = false;
  popup.style.left = `${rect.left   + window.scrollX}px`;
  popup.style.top  = `${rect.bottom + window.scrollY + 4}px`;
}

function updateMidiMap()
{
  if (!midiMapButton) { return; }
  
  if(midiMapButton.dataset.slot === "")
  {
    midiMapButton.dataset.slot = nextMappingSlot();
  }

  writeMapping(
    Number(midiMapButton.dataset.slot),
    midiMapButton.dataset.type,
    Number(midiMapButton.dataset.index),
    midiMapButton.dataset.dest,
    Number(elem("midi-map-channel").value),
    Number(elem("midi-map-cc").value),
    elem("midi-map-relative").checked
  );
}

function renderMidiMapButton(button, mapping)
{
  if (!mapping)
  {
    button.classList.remove("assigned");
    delete button.dataset.slot;
    button.innerHTML =
      '<img src="../icons/midi-din.svg" alt="MIDI DIN5">';
    return;
  }

  button.classList.add("assigned");
  button.dataset.slot = mapping.slot;
  button.textContent =
    `${mapping.channel + 1}/${mapping.cc}` +
    (mapping.relative ? ".R" : "");
}

function removeMidiMap()
{
  if (!midiMapButton) { return; }

  if(midiMapButton.dataset.slot != "")
  {
    clearMapping(midiMapButton.dataset.slot);
    midiMapButton.dataset.slot="";
  }
  hideMidiMapPopup();
}

function hideMidiMapPopup()
{
  if(midiMapButton.dataset.slot === "")
  {
    renderMidiMapButton(midiMapButton, null);
  }
  else
  {
    renderMidiMapButton(midiMapButton, {
      channel:  Number(elem("midi-map-channel").value),
      cc:       Number(elem("midi-map-cc").value),
      relative:  elem("midi-map-relative").checked
    });
  }

  elem("midi-map-popup").hidden = true;
  midiMapButton = null;
}