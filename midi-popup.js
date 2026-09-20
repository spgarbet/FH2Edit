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

  elem("midi-map-assign"  ).addEventListener("click",  assignMidiMap    );
  elem("midi-map-remove"  ).addEventListener("click",  removeMidiMap    );
  elem("midi-map-channel" ).addEventListener("change", updateMidiMap    );
  elem("midi-map-cc"      ).addEventListener("change", updateMidiMap    );
  elem("midi-map-relative").addEventListener("change", updateMidiMap    );
}

function showMidiMapPopup(button)
{
  midiMapButton = button;
  const map = locateMapping(
    button.dataset.type,
    button.dataset.dest,
    Number(button.dataset.index)
  );
  
  button.dataset.slot = map ? map.slot : "";
  
  elem("midi-map-channel").value    = map ? map.channel  : 0;
  elem("midi-map-cc"     ).value    = map ? map.cc       : 0;
  elem("midi-map-relative").checked = map ? map.relative : false;

  const rect  = button.getBoundingClientRect();
  const popup = elem("midi-map-popup");
  
  elem("midi-map-relative").hidden = midiMapButton.dataset.typeRelative === 'false';

  popup.hidden = false;
  popup.style.left = `${rect.left   + window.scrollX}px`;
  popup.style.top  = `${rect.bottom + window.scrollY + 4}px`;
}

function updateMidiMap()
{
  if (!midiMapButton) { return; }
  
  const mapping = locateMapping(
    midiMapButton.dataset.type,
    midiMapButton.dataset.dest,
    Number(midiMapButton.dataset.index)
  );

  if (!mapping) { return; }

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
    button.dataset.slot="";
    button.innerHTML =
      '<img src="icons/midi-din.svg" alt="MIDI DIN5">';
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
  
  if(midiMapButton.dataset.slot !== "")
  {
    clearMapping(Number(midiMapButton.dataset.slot));
    midiMapButton.dataset.slot="";
  }
  
  const typeControl = elem(midiMapButton.dataset.typeControl);
  if(typeControl) { typeControl.value = 0; }
  
  renderMidiMapButton(midiMapButton, false);
  hideMidiMapPopup();
}

function hideMidiMapPopup()
{
  elem("midi-map-popup").hidden = true;
  midiMapButton = null;
}

function assignMidiMap()
{
  if (!midiMapButton) { return; }

  const mapping = locateMapping(
    midiMapButton.dataset.type,
    midiMapButton.dataset.dest,
    Number(midiMapButton.dataset.index)
  );

  const slot = mapping                                    ? mapping.slot      : 
               midiMapButton.dataset.dest === 'glb_tap'   ? SLOT_GLOBAL_TAP   :
               midiMapButton.dataset.dest === 'glb_start' ? SLOT_GLOBAL_START :
                                                            nextMappingSlot();

  if (slot === null)
  {
    alert("No available MIDI Mapping slots. All 384 occupied.");
    return;
  }

  writeMapping(
    slot,
    midiMapButton.dataset.type,
    Number(midiMapButton.dataset.index),
    midiMapButton.dataset.dest,
    Number(elem("midi-map-channel").value),
    Number(elem("midi-map-cc").value),
    elem("midi-map-relative").checked
  );
  
  const typeControl = elem(midiMapButton.dataset.typeControl);
  if(typeControl && Number(typeControl.value) === 0)
  {
    typeControl.value = 1;
    typeControl.dispatchEvent(new Event("change"));
  }

  renderMidiMapButton(
    midiMapButton,
    {
      slot,
      channel: Number(elem("midi-map-channel").value),
      cc: Number(elem("midi-map-cc").value),
      relative: elem("midi-map-relative").checked
    }
  );

  hideMidiMapPopup();
}