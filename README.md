# Flamingo Fields

A small browser game. Two kids run through a windy golden field, collect flamingo feathers to fly, and gather a flock of flamingos.

## Play

Open `index.html` through a web server (the sounds will not load from a `file://` address). With GitHub Pages enabled on this repository, the game is served at the repository's Pages address.

To run it locally:

```
python3 -m http.server 8000
```

then open http://localhost:8000.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Run | WASD or arrow keys (click the field first) | Drag |
| Sprint | Hold Shift | Drag far |
| Hop | Space | Tap |
| Fly (10 feathers, or a full flock) | Space twice | Tap twice |
| Rise while flying (higher with a full flock) | W or up arrow | Drag up |
| Descend while flying | S or down arrow | Drag down |
| Fly fast (full flock only) | Hold Shift | Drag far |
| Land (full flock only) | Space | Tap |

## Testing

Add `#test` to the end of the address to show four test buttons: a full flock on and off, one flamingo at a time, a jump to dusk, and a jump to deep night with a full flock and the feather road. Without `#test` they are hidden.

## How it works

- Collect 10 feathers to fly for 10 seconds. A rare great feather fills the counter at once.
- A flock of ten flamingos crosses the sky once a minute. Fly with them for 8 seconds and one joins you; the row of small flamingos at the top fills in as you go.
- With five flamingos your flock is complete: you can fly whenever you like, for as long as you like, much higher than before, and fast.
- The day turns slowly from golden evening to moonlit night and back, on an eight-minute cycle.
- At night, with a full flock, the field's feathers gather into two glowing lines that run to the horizon under the moon. A sound answers when you fly along them. The wild flock heads the same way.

## Files

- `index.html`: the whole game (drawing, movement and sound code) in one file, drawn on a canvas with no libraries.
- `field.mp3`: field ambience, looped.
- `run_big.wav`: footsteps, looped for both kids.
- `flamingos.mp3`: flock calls.
- `pad.mp3`: music that plays once when the flock is complete.
- `fast.mp3`: wind for fast flying, looped.
- `path.mp3`: the sound that answers when you fly along the feather road.
