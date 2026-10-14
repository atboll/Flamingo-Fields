/* ---------- Settings: the numbers worth tuning, the level the game is on, and the dev switch ----------
   Loaded first, so every other file can read these. */

/* the dunes' shape and paint (the #dev-dunes page has sliders for all of these, and prints a line like this one to paste back here) */
const DUNE={size:1, height:1, round:1.1, curve:1, cross:0.3, angle:0.45, contrast:2.2, soft:0.85, crest:0, warm:0.85, ripple:1, ridges:0};

/* each level's feel: gravity and the hop's lift (metres, seconds); level 2's clouds are lighter, so the hop goes about 5.5 m high and floats.
   The land on level 2 also lies a tenth lower. */
const LEVELS={
  1:{gravity:14,   hop:5.2,  land:1},
  2:{gravity:10.5, hop:11.0, land:0.9}};

/* flying: the height the kids cruise at, and their speed (the page raises it for full-flock flight) */
const CRUISE=4.5, FLY_BASE=13;

/* the level the game is on (1: the field and the desert; 2: the clouds and the whales). Changed only by enterLevel2 and leaveLevel2 (level2.js). */
let LEVEL=1, G=LEVELS[1].gravity, HOP=LEVELS[1].hop;

/* the dev switch: the address ends in #dev for the test buttons and keys (+1 flamingo, To the box, Dusk, B, N),
   or in one of the test modes, which also have them:
     #dev-level2    starts on the clouds of level 2
     #dev-dunes     the kids out in the dunes, with sliders for the dunes
     #dev-flamingo  a flamingo in front of the kids, with buttons for each of its moves
   A built test page can set window.DEVMODE ('' for plain dev, or a mode's name) instead of the address. */
const DEV=(()=>{ const h=window.DEVMODE!==undefined ? '#dev'+(window.DEVMODE?'-'+window.DEVMODE:'') : location.hash,
  m=/^#dev(?:-(level2|dunes|flamingo))?$/.exec(h); return m?{on:true, mode:m[1]||''}:{on:false, mode:''}; })();
