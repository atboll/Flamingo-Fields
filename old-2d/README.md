# Flamingo Fields (2D, retired)

The original 2D game, kept as a backup. The game now is the 3D one in `../game3d/`. This folder still plays on its own: serve it and open `index.html` (add `#test` for its test buttons).

A small browser game. Two kids run through a windy golden field, collect flamingo feathers to fly, and gather a flock of flamingos.

## Play

Open this folder's `index.html` through a web server (the sounds will not load from a `file://` address). With GitHub Pages enabled, it is at `old-2d/` under the repository's Pages address.

To run it locally:

```
python3 -m http.server 8000
```

then open http://localhost:8000/old-2d/.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Run | WASD or arrow keys (click the field first) | Drag |
| Hop | Space | Tap |
| Fly (10 feathers, or a full flock) | Space twice | Tap twice |
| Rise while flying (higher with a full flock) | W or up arrow | Drag up |
| Descend while flying | S or down arrow | Drag down |
| Burst of speed | Fly through a floating blue feather | Same |
| Land (full flock only) | Space | Tap |

## Testing

Add `#test` to the end of the address to show the test buttons: start over with no flamingos, a full flock on and off, one flamingo at a time, a jump to dusk, deep night with the feather road, the mountains almost open, and a flight straight to the beach. A line under them shows the build, the flock size, the day clock and how dark it is. Without `#test` they are hidden.

## How it works

- Collect 10 feathers to fly for 10 seconds. A rare great feather fills the counter at once.
- A flock of ten flamingos crosses the sky once a minute. Fly with them for 8 seconds and one joins you; the row of small flamingos at the top fills in as you go.
- With five flamingos your flock is complete: you can fly whenever you like, for as long as you like, much higher than before, and fast.
- The day stays in golden evening until the fourth flamingo joins. Then the first dusk falls, and from there day and night turn on an eight-minute cycle.
- At night, with a full flock, the field's feathers gather into two glowing lines that run to the horizon under the moon. A sound answers when you fly along them. The wild flock heads the same way.
- Two peaks frame the moon, which rises between them at dusk and sets by dawn. Fly the feather road toward it and the mountains slowly slide apart and rise, with a sea showing on the horizon between them. They stay parted.
- Past the mountains the grass thins into dunes and a beach with a wandering shoreline, waves, boulders, bushes and flamingos feeding at the water. Land there and LEVEL 2 shows, the day breaks, and your flock walks off to join the others. Wild flocks land there too. You keep the ability to fly.

## Files

- `index.html`: the whole game (drawing, movement and sound code) in one file, drawn on a canvas with no libraries.
- `field.mp3`: field ambience, looped.
- `run_big.wav`: footsteps, looped for both kids.
- `flamingos.mp3`: flock calls.
- `pad.mp3`: music that plays once when the flock is complete.
- `fast.mp3`: wind for fast flying, looped.
- `path.mp3`: the sound that answers when you fly along the feather road.
- `ocean.mp3`: the sea, looped with a six-second crossfade.
- `flamingos_sea.mp3`: flamingos by the sea, looped on the beach and blended with the flock calls.
