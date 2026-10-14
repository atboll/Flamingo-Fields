# Flamingo Fields 3D

The game rebuilt as a real 3D world with three.js, next to the original `index.html`, which keeps working as before.

Open `game3d/index.html` through a web server, like the main game. The kids' models, textures and animations load from `game3d/assets/`.

## Units

The 3D world is in metres. The original game's units convert with `U = 1.43 / 98` metres per unit: its big kid is 98 units tall, and the 3D girl is 1.43 m. Left and right are mirrored against the game's numbers, because the game's screen maths and three.js are mirror images. The mirroring keeps the sun, the peaks and the wind on the same side as in the game.

## Files

`index.html` holds only the page: its styles, the buttons, and the scripts in the order they need each other.

| File | What it holds |
|---|---|
| `settings.js` | The numbers worth tuning (the dunes, each level's gravity and hop, flying height and speed), the level the game is on (`LEVEL`), and the dev switch (`DEV`). Loaded first. |
| `kids.js` | The two kids: models, animations, wind in hair and skirt, painted faces, recolouring, the default look ("Look 1"), and all their movement rules. |
| `flock.js` | The flamingos: the wild flocks (the 2D game's own rules, in its units) and your own flock, drawn with the FAB American flamingo. |
| `ground.js` | Units and the game's helpers, and the land: `groundAt` for the processor and `GROUND_GLSL` for the graphics card, side by side. The two must agree; with `#dev` the page checks they do. |
| `world.js` | Renderer, sky, clouds, ranges, the ground and grass, the horizon mist, seeds, the evening light, the camera and the controls. |
| `sound.js` | Field recording, footsteps, flock calls, music, fast-flight wind, the sound button. |
| `night.js` | The day and night clock, the night grade, the moon and stars, and drawing the frame. |
| `road.js` | The feather road to the moon. |
| `desert.js` | The desert, the silver box and its door and light, and the flamingos round it. |
| `feathers.js` | Feathers in the grass, the counter, and when the kids may fly. |
| `level2.js` | Level 2: through the door onto the pink clouds, the lone door, dawn, the level signs, flying only near whales. |
| `whales.js` | The ten whales of level 2, their swimming, crossings and songs. |
| `dunes.js` | The far dune ridges (off for now) and the dune sliders of `#dev-dunes`. |
| `buttons.js` | Reset level, and the test buttons. |
| `dev.js` | The test modes, the build stamp and the ground check. |
| `game.js` | The one loop, in a fixed order, and the start. |
| `assets/` | Models, textures, animation clips and sounds. Where `.fbx` or `.glb` files can't be served, the loaders also accept base64 text copies. |

The loop in `game.js` calls everything in one fixed order each frame, and switches on `LEVEL` for what belongs to each level. No file changes another file's functions.

## Dev modes

Add one of these to the address:

- `#dev`: the test buttons (+1 flamingo, To the box, Dusk) and keys (B lays the desert ahead, N skips to the next part of the day), a stamp in the corner with the build and the ground check.
- `#dev-level2`: starts on the clouds of level 2.
- `#dev-dunes`: the kids out in the dunes with sliders for the dunes' shape and paint; it prints a `DUNE=` line to paste into `settings.js`.
- `#dev-flamingo`: a flamingo in front of the kids, with a button for each of its moves, its speed and its turn.

Without these the player sees only Sound and Reset level.

## Building the page to publish

`python3 build.py` writes the published page from `index.html` (into `build/`, with the scripts beside it) and stamps it with the commit and date, shown in the dev stamp. See the top of `build.py`.

## Tools

The editors and the whale page that made the game's looks are in `../tools/` (see its README).

## Checklist: everything in the original game

### Level 1

- [x] Rolling golden hills (the game's own ground shape)
- [x] Wind-blown grass
- [x] Drifting seeds
- [x] Evening sky
- [x] Low sun
- [x] Lens flare
- [x] Paper grain
- [x] Painted clouds
- [x] Blue-green ranges, with two peaks under the sun and moon
- [x] Groves of trees (the painted treelines on the horizon; 3D groves in the field are to be redesigned)
- [x] The kids run and hop
- [ ] Sprinting over a crest throws them into the air
- [x] They fly and glide down
- [x] The second kid follows
- [x] Feathers in the grass (`feathers.js`; the feather is one of the FAB flamingo's flight feathers, `assets/feather.png`)
- [x] The great feather
- [x] Ten feathers give ten seconds of flight (flying is earned again; the time stops while flying with a flock)
- [ ] Blue feathers give a burst of speed
- [x] Wild flamingo flocks pass overhead (`flock.js`: the 2D game's flock rules, with the FAB flamingo)
- [x] Fly with a flock for 8 s and a bird joins (it flies with the kids, and walks or stands on the ground)
- [x] A full flock of five gives free, high, fast flight (about 1.4 times feather speed: half the 2D game's extra)
- [x] The flamingo icons
- [x] Golden evening until the 4th flamingo, then the 8-minute day and night (`night.js`; with `#dev` the N key skips to the next part of the day)
- [x] Moon and stars (the moon is your pencil drawing, `assets/moon.png`, with a soft corona and bloom; it rises between the peaks, clouds pass over it)
- [x] The night grade (violet dusk, moonlit blue, the moon's glow and its pool of light on the field; the feathers glow)
- [x] The feather road to the moon (`road.js`: gathers on a full-flock night, scatters round the kids, answers with `path.mp3`)
- [x] The mountains part as you near the box (the 2D game's rule; the treelines slide apart with them; the cloud banks behind the peaks are still to come)
- [x] The desert dunes (`desert.js`, with the dunes in `groundAt` on both the processor and the graphics card; laid when the road is first flown; with `#dev` the B key jumps there)
- [ ] The beach: waves, boulders, bushes, flamingos feeding
- [x] The silver box and its door (built in code: brushed silver, a tone per face; a frameless doorway full of white light that pours out over the face, into the air and across the sand; by the box the night waits)
- [x] Flamingos round the box (26, wandering, feeding and resting, as the 2D game's shore birds)
- [ ] Landing on top of the box
- [x] Your flock walks off to join the box's flamingos (when the kids come close to the door; the counter goes, the wings stay)
- [x] The door's light as in the 2D game: bloom over the face, the fan on the sand, the kids and birds dark against it, the light taking the view at the door
- [x] Through the door to level 2 (walk into the light and on out onto the clouds)

### Level 2

- [x] The pink sea of cloud (the 2D game's lumps, as 3D shapes; dawn on arrival, then the day goes round; lighter gravity)
- [x] Ten humpback whales and their songs (`whales.js`, from `tools/whale-3d.html`; the kids can fly only near them)
- [ ] The cloud deck
- [ ] Fog
- [x] The level signs (LEVEL 1 on opening, LEVEL 2 ten seconds onto the clouds, in Klee One)

### Sound

- [x] Field ambience (`assets/field01.mp3`, the new field recording, looped with a 4 s crossfade)
- [x] Footsteps (the 2D game's `run_big.wav`, the small kid's 10% faster and offset)
- [x] The chimes when you fall in with a flock
- [x] Flock calls (the 2D game's `flamingos.mp3`, louder as the flock nears, and heard from its side)
- [x] Music (`pad.mp3`, once, when the flock is complete)
- [x] Fast-flight wind (`fast.mp3`, swelling with full-flock speed)
- [ ] Wind
- [x] The road's answer (`path.mp3`)
- [ ] Sea
- [ ] Chimes

### Interface

- [x] Feather counter
- [x] Sound button
- [x] The pink arrow at the screen's edge when a coming flock is out of view
- [ ] Hint
- [x] Test buttons and keys (with `#dev`)
- [x] Phone controls

## Milestones

1. **Walkable level 1 (done):** the field, the kids, the camera and controls. Flying is free for now.
2. **Flamingos and feathers**
3. **Day to night:** sunset, moon, sea and coast, the box and its door
4. **Level 2:** the whales (done)
5. **Sound and polish, then phones**
