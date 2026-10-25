# MOSS Layout Prompt for ComfyUI

English | [简体中文](README_ZH.md)

A canvas editor for MOSS-Image's JSON Layout prompt. Draw one box per element,
edit one row per box, and the node emits the compiled prompt together with the
canvas size the workflow should render at.

The plugin ships two nodes: **MOSS Layout Prompt**, the stable editor, and
**MOSS Layout Prompt (Advance)** — **experimental** — which adds an external
draft input on top of it.

![The MOSS Layout Prompt node: on the left a canvas where each box carries a numbered tab with its caption, and on the right the meta tags, one editable row per box, and a read-only preview of the compiled prompt.](assets/editor.png)

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

## Nodes

Both nodes sit in the `moss-layoutPrompt-LP` category and share the same canvas
editor and outputs.

> **Experimental:** `MOSS Layout Prompt (Advance)` is still being developed. Its
> inputs and behaviour may change between releases, so keep long-lived workflows
> on `MOSS Layout Prompt`. Both nodes always ship together and produce the same
> prompt from the same draft.

### MOSS Layout Prompt (Advance) — experimental

Node id `MOSSImageLayoutPromptAdvance`. The original node plus the external draft
input: `source` takes a draft JSON, a compiled prompt or a legacy scene prompt and
loads it onto the canvas. `source` and the canvas are kept in sync both ways:
editing or pasting into `source` loads it onto the canvas, and every edit on the
canvas writes the current draft back into `source`. The field is framed like an
input, and its `source` tab is a button that opens the complete text in a dialog
(the strip itself only shows two lines).

![The source dialog: the complete source text in a large read-only box with copy and close actions, and a note that source and canvas are synced both ways.](assets/source-dialog.png)

| Input | |
| --- | --- |
| `width`, `height` | Canvas and image size, positive multiples of 16. |
| `source` | **Experimental.** External draft text. Paste a draft JSON here — wrapped in unrelated prose, or already compiled as `abs_centralized`/`yxyx` — and it is loaded onto the canvas; the canvas mirrors its edits back into this field as the current draft. Without the editor it is compiled directly, but only when the canvas has no boxes. |
| `layout` | Draft JSON. Hidden by the editor; hand-edit it when the canvas UI is unavailable. |

### MOSS Layout Prompt — stable

Node id `MOSSImageLayoutPrompt`. The original node, kept so saved workflows keep
loading. Same canvas editor, outputs and `width`, `height` and `layout` inputs —
it only lacks `source`. Its `layout` also accepts a legacy MOSS-Image scene prompt
(`scene_type` / `gen_brief` / `elements`), which is converted with the node's
canvas size.

| Output (both nodes) | |
| --- | --- |
| `prompt` | The compiled prompt for `CLIPTextEncode`. |
| `width`, `height` | The canvas size for the latent node. |

## Editor

- Drag on empty canvas to create a box, drag inside a box to move it, and drag
  the dot at its bottom-right corner to resize it — the dot shows on hover or on
  the selected box. A box can also be typed as `x1, y1, x2, y2`.
- When boxes overlap, the numbered tab at every box's top-left corner is the
  reliable handle: the number, then as much of the box's caption (or its exact
  text, for text boxes) as its width allows, then a four-way move glyph. The tab
  is drawn above every box and the whole tab is clickable, so click it to select
  that box and drag from it to move that box. Clicking the same spot
  inside the overlap again cycles through the boxes stacked there; if one of them
  is already selected it stays selected on the first click, so dragging never
  switches the target by accident.
- Each box row carries its geometry twice: the pixel values `x1, y1, x2, y2` and,
  right below them, the same four edges as a percentage of the canvas. Both rows
  are editable — the canvas follows as you type, and every value is clamped to
  the canvas with the opposite edge at least 8px away.
- `对齐到 8` rounds all four edges of every box up to a multiple of 8, so widths
  and heights land on the same grid — handy when the layout has to line up with a
  latent grid. Boxes stay inside the canvas and never collapse to zero size.
- The right panel edits the summary prompt and one row per box: `label`
  (`object`, `character`, `text`), `caption` describing how the element looks,
  and for text items the exact `text` to render. `caption`, `text` and the
  summary prompt are multiline boxes that grow with their content.
- `meta` tags are chips: type and press Enter or comma to add one, click a chip
  to edit it in place, and click anywhere outside the chip (or press Enter) to
  finish. `Esc` cancels the edit; `×` removes the tag.
- `添加框` adds a box, `✕` deletes one, `清空` clears the canvas. With a box
  selected, `Delete` and `Backspace` delete that box too — text fields keep their
  normal editing keys, and the node itself is never removed by these keys while
  the editor has focus.
- `全部清空` (red, Advance node only) clears **everything**: every box, the summary
  prompt, the `meta` tags and the `source` input. The canvas size is kept.
- `从文件导入` loads a draft JSON file and puts it on the canvas. The file may
  wrap the JSON in unrelated prose or a code fence; the object is extracted, and
  a compiled `abs_centralized`/`yxyx` prompt or a legacy `scene_type`/`elements`
  scene prompt is converted with the node's `width`/`height`. If the converted
  boxes overflow the canvas they are scaled uniformly around its centre to fit.
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

A draft can also arrive through the `source` input. Pasting or importing there
loads it onto the canvas, which stays the source of truth for editing; a
compiled `abs_centralized`/`yxyx` prompt is decoded back with the node's
`width`/`height` first. Without the canvas editor, `source` is compiled
directly, but only when the canvas holds no boxes.

Editing or pasting into `source` always re-applies it — even when the text ends
up unchanged — so it can replace the canvas at any time. In the other direction,
the editor mirrors every canvas change back into `source` as the current draft;
while you are typing in the field it is left untouched, and it is normalized into a
draft as soon as you leave it. The stored text is therefore always a valid draft:
an older paste, a compiled prompt or a legacy scene prompt is converted before it
is written back, so running the node can never prefer stale source text over the
boxes on screen. Reloading the page or running the workflow never re-applies it:
once the canvas holds boxes, its draft wins.

The vocabulary, coordinate system and composition rules are documented in the
MOSS-Image repository:
[references/layout.md](https://github.com/OpenMOSS/MOSS-Image/blob/main/skills/moss-image-prompt-enhancer/references/layout.md)
and the [user guide](https://github.com/OpenMOSS/MOSS-Image/blob/main/USERGUIDE.md).

The editor needs a ComfyUI frontend with DOM widget support. Without it the node
still runs; edit the `layout` text field by hand.

## License

Apache-2.0 — see [LICENSE](LICENSE).
