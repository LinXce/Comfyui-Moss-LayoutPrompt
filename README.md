# MOSS Layout Prompt for ComfyUI

English | [简体中文](README_ZH.md)

A canvas editor for MOSS-Image's JSON Layout prompt. Draw one box per element,
edit one row per box, and the node emits the compiled prompt together with the
canvas size the workflow should render at.

![The MOSS Layout Prompt node: a canvas with two boxes on the left, and on the right the meta tags, one editable row per box, and a read-only preview of the compiled prompt.](assets/editor.png)

## Installation

This plugin is standalone. Put this folder under `ComfyUI/custom_nodes/` so it
ends up at `ComfyUI/custom_nodes/moss-layoutPrompt-LP/`, then restart ComfyUI. It
uses only ComfyUI's own dependencies, ships its own nodes and web extension, and
shares no code with any other plugin.

The bundled example workflow loads the model through the MOSS-Image nodes, so
that workflow additionally needs the
[MOSS-Image](https://github.com/OpenMOSS/MOSS-Image) node pack.

## Workflow

1. Download [moss-layout-prompt.json](example_workflows/moss-layout-prompt.json) and drag it into ComfyUI.
2. Set the local model directory in **MOSS-Image HF Loader**.
3. Draw the layout, then click **Run**.

The workflow wires `prompt` into `CLIPTextEncode` and `width`/`height` into
`EmptyFlux2LatentImage`, so the layout canvas and the generated image always
agree.

## Node

**MOSS Layout Prompt** — node id `MOSSImageLayoutPrompt`, category `moss-layoutPrompt-LP`.
The id is kept from earlier versions so saved workflows still load.

| Input | |
| --- | --- |
| `width`, `height` | Canvas and image size, positive multiples of 16. |
| `layout` | Draft JSON. Hidden by the editor; hand-edit it when the canvas UI is unavailable. |

| Output | |
| --- | --- |
| `prompt` | The compiled prompt for `CLIPTextEncode`. |
| `width`, `height` | The canvas size for the latent node. |

## Editor

- Drag on empty canvas to create a box, drag inside a box to move it, and drag
  the dot at its bottom-right corner to resize it — the dot shows on hover or on
  the selected box. A box can also be typed as `x1, y1, x2, y2`.
- The right panel edits the summary prompt and one row per box: `label`
  (`object`, `character`, `text`), `caption` describing how the element looks,
  and for text items the exact `text` to render. `caption`, `text` and the
  summary prompt are multiline boxes that grow with their content.
- `meta` tags are chips: type and press Enter or comma to add one, click a chip
  to edit it in place, and click anywhere outside the chip (or press Enter) to
  finish. `Esc` cancels the edit; `×` removes the tag.
- `添加框` adds a box, `✕` deletes one, `清空` clears the canvas.
- The bottom of the panel pins a read-only preview of the prompt the node will
  output, so the compiled result is always visible while you edit.

## Draft and compiled prompts

The editor stores a draft and the node outputs the compiled prompt. Draft boxes
are `[x1, y1, x2, y2]` in pixels from the canvas top-left:

```json
{
  "width": 1024,
  "height": 1024,
  "bbox_coord_space": "abs",
  "bbox_format": "xyxy",
  "summary": {"caption": "A minimalist travel poster..."},
  "items": [{"label": "text", "caption": "A large title.", "text": "EXPLORE", "bbox": [128, 96, 896, 224]}]
}
```

On execute the node subtracts the canvas center from every edge and reorders
each box to `yxyx`, producing the `abs_centralized` prompt MOSS-Image expects.
A draft without items degrades to its summary caption, so an untouched node
behaves like a plain text prompt.

Validation only covers the shape of the draft: canvas size, box geometry,
`label` values and field names. Captions are content, so leaving the summary
prompt or a box caption empty is allowed and the node still runs.

The vocabulary, coordinate system and composition rules are documented in the
MOSS-Image repository:
[references/layout.md](https://github.com/OpenMOSS/MOSS-Image/blob/main/skills/moss-image-prompt-enhancer/references/layout.md)
and the [user guide](https://github.com/OpenMOSS/MOSS-Image/blob/main/USERGUIDE.md).

The editor needs a ComfyUI frontend with DOM widget support. Without it the node
still runs; edit the `layout` text field by hand.

## License

Apache-2.0 — see [LICENSE](LICENSE).
