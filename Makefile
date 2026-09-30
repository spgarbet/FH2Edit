FH2Edit.html: build build/inlined.html
	minify -o FH2Edit.html build/inlined.html

build/assets: assets
	ln -s ../assets build/assets

build/icons: icons
	ln -s ../icons build/icons
	
build/inlined.html: build/assets build/icons build/flat.html
	utils/inline-images.py build/flat.html build/inlined.html

build/flat.html: app.html app.js default.js lfo.js mappings.js midi.js midi-popup.js model.js parser.js render.js style.css ui.js
	utils/flatten.py app.html build/flat.html

build: 
	mkdir build

.PHONY : clean
clean: 
	rm -r build
	