# Flamingo Fields 3D

The game rebuilt as a real 3D world with three.js, next to the original `index.html`, which keeps working as before.

Open `game3d/index.html` through a web server, like the main game. The kids' models, textures and animations load from `game3d/assets/`.

## Units

The 3D world is in metres. The original game's units convert with `U = 1.43 / 98` metres per unit: its big kid is 98 units tall, and the 3D girl is 1.43 m. Left and right are mirrored against the game's numbers, because the game's screen maths and three.js are mirror images. The mirroring keeps the sun, the peaks and the wind on the same side as in the game.

## Files

- `index.html`: the world (hills, grass, sky, clouds, ranges), the camera, the controls and the loop.
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
- [ ] Feathers in the grass
- [ ] The great feather
- [ ] Ten feathers give ten seconds of flight
- [ ] Blue feathers give a burst of speed
- [ ] Wild flamingo flocks: fly with one for 8 s and a bird joins
- [ ] A full flock of five gives free, high, fast flight
- [ ] The flamingo icons
- [ ] Golden evening until the 4th flamingo, then the 8-minute day and night
- [ ] Moon and stars
- [ ] The night grade
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
- [ ] Flock calls
- [ ] Music
- [ ] Wind
- [ ] The road's answer
- [ ] Sea
- [ ] Chimes

### Interface

- [ ] Feather counter
- [x] Sound button
- [ ] Hint
- [ ] `#test` buttons
- [x] Phone controls

## Milestones

1. **Walkable level 1 (done):** the field, the kids, the camera and controls. Flying is free for now.
2. **Flamingos and feathers**
3. **Day to night:** sunset, moon, sea and coast, the box and its door
4. **Level 2:** the whales
5. **Sound and polish, then phones**
