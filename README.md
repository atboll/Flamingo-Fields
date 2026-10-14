# Flamingo Fields

A 3D browser game. Two kids run through a windy golden field, gather feathers to fly, and gather a flock of flamingos. A feather road under the moon leads to a desert and a silver box; its door opens onto level 2, a sea of pink cloud with ten whales.

## Play

Serve the repository and open `game3d/index.html` (sounds and models don't load from a `file://` address):

```
python3 -m http.server 8000
```

then open http://localhost:8000/game3d/. Opening http://localhost:8000/ goes there too.

Arrow keys or WASD to run, Space to hop, Space again in the air to fly; on a phone, drag to run and tap to hop.

## Folders

- `game3d/`: the game. Its README lists the files, the dev modes (`#dev`, `#dev-level2`, `#dev-dunes`, `#dev-flamingo`) and how to build the page to publish.
- `tools/`: the editors and the whale page that made the game's looks (see its README).
- `old-2d/`: the original 2D game, retired and kept as a backup. It still plays on its own.
