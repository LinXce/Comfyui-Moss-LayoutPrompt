"""MOSS-Image pixel Layout drafts and the prompt they compile into."""

import json
import math
import re

DEFAULT_SIZE = 1024
SIZE_MULTIPLE = 16
LABELS = ("object", "character", "text")
CANVASES = ("single", "multi_panel", "collage")
COORD_SPACE = "abs"
BBOX_FORMAT = "xyxy"
COMPILED_COORD_SPACE = "abs_centralized"
COMPILED_BBOX_FORMAT = "yxyx"

HEX_COLOR = re.compile(r"#[0-9a-fA-F]{6}")
SUMMARY_FIELDS = {"caption", "meta", "canvas", "palette"}
ITEM_FIELDS = {"label", "caption", "bbox", "text", "tags", "palette", "color"}
EDITOR_ONLY_FIELDS = {"color"}
DRAFT_FIELDS = {"width", "height", "bbox_coord_space", "bbox_format", "summary", "items"}


class LayoutError(ValueError):
    """Raised when a Layout draft cannot be compiled."""


def _require(condition, message):
    if not condition:
        raise LayoutError(message)


def default_draft(width=DEFAULT_SIZE, height=DEFAULT_SIZE):
    return {
        "width": width,
        "height": height,
        "bbox_coord_space": COORD_SPACE,
        "bbox_format": BBOX_FORMAT,
        "summary": {"caption": "", "canvas": "single"},
        "items": [],
    }


def _fields(value, allowed, required, location):
    _require(isinstance(value, dict), f"{location} must be an object")
    unknown = sorted(set(value) - allowed)
    missing = sorted(required - set(value))
    _require(not unknown, f"{location}: unknown fields {unknown}")
    _require(not missing, f"{location}: missing fields {missing}")


def _text(value, location):
    _require(isinstance(value, str) and bool(value.strip()), f"{location} must be nonempty text")
    return value


def _caption(value, location):
    """Captions are content: empty is allowed, only the type is enforced."""
    _require(isinstance(value, str), f"{location} must be text")
    return value


def _strings(value, location):
    _require(isinstance(value, list), f"{location} must be an array")
    for index, item in enumerate(value):
        _text(item, f"{location}[{index}]")
    return list(value)


def _size(value, name):
    _require(type(value) is int and value > 0 and value % SIZE_MULTIPLE == 0,
             f"{name} must be a positive integer multiple of {SIZE_MULTIPLE}, got {value!r}")
    return value


def _centered(box, width, height, location):
    _require(isinstance(box, list) and len(box) == 4, f"{location} must be [x1,y1,x2,y2]")
    _require(all(type(v) in (int, float) and math.isfinite(v) for v in box),
             f"{location} must contain four finite numbers")
    x1, y1, x2, y2 = box
    _require(0 <= x1 < x2 <= width and 0 <= y1 < y2 <= height,
             f"{location} must lie inside the {width}x{height} canvas")
    result = [math.floor(y1) - height // 2, math.floor(x1) - width // 2,
              math.ceil(y2) - height // 2, math.ceil(x2) - width // 2]
    _require(result[0] < result[2] and result[1] < result[3], f"{location} is too small")
    return result


def load_draft(raw, width=DEFAULT_SIZE, height=DEFAULT_SIZE):
    """Normalize a draft from JSON text (or a mapping) without compiling it."""
    if isinstance(raw, dict):
        draft = dict(raw)
    else:
        source = raw.strip() if isinstance(raw, str) else ""
        if not source:
            return default_draft(width, height)
        try:
            draft = json.loads(source)
        except ValueError as error:
            raise LayoutError(f"layout is not valid JSON: {error}") from error
    _require(isinstance(draft, dict), "layout must be a JSON object")

    unknown = sorted(set(draft) - DRAFT_FIELDS)
    _require(not unknown, f"layout: unknown fields {unknown}")
    draft["width"] = draft.get("width", width)
    draft["height"] = draft.get("height", height)
    draft["bbox_coord_space"] = draft.get("bbox_coord_space", COORD_SPACE)
    draft["bbox_format"] = draft.get("bbox_format", BBOX_FORMAT)
    if "summary" not in draft:
        draft["summary"] = {"caption": ""}
    draft["items"] = draft.get("items", [])
    return draft


def compile_layout(raw, width=DEFAULT_SIZE, height=DEFAULT_SIZE):
    """Compile a draft into (prompt, width, height).

    A draft without items falls back to its summary caption, so an untouched
    node behaves like a plain text prompt.
    """
    draft = load_draft(raw, width, height)
    canvas_width = _size(draft["width"], "width")
    canvas_height = _size(draft["height"], "height")
    if draft["bbox_coord_space"] != COORD_SPACE or draft["bbox_format"] != BBOX_FORMAT:
        raise LayoutError(
            'layout drafts use bbox_coord_space="abs" and bbox_format="xyxy"; '
            "this looks like an already compiled prompt"
        )

    summary = draft["summary"]
    _require(isinstance(summary, dict), "summary must be an object")
    items = draft["items"]
    _require(isinstance(items, list), "items must be an array")
    if not items:
        caption = _caption(summary.get("caption", ""), "summary.caption")
        return caption.strip(), canvas_width, canvas_height

    _fields(summary, SUMMARY_FIELDS, {"caption"}, "summary")
    _caption(summary["caption"], "summary.caption")
    if "canvas" in summary:
        _require(summary["canvas"] in CANVASES, f"summary.canvas must be one of {list(CANVASES)}")
    for key in ("meta", "palette"):
        if key in summary:
            _strings(summary[key], f"summary.{key}")

    compiled = []
    for index, item in enumerate(items):
        location = f"items[{index}]"
        _fields(item, ITEM_FIELDS, {"label", "caption", "bbox"}, location)
        _require(item["label"] in LABELS, f"{location}.label must be one of {list(LABELS)}")
        _caption(item["caption"], f"{location}.caption")
        if item["label"] == "text":
            _require("text" in item, f"{location}: text items require a text value")
        if "text" in item:
            _text(item["text"], f"{location}.text")
        for key in ("tags", "palette"):
            if key in item:
                _strings(item[key], f"{location}.{key}")
        if "color" in item:
            _require(isinstance(item["color"], str) and HEX_COLOR.fullmatch(item["color"]),
                     f"{location}.color must be a #rrggbb hex color")
        compiled.append({
            key: _centered(value, canvas_width, canvas_height, f"{location}.bbox")
            if key == "bbox" else value
            for key, value in item.items()
            if key not in EDITOR_ONLY_FIELDS
        })

    prompt = {
        "summary": summary,
        "items": compiled,
        "bbox_coord_space": COMPILED_COORD_SPACE,
        "bbox_format": COMPILED_BBOX_FORMAT,
    }
    return json.dumps(prompt, ensure_ascii=False, separators=(",", ":"), allow_nan=False), \
        canvas_width, canvas_height
