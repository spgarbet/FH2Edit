FH2Edit.html: flat.html
	minify -o FH2Edit.html flat.html

flat.html: app.html app.js default.js lfo.js mappings.js midi.js midi-popup.js model.js parser.js render.js style.css ui.js
	./inline.py app.html flat.html
