# Flamingo Fields 3D

The game rebuilt as a real 3D world with three.js, next to the original `index.html`, which keeps working as before.

Open `game3d/index.html` through a web server, like the main game. The kids' models, textures and animations load from `game3d/assets/`.

## Units

The 3D world is in metres. The original game's units convert with `U = 1.43 / 98` metres per unit: its big kid is 98 units tall, and the 3D girl is 1.43 m. Left and right are mirrored against the game's numbers, because the game's screen maths and three.js are mirror images. The mirroring keeps the sun, the peaks and the wind on the same side as in the game.

## Files

- `index.html`: the world (hills, grass, sky, clouds, ranges), the camera, the controls and the loop.
- `flock.js`: the wild flamingo flocks: the 2D game's own rules (in its units), drawn with the FAB American flamingo.
- `feathers.js`: feathers in the grass, the counter at the top, and flight earned with feathers.
- `night.js`: the day and night clock, the night grade, the moon and the stars.
- `kids.js`: the two kids, lifted from `mockups/kids-test-field.html`. It holds their models, animations, wind in hair and skirt, painted faces, recolouring, the default look ("Look 1"), and all their movement rules.
- `assets/`: the kids' FBX models, textures and animation clips. Where `.fbx` files can't be served, the loader also accepts each model as base64 text (`girl.fbx.b64.txt`).

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
- [x] Groves of trees (3D groves in the field, and the painted treelines on the horizon)
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
- [x] Golden evening until the 4th flamingo, then the 8-minute day and night (`night.js`; the N key skips to the next part of the day, for testing)
- [x] Moon and stars (the moon is your pencil drawing, `assets/moon.png`, with a soft corona and bloom; it rises between the peaks, clouds pass over it)
- [x] The night grade (violet dusk, moonlit blue, the moon's glow and its pool of light on the field; the feathers glow)
- [ ] The feather road to the moon, which parts the mountains and shows the sea
- [ ] The desert dunes
- [ ] The beach: waves, boulders, bushes, flamingos feeding
- [ ] The silver box and its door

### Level 2

- [ ] The pink sea of cloud
- [ ] Ten humpback whales and their songs
- [ ] The cloud deck
- [ ] Fog
- [ ] The level sign

### Sound

- [x] Field ambience (`assets/field01.mp3`, the new field recording, looped with a 4 s crossfade)
- [x] Footsteps (the 2D game's `run_big.wav`, the small kid's 10% faster and offset)
- [x] The chimes when you fall in with a flock
- [x] Flock calls (the 2D game's `flamingos.mp3`, louder as the flock nears, and heard from its side)
- [x] Music (`pad.mp3`, once, when the flock is complete)
- [x] Fast-flight wind (`fast.mp3`, swelling with full-flock speed)
- [ ] Wind
- [ ] The road's answer
- [ ] Sea
- [ ] Chimes

### Interface

- [x] Feather counter
- [x] Sound button
- [x] The pink arrow at the screen's edge when a coming flock is out of view
- [ ] Hint
- [ ] `#test` buttons
- [x] Phone controls

## Milestones

1. **Walkable level 1 (done):** the field, the kids, the camera and controls. Flying is free for now.
2. **Flamingos and feathers**
3. **Day to night:** sunset, moon, sea and coast, the box and its door
4. **Level 2:** the whales
5. **Sound and polish, then phones**
