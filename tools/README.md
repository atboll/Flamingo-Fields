# Tools

Pages and scripts used to make things for the game. None of them is loaded by the game itself.

| File | What it is | What it produces |
|---|---|---|
| `kids-editor.html` | The two kids with sliders for colours and look. | A settings block to copy and paste back; the chosen look goes into `game3d/kids.js` ("Look 1"). |
| `flamingo-editor.html` | The 2D game's flamingo in every pose, beside a reference picture. | The flamingo drawing used by the 2D game (`drawBird` in the root `index.html`). |
| `whale-3d.html` | One 3D whale with sliders for pattern, size, dots, sounds and tail beat, and ten save slots. | The ten whale settings in `whales.txt`, which `game3d/whales.js` uses. Its sounds load from `game3d/assets/`. |
| `whales.txt` | The ten saved whales as text. | Read when building `game3d/whales.js`. |
| `flamingo-convert.py` | Turns the original flamingo FBX model into `game3d/assets/flamingo.glb` (fewer points, only the clips the game uses). Needs the FBX and a local server; see the top of the script. | `game3d/assets/flamingo.glb` |
| `refs/` | Reference pictures of flamingos and wings used while drawing them. | — |

Test modes of the game itself are not here: open `game3d/index.html` with `#dev`, `#dev-level2`, `#dev-dunes` or `#dev-flamingo` (see `game3d/README.md`).
