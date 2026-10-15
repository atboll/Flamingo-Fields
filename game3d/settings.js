/* ---------- Settings: the numbers worth tuning, the level the game is on, and the dev switch ----------
   Loaded first, so every other file can read these. */

/* the dunes' shape and paint (the #dev-dunes page has sliders for all of these, and prints a line like this one to paste back here) */
const DUNE={size:1, height:1, round:1.1, curve:1, cross:0.3, angle:0.45, contrast:2.2, soft:0.85, crest:0, warm:0.85, ripple:1, ridges:0};

/* each level's feel: gravity and the hop's lift (metres, seconds); level 2's clouds are lighter, so the hop goes about 5.5 m high and floats.
   The land on level 2 also lies a tenth lower. */
const LEVELS={
  1:{gravity:14,   hop:5.2,  land:1},
  2:{gravity:10.5, hop:11.0, land:0.9}};

/* sound levels: the fast-flight wind (was 1.8) and the music that plays when the flock is complete (was 0.7) */
const SOUND={fastWind:0.9, music:1.4};

/* flying: the height the kids cruise at, and their speed (the page raises it for full-flock flight) */
const CRUISE=4.5, FLY_BASE=13;

/* the camera near the top of the sky (level 1): over the last quarter of the height the kids may reach (feathers or a full flock)
   it rises a little more (metres, at the feather and full-flock limits), tips down further (degrees) and widens its view (degrees) */
const CAMTOP={start:0.75, raiseFeather:2, raiseFlock:5, tilt:8, wider:8};

/* the puzzle at the box (rings.js): a bank of fog over the desert round the box (radius and height in metres, density per metre),
   and five rings of stones in it (radius in metres). Land in a ring and one of your flamingos stays there; five, and the fog lifts and the door opens. */
const PUZZLE={fogR:380, fogH:45, fog:0, ringR:3,   // fog 0: no fog bank for now (it was 0.02)
  lightTime:1.5,                                 // seconds for a ring to brighten, all at once, once its flamingo stands in it
  beamH:260, beamTime:2.2, beamDay:0.6, beamNight:1.0};   // then a column of light rises from it: its height (m), the seconds it takes to rise, its brightness by day and by night

/* the crater: the box stands in the middle of a round desert crater, there from the start, this far (m) from where the kids begin,
   toward the moon. It is sunk into the land: a low rim (m above the field, uneven round the circle) you can look over to the horizon,
   and a floor this deep (m) below the field, so the 29 m box stays out of sight until you reach the rim. The inside wall (terraced)
   and the outside wall are this wide (m); the field's grass climbs half way up the outside wall, and rubble thrown out lies beyond it. */
const CRATER={dist:1500, radius:400, rim:7, depth:40, inner:150, outer:180};

/* going through the door: the kids walk in through the doorway, and this many metres past its face (about 5 steps) the view is all white and they are through */
const DOOR={walkIn:3.5};

/* the level the game is on (1: the field and the desert; 2: the clouds and the whales). Changed only by enterLevel2 and leaveLevel2 (level2.js). */
let LEVEL=1, G=LEVELS[1].gravity, HOP=LEVELS[1].hop;

/* the dev switch: the address ends in #dev for the test buttons and keys (+1 flamingo, To the box, Dusk, B, N),
   or in one of the test modes, which also have them:
     #dev-level2    starts on the clouds of level 2
     #dev-dunes     the kids out in the dunes, with sliders for the dunes
     #dev-flamingo  a flamingo in front of the kids, with buttons for each of its moves
     #dev-box       the kids at the edge of the fog round the box, with a full flock and the door still shut (the F key fills the next ring)
   A built test page can set window.DEVMODE ('' for plain dev, or a mode's name) instead of the address. */
const DEV=(()=>{ const h=/^#dev/.test(location.hash) ? location.hash : window.DEVMODE!==undefined ? '#dev'+(window.DEVMODE?'-'+window.DEVMODE:'') : location.hash,   // (an address tag wins over the page's own)
  m=/^#dev(?:-(level2|dunes|flamingo|box))?$/.exec(h); return m?{on:true, mode:m[1]||''}:{on:false, mode:''}; })();
