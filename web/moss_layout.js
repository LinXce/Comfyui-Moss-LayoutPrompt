import { app } from "../../scripts/app.js";

const ADVANCE_CLASS = "MOSSImageLayoutPromptAdvance";
const NODE_CLASSES = ["MOSSImageLayoutPrompt", ADVANCE_CLASS];
const LAYOUT_WIDGET = "layout";
const SOURCE_WIDGET = "source";
const SIZE_WIDGETS = ["width", "height"];
const PASS_THROUGH_FIELDS = ["tags", "palette"];
const LABELS = ["object", "character", "text"];
const CANVASES = ["single", "multi_panel", "collage"];
const LABEL_COLORS = { object: "#4a9eff", character: "#ff9147", text: "#59d97f" };
const FALLBACK_COLOR = "#8a8f98";
const PALETTE = ["#4a9eff", "#ff9147", "#59d97f", "#ff6b8b", "#c084fc", "#facc15", "#22d3ee", "#f5f5f5"];
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const MIN_BOX = 8;
const SNAP_STEP = 8;
// The number + caption tab at every box's top-left. Sizes are CSS pixels, so the
// tab keeps the same readable size at any zoom, while its width follows the box:
// a narrow box simply shows fewer characters.
const HEADER_HEIGHT = 18;
const HEADER_RADIUS = 4;
const HEADER_PAD = 5;
const HEADER_GAP = 4;
const HEADER_INSET = 1;
const HEADER_MAX_WIDTH = 320;
const HEADER_MIN_TEXT = 16;
const HEADER_MIN_WIDTH = 20;
const HEADER_HIT_SLACK = 3;
const HANDLE_SIZE = 18;
const HEADER_FONT = 'bold 11px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const HEADER_TEXT_FONT = '10px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const CYCLE_SLACK = 4;
const MIN_SIZE = 16;
const EDITOR_MIN_HEIGHT = 420;
const MIN_NODE_WIDTH = 980;
const MIN_NODE_HEIGHT = 680;
const SOURCE_WIDGET_HEIGHT = 42;
const SOURCE_TAG_HEIGHT = 20;
const SOURCE_PAD_LEFT = 78;
const SOURCE_PAD_RIGHT = 166;
const SOURCE_PLACEHOLDER = "点击输入，或在此粘贴草稿 JSON / 旧版 scene 提示词（可夹杂无关文字）";
const SOURCE_HINT_TEXT = "点击输入 / 粘贴草稿 JSON";
const SOURCE_TAG_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11V3h-8l3.29 3.29-4.3 4.3 1.41 1.41 4.3-4.3L21 11zM3 13v8h8l-3.29-3.29 4.3-4.3-1.41-1.41-4.3 4.3L3 13z"/></svg>';
const SOURCE_DEBOUNCE = 400;
const SOURCE_POLL = 600;
const SIDE_WIDTH = 360;
const DEFAULT_SIZE = 1024;
const STYLE_ID = "moss-layout-style";
// The backend rejects anything that is not a positive multiple of 16, so every
// canvas size this panel produces is snapped to that grid before it is written.
const SIZE_MULTIPLE = 16;
const MAX_CANVAS = SIZE_MULTIPLE * 1024;
// Two different grids live in this editor and they are easy to mix up:
// canvas width/height must be multiples of 16 (the node input uses step=16 and
// layout.py raises LayoutError otherwise), while box edges only need multiples
// of 8 ("对齐到 8"). Spell it out in the tooltips.
const CANVAS_STEP_HINT = "画布宽高必须是 16 的倍数（后端校验要求），输入会自动吸附；框坐标的「对齐到 8」是另一回事";
const AREA_UNIT = 1e6;
const AREA_DIGITS = 2;

// Aspect ratios, largest-edge-first so a label always reads "longer:shorter".
const RATIOS = [
  { label: "1:1", w: 1, h: 1 },
  { label: "5:4", w: 5, h: 4 },
  { label: "4:3", w: 4, h: 3 },
  { label: "19:13", w: 19, h: 13 },
  { label: "3:2", w: 3, h: 2 },
  { label: "16:10", w: 16, h: 10 },
  { label: "7:4", w: 7, h: 4 },
  { label: "16:9", w: 16, h: 9 },
  { label: "2:1", w: 2, h: 1 },
  { label: "21:9", w: 21, h: 9 },
];

// Common long edges. Offered as input suggestions rather than a closed list, so
// an unusual target can still be typed in.
const LONG_EDGES = [480, 512, 640, 720, 768, 832, 896, 960, 1024, 1080, 1088, 1152,
  1216, 1280, 1344, 1440, 1536, 1600, 1680, 1920, 2048, 2344, 2440, 2560, 3072, 3840];
// Allowed slack when matching the live canvas back onto a ratio preset. Snapping
// the short edge to 16 costs at most 8px, so 12 is tight enough to keep 3:2 and
// 19:13 apart at any usable long edge.
const RATIO_SLACK = 12;

const MODE_OPTIONS = [
  { value: "custom", label: "自定义", title: "直接输入宽高" },
  { value: "preset", label: "预设", title: "按比例和长边自动算宽高" },
];
const ORIENT_OPTIONS = [
  { value: "landscape", label: "横屏", title: "长边作为宽" },
  { value: "portrait", label: "竖屏", title: "长边作为高" },
];

const CSS = `
.mlp-root{display:flex;gap:10px;width:100%;height:100%;box-sizing:border-box;padding:2px;
  font:12px/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#d7dae0}
.mlp-stage{position:relative;flex:1 1 0;min-width:200px;height:100%;border-radius:8px;
  border:1px solid #2c313a;background:#14171d;overflow:hidden}
.mlp-canvas{display:block;width:100%;height:100%;touch-action:none}
.mlp-canvas:focus{outline:none}
/* The Advance node's external draft field: a framed input with a "source" tab and
   a persistent click/paste hint, so it reads as an input instead of plain text. */
.mlp-source-wrap textarea.comfy-multiline-input{box-sizing:border-box!important;width:100%!important;
  height:${SOURCE_WIDGET_HEIGHT}px!important;min-height:${SOURCE_WIDGET_HEIGHT}px!important;
  max-height:${SOURCE_WIDGET_HEIGHT}px!important;resize:none!important;outline:none!important;
  padding:4px ${SOURCE_PAD_RIGHT}px 4px ${SOURCE_PAD_LEFT}px!important;
  border:1px solid #343b47!important;border-radius:6px!important;background:#121519!important;
  color:#dbe4ef!important;font:11px/16px ui-monospace,SFMono-Regular,Menlo,monospace!important;
  white-space:pre-wrap!important;overflow-x:hidden!important;overflow-y:auto!important;
  scrollbar-width:none!important}
.mlp-source-wrap textarea.comfy-multiline-input::-webkit-scrollbar{width:0;height:0}
.mlp-source-wrap textarea.comfy-multiline-input::placeholder{color:#68707d!important;opacity:1}
.mlp-source-wrap textarea.comfy-multiline-input:focus{border-color:#4a9eff!important;
  box-shadow:0 0 0 2px rgba(74,158,255,.18)!important}
.mlp-source-tag{position:absolute;left:3px;top:${(SOURCE_WIDGET_HEIGHT - SOURCE_TAG_HEIGHT) / 2}px;
  height:${SOURCE_TAG_HEIGHT}px;display:inline-flex;align-items:center;gap:4px;padding:0 8px;
  border:0;border-radius:4px;background:#4a9eff;color:#f4f7fb;white-space:nowrap;cursor:pointer;z-index:2;
  font:600 10px/1 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.02em;
  transition:background .12s,box-shadow .12s}
.mlp-source-tag:hover{background:#5da9ff}
.mlp-source-tag:active{background:#3b8de8}
.mlp-source-tag:focus-visible{outline:2px solid rgba(255,255,255,.85);outline-offset:1px}
.mlp-source-tag svg{display:block;width:10px;height:10px;fill:currentColor}
.mlp-source-hint{position:absolute;right:8px;top:${(SOURCE_WIDGET_HEIGHT - SOURCE_TAG_HEIGHT) / 2}px;
  height:${SOURCE_TAG_HEIGHT}px;display:inline-flex;align-items:center;padding:0 7px;border-radius:4px;
  background:#121519;color:#7d8694;white-space:nowrap;pointer-events:none;z-index:2;
  font:10px/1 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
/* Full-content dialog opened from the source tab. */
.mlp-modal-backdrop{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;
  justify-content:center;padding:24px;background:rgba(6,8,11,.64);backdrop-filter:blur(2px)}
.mlp-modal{display:flex;flex-direction:column;gap:10px;width:min(780px,92vw);height:min(72vh,660px);
  box-sizing:border-box;padding:16px 18px;border-radius:12px;border:1px solid #39414d;background:#1b1f26;
  box-shadow:0 26px 70px rgba(0,0,0,.6);color:#d7dae0;
  font:12px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.mlp-modal-head{display:flex;align-items:baseline;gap:10px;flex:0 0 auto}
.mlp-modal-title{font-size:13px;font-weight:600;color:#e8ebef}
.mlp-modal-sub{font-size:11px;color:#7d8694}
.mlp-modal-note{flex:1 1 auto;min-width:0;font-size:11px;color:#7fbf8f;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis}
.mlp-modal-note.is-error{color:#ff8a8a}
.mlp-modal-body{flex:1 1 0;min-height:0;box-sizing:border-box;width:100%;resize:none;overflow:auto;
  border:1px solid #343b47;border-radius:8px;background:#121519;color:#c6d4e4;padding:10px 12px;
  font:11px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-break:break-word;
  outline:none;caret-color:#4a9eff}
.mlp-modal-body:focus{border-color:#4a9eff;box-shadow:0 0 0 2px rgba(74,158,255,.18)}
.mlp-modal-body::-webkit-scrollbar{width:8px;height:8px}
.mlp-modal-body::-webkit-scrollbar-thumb{background:#343b47;border-radius:4px}
.mlp-modal-foot{display:flex;align-items:center;gap:8px;flex:0 0 auto}
.mlp-side{flex:0 0 ${SIDE_WIDTH}px;display:flex;flex-direction:column;gap:6px;height:100%;
  min-height:0;box-sizing:border-box}
.mlp-list{position:relative;flex:3 1 0;min-height:0;display:flex;flex-direction:column;gap:6px;
  overflow-y:auto;overflow-x:hidden;padding-right:4px}
.mlp-list::-webkit-scrollbar{width:6px}
.mlp-list::-webkit-scrollbar-thumb{background:#343b47;border-radius:3px}
.mlp-preview{flex:1 1 0;min-height:140px;display:flex;flex-direction:column;gap:4px;padding:8px 10px;
  border-radius:8px;border:1px solid #2e343e;background:#1b1f26}
.mlp-preview-head{display:flex;align-items:center;gap:6px}
.mlp-preview-body{box-sizing:border-box;width:100%;flex:1 1 0;min-height:0;resize:none;overflow:auto;
  border:1px solid #343b47;background:#121519;color:#9fb4cc;border-radius:6px;padding:6px 8px;
  font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;outline:none;white-space:pre-wrap;
  word-break:break-word}
.mlp-preview-body::-webkit-scrollbar{width:6px}
.mlp-preview-body::-webkit-scrollbar-thumb{background:#343b47;border-radius:3px}
.mlp-card{display:flex;flex-direction:column;gap:6px;padding:8px 10px;border-radius:8px;
  border:1px solid #2e343e;background:#1b1f26;transition:border-color .12s,background .12s}
.mlp-card.is-active{border-color:#4a9eff;background:#1f2834}
.mlp-card.is-warn{border-color:#8a5a1e}
.mlp-card.is-warn.is-active{border-color:#d08a25}
.mlp-head{display:flex;align-items:center;gap:6px}
.mlp-badge{display:inline-flex;align-items:center;gap:6px;font-weight:600;color:#c4cad4}
.mlp-dot{width:8px;height:8px;border-radius:50%}
.mlp-spacer{flex:1}
.mlp-title{font-weight:600;font-size:12px;color:#e2e5ea}
.mlp-label{display:block;margin:0 0 4px;font-size:11px;letter-spacing:.02em;color:#8b93a1}
.mlp-input,.mlp-textarea,.mlp-select{box-sizing:border-box;width:100%;border:1px solid #343b47;
  background:#121519;color:#e2e5ea;border-radius:6px;padding:6px 8px;font:inherit;outline:none;
  transition:border-color .12s,box-shadow .12s}
.mlp-input:focus,.mlp-textarea:focus,.mlp-select:focus,.mlp-chips:focus-within{
  border-color:#4a9eff;box-shadow:0 0 0 2px rgba(74,158,255,.18)}
.mlp-textarea{resize:vertical;overflow:hidden;line-height:1.55}
.mlp-select{width:auto;min-width:110px;padding:4px 8px;cursor:pointer}
.mlp-bbox{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;align-items:start}
.mlp-num{width:100%;box-sizing:border-box;border:1px solid #343b47;background:#121519;color:#e2e5ea;
  border-radius:6px;padding:5px 6px;font:12px ui-monospace,SFMono-Regular,Menlo,monospace;
  text-align:center;outline:none;transition:border-color .12s,box-shadow .12s;
  -moz-appearance:textfield;appearance:textfield}
.mlp-num::-webkit-outer-spin-button,.mlp-num::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.mlp-num:focus{border-color:#4a9eff;box-shadow:0 0 0 2px rgba(74,158,255,.18)}
.mlp-num-cell{display:block;min-width:0}
.mlp-num-cell small{display:block;margin-bottom:2px;text-align:center;font-size:10px;color:#6b7380}
.mlp-num-wrap{position:relative;display:block;min-width:0;margin-top:3px}
.mlp-num-pct{padding:4px 13px 4px 4px;font-size:11px;color:#9fb4cc}
.mlp-num-pct:focus{color:#e2e5ea}
.mlp-unit{position:absolute;right:5px;top:50%;transform:translateY(-50%);font-size:10px;
  color:#6b7380;pointer-events:none}
.mlp-status{margin-left:6px;font-size:11px;color:#7fbf8f;white-space:nowrap}
.mlp-status:empty{display:none}
.mlp-chips{display:flex;flex-wrap:wrap;align-items:center;gap:4px;min-height:34px;box-sizing:border-box;
  padding:4px 6px;border:1px solid #343b47;border-radius:6px;background:#121519;cursor:text}
.mlp-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 4px 2px 9px;border-radius:999px;
  background:#263246;color:#c9d8ef;font-size:11px;max-width:100%}
.mlp-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:text}
.mlp-chip span:hover{color:#fff}
.mlp-chip button{border:0;background:none;color:#8b93a1;cursor:pointer;padding:0 4px;font-size:13px;line-height:1}
.mlp-chip button:hover{color:#ff8a8a}
.mlp-chip-edit{box-sizing:border-box;width:auto;min-width:90px;max-width:100%;border:1px solid #4a9eff;
  background:#121519;color:#e2e5ea;border-radius:999px;padding:2px 9px;font:inherit;font-size:11px;
  outline:none;box-shadow:0 0 0 2px rgba(74,158,255,.18)}
.mlp-chip-input{flex:1 1 90px;min-width:90px;border:0;outline:none;background:transparent;color:#e2e5ea;
  font:inherit;padding:3px 2px}
.mlp-btn{border:1px solid #3a414c;background:#262c36;color:#d7dae0;border-radius:6px;padding:5px 10px;
  font:inherit;cursor:pointer;transition:background .12s,border-color .12s}
.mlp-btn:hover{background:#2f3642;border-color:#4a5361}
.mlp-btn-primary{background:#1f5fae;border-color:#2a72cc;color:#fff}
.mlp-btn-primary:hover{background:#2770c6;border-color:#3a84dd}
.mlp-btn-danger{background:#7a2626;border-color:#94302f;color:#ffdede}
.mlp-btn-danger:hover{background:#8f2c2c;border-color:#b23a38;color:#fff}
.mlp-btn-icon{border:0;background:transparent;color:#8b93a1;padding:2px 6px;font-size:14px}
.mlp-btn-icon:hover{color:#ff8a8a;background:transparent;border:0}
.mlp-color{display:inline-flex;align-items:center;gap:2px}
.mlp-swatch{-webkit-appearance:none;appearance:none;width:22px;height:18px;padding:0;border:1px solid #3a414c;
  border-radius:4px;background:none;cursor:pointer}
.mlp-swatch::-webkit-color-swatch-wrapper{padding:0}
.mlp-swatch::-webkit-color-swatch{border:0;border-radius:3px}
.mlp-swatch::-moz-color-swatch{border:0;border-radius:3px}
.mlp-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:2px 0}
.mlp-count{margin-left:auto;color:#6b7380;font-size:11px}
.mlp-hint{color:#6b7380;font-size:11px;padding:0 2px 4px;margin-top:-2px}
.mlp-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.mlp-row+.mlp-row{margin-top:6px}
.mlp-label-inline{font-size:11px;color:#8b93a1;min-width:22px}
.mlp-unit-text{font-size:11px;color:#6b7380}
.mlp-note-text{font-size:11px;color:#6b7380}
.mlp-warn{display:flex;gap:6px;padding:6px 8px;border:1px solid #8a5a1e;border-radius:6px;
  background:#2a1f11;color:#f0b46a;font-size:11px;line-height:1.55}
.mlp-warn.is-hidden{display:none}
.mlp-area{font:11px ui-monospace,SFMono-Regular,Menlo,monospace;color:#8fd18f;white-space:nowrap}
.mlp-fold{border:none;background:transparent;color:#7d8592;cursor:pointer;font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;padding:2px 4px;border-radius:4px;line-height:1}
.mlp-fold:hover{background:#2a323d;color:#e2e5ea}
.mlp-area.is-warn{color:#f0b46a}
.mlp-seg{display:inline-flex;border:1px solid #343b47;border-radius:6px;overflow:hidden;flex:0 0 auto}
.mlp-seg button{border:0;border-radius:0;background:#1b1f26;color:#9aa3b0;padding:4px 10px;
  font:11px/1.5 ui-sans-serif,system-ui,sans-serif;cursor:pointer;transition:background .12s,color .12s}
.mlp-seg button+button{border-left:1px solid #343b47}
.mlp-seg button:hover{background:#242a33;color:#cfd4db}
.mlp-seg button.is-on{background:#1f5fae;color:#fff}
.mlp-seg button.is-on:hover{background:#2770c6}
.mlp-seg-mini button{padding:2px 7px}
.mlp-num-fixed{width:86px;flex:0 0 auto}
.mlp-num-long{width:90px}
.mlp-select-long{min-width:104px;flex:0 0 auto}
.mlp-btn-mini{padding:1px 8px;font-size:11px;line-height:1.6;border-radius:5px;flex:0 0 auto}
.mlp-btn-mini.is-ok{background:#1f5fae;border-color:#2a72cc;color:#fff}
.mlp-canvas-row select.mlp-select{flex:0 0 auto}
.mlp-chip-hint{position:absolute;z-index:2;pointer-events:none;display:none;padding:2px 7px;border-radius:5px;
  background:rgba(18,21,25,.92);border:1px solid rgba(255,255,255,.16);color:#c4cad4;
  font:11px/1.6 ui-sans-serif,system-ui,sans-serif;white-space:nowrap}
.mlp-empty{color:#6b7380;text-align:center;padding:14px 8px;border:1px dashed #343b47;border-radius:8px}
`;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.append(style);
}

function h(tag, attrs, children) {
  const element = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined) continue;
      if (key === "text") element.textContent = value;
      else if (key === "class") element.className = value;
      else if (key === "style") Object.assign(element.style, value);
      else if (key.startsWith("on")) element.addEventListener(key.slice(2), value);
      else element.setAttribute(key, value);
    }
  }
  if (children) for (const child of children) if (child) element.append(child);
  return element;
}

function field(label, control) {
  return h("div", null, [h("span", { class: "mlp-label", text: label }), control]);
}

// Keys typed into one of these elements belong to that field, not to the canvas
// shortcuts (typing, deleting characters, chip editing, colour pickers).
function isEditableElement(element) {
  if (!(element instanceof Element)) return false;
  const tag = element.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || element.isContentEditable;
}

function textarea(value, placeholder, onInput) {
  const element = h("textarea", {
    class: "mlp-textarea",
    rows: "3",
    placeholder,
    spellcheck: "false",
    onkeydown: (event) => event.stopPropagation(),
    onkeyup: (event) => event.stopPropagation(),
    oninput: (event) => {
      autosize(event.target);
      onInput(event.target.value);
    },
  });
  element.value = value;
  requestAnimationFrame(() => autosize(element));
  return element;
}

function autosize(element) {
  if (!element.isConnected) return;
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight + 2}px`;
}

function select(options, value, onChange) {
  const element = h("select", {
    class: "mlp-select",
    onchange: (event) => onChange(event.target.value),
  }, options.map((option) => h("option", { value: option, text: option })));
  element.value = value;
  return element;
}

// navigator.clipboard only exists in a secure context. ComfyUI on localhost
// qualifies, but a workflow served from a LAN address over plain http does not,
// so keep the legacy selection trick as a fallback.
async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    // Permission denied or insecure context — try the textarea route below.
  }
  const active = document.activeElement;
  try {
    const buffer = document.createElement("textarea");
    buffer.value = text;
    buffer.setAttribute("readonly", "");
    buffer.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0;pointer-events:none";
    document.body.append(buffer);
    buffer.select();
    const copied = document.execCommand("copy");
    buffer.remove();
    if (active instanceof HTMLElement) active.focus();
    return copied;
  } catch (error) {
    console.warn("[moss-layoutPrompt] copy failed", error);
    return false;
  }
}

// Two-state pill group, used for the size mode and the orientation.
function segment(options, value, onChange) {
  return h("div", { class: "mlp-seg" }, options.map((option) => h("button", {
    type: "button",
    class: option.value === value ? "is-on" : null,
    title: option.title ?? null,
    text: option.label,
    onclick: () => onChange(option.value),
  })));
}

function chipField(values, placeholder, onChange) {
  let items = values.slice();
  let editing = null;
  const input = h("input", { class: "mlp-chip-input", placeholder, type: "text" });
  const box = h("div", { class: "mlp-chips", onclick: () => focusNew() });

  function unlisten() {
    document.removeEventListener("pointerdown", onOutsidePointer, true);
  }

  function onOutsidePointer(event) {
    if (!editing) return;
    if (editing.editor.contains(event.target)) return;
    if (!box.isConnected) {
      unlisten();
      return;
    }
    closeEdit(true);
  }

  function focusNew() {
    if (editing) return;
    input.focus();
  }

  function setItems(next) {
    items = next;
    onChange(items.slice());
  }

  function commitTag(raw, index) {
    const value = raw.trim();
    if (index === null) {
      if (!value) return;
      if (!items.includes(value)) setItems([...items, value]);
      return;
    }
    if (!value) {
      setItems(items.filter((_, position) => position !== index));
      return;
    }
    const next = items.filter((entry, position) => position === index || entry !== value);
    const at = next.indexOf(items[index]);
    if (at >= 0) next[at] = value;
    setItems(next);
  }

  function closeEdit(save) {
    if (!editing) return;
    const { index, editor } = editing;
    editing = null;
    unlisten();
    if (save) commitTag(editor.value, index);
    paint();
  }

  function startEdit(index) {
    closeEdit(true);
    const editor = h("input", { class: "mlp-chip-edit", type: "text" });
    editor.value = items[index];
    editing = { index, editor };
    editor.addEventListener("keydown", (event) => {
      event.stopPropagation();
      if (event.key === "Enter") {
        event.preventDefault();
        closeEdit(true);
        input.focus();
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeEdit(false);
      }
    });
    document.addEventListener("pointerdown", onOutsidePointer, true);
    paint();
    editor.focus();
    editor.select();
  }

  function paint() {
    const chips = items.map((value, index) => {
      if (editing && editing.index === index) return editing.editor;
      return h("span", { class: "mlp-chip", title: "点击编辑" }, [
        h("span", {
          text: value,
          onclick: (event) => {
            event.stopPropagation();
            startEdit(index);
          },
        }),
        h("button", {
          type: "button",
          title: "移除",
          text: "×",
          onclick: (event) => {
            event.stopPropagation();
            setItems(items.filter((_, position) => position !== index));
            paint();
          },
        }),
      ]);
    });
    box.replaceChildren(...chips, input);
  }

  input.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Enter" || event.key === "," || event.key === "，") {
      event.preventDefault();
      const parts = input.value.split(/[,，\n]/);
      input.value = "";
      for (const part of parts) commitTag(part, null);
      paint();
      input.focus();
    } else if (event.key === "Backspace" && !input.value && items.length) {
      setItems(items.slice(0, -1));
      paint();
      input.focus();
    }
  });
  input.addEventListener("blur", () => {
    if (editing || !input.value.trim()) return;
    const parts = input.value.split(/[,，\n]/);
    input.value = "";
    for (const part of parts) commitTag(part, null);
    paint();
  });
  paint();
  return box;
}

function rgba(hex, alpha) {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function truncate(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let shortened = text;
  while (shortened.length > 1 && ctx.measureText(`${shortened}…`).width > maxWidth) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened}…`;
}

function stringArray(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : null;
}

function* jsonObjects(text) {
  for (let start = 0; start < text.length; start += 1) {
    if (text[start] !== "{") continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < text.length; index += 1) {
      const char = text[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') inString = true;
      else if (char === "{") depth += 1;
      else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          yield text.slice(start, index + 1);
          break;
        }
      }
    }
  }
}

function looksLikeDraft(value) {
  return !!value && typeof value === "object" && !Array.isArray(value)
    && ("summary" in value || "items" in value || "elements" in value);
}

const JSON_SIMPLE_ESCAPES = new Set(['"', "\\", "/", "b", "f", "n", "r", "t"]);
const HEX_DIGIT = /^[0-9a-fA-F]$/;

// Stable Diffusion prompts escape parentheses as \( and \) to keep them out of
// emphasis parsing, and that sequence is illegal inside JSON. A caption that
// went through a prompt gets pasted back with the backslashes intact, so escape
// them for the parser; the caption still reads \( afterwards.
function repairJsonEscapes(text) {
  let out = "";
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char !== "\\") {
      out += char;
      continue;
    }
    const next = text[index + 1];
    if (next === undefined) {
      out += "\\\\";
      continue;
    }
    if (JSON_SIMPLE_ESCAPES.has(next)) {
      out += char + next;
      index += 1;
      continue;
    }
    if (next === "u") {
      const hex = text.slice(index + 2, index + 6);
      if (hex.length === 4 && [...hex].every((digit) => HEX_DIGIT.test(digit))) {
        out += char + next;
        index += 1;
        continue;
      }
    }
    out += "\\\\";
  }
  return out;
}

// Returns undefined when the text is not JSON at all.
function parseJsonLoose(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    try {
      return JSON.parse(repairJsonEscapes(text));
    } catch (repaired) {
      return undefined;
    }
  }
}

// One pass: plain JSON first, then scan for an object embedded in prose.
function parseJsonOnce(text) {
  const direct = parseJsonLoose(text);
  if (direct !== undefined) {
    // A double encoded widget value (a workflow stores the string as a string).
    if (typeof direct === "string") return direct;
    if (direct && typeof direct === "object" && !Array.isArray(direct)) return direct;
  }
  for (const candidate of jsonObjects(text)) {
    const value = parseJsonLoose(candidate);
    if (value === undefined || !value || typeof value !== "object" || Array.isArray(value)) continue;
    if (looksLikeDraft(value) || "width" in value || "height" in value) return value;
  }
  return null;
}

// Accepts the shapes a draft actually arrives in: the draft itself, a JSON
// string (copied out of a workflow), the same thing wrapped in prose, and a
// {"layout": "..."} / {"source": "..."} envelope. Anything that is not draft
// shaped resolves to null so a stray object can never blank the canvas.
function parseDraftText(raw) {
  let text = typeof raw === "string" ? raw.trim() : "";
  for (let depth = 0; depth < 4 && text; depth += 1) {
    const value = parseJsonOnce(text);
    if (value === null) return null;
    if (typeof value === "string") { text = value.trim(); continue; }
    if (looksLikeDraft(value)) return value;
    const wrapped = ["layout", "draft", "source"]
      .map((key) => value[key])
      .find((entry) => typeof entry === "string" && entry.trim());
    if (wrapped) { text = wrapped.trim(); continue; }
    return null;
  }
  return null;
}

function isSceneSchema(value) {
  return Array.isArray(value?.elements);
}

const SCENE_LABELS = {
  panel: "object", obj: "object", object: "object", shape: "object",
  character: "character", person: "character", text: "text",
};
const SCENE_TEXT_FIELDS = ["identity", "shape", "note"];

function sceneText(value, key) {
  const text = value?.[key];
  return typeof text === "string" ? text.trim() : "";
}

function sceneSize(value, name, fallback) {
  const size = value?.[name];
  return Number.isInteger(size) && size > 0 ? size : fallback;
}

function sceneMustNot(value) {
  const entries = Array.isArray(value) ? value : [value];
  const parts = [];
  for (const entry of entries) {
    if (typeof entry !== "string" || !entry.trim()) continue;
    let text = entry.trim();
    if (text.slice(0, 4).toLowerCase() === "not ") text = text.slice(4).trim();
    if (text) parts.push(text);
  }
  return parts.join("; ");
}

function draftFromSceneSchema(raw, width, height) {
  const canvasWidth = sceneSize(raw, "width", width);
  const canvasHeight = sceneSize(raw, "height", height);
  const centered = raw.bbox_coord_space !== "abs";
  const items = raw.elements.map((element) => {
    const key = String(element?.type ?? "").trim().toLowerCase();
    const label = SCENE_LABELS[key] ?? "object";
    const caption = SCENE_TEXT_FIELDS
      .map((field) => sceneText(element, field))
      .filter(Boolean)
      .join(" ");
    const box = Array.isArray(element?.bbox) ? element.bbox.map(Number) : [];
    const item = { label, caption };
    if (label === "text") {
      const text = sceneText(element, "text") || sceneText(element, "identity");
      if (text) item.text = text;
      else item.label = "object";
    }
    item.bbox = centered && box.length === 4
      ? [box[1] + canvasWidth / 2, box[0] + canvasHeight / 2,
         box[3] + canvasWidth / 2, box[2] + canvasHeight / 2]
      : box;
    return item;
  });
  let caption = [sceneText(raw, "scene_type"), sceneText(raw, "gen_brief")].filter(Boolean).join(". ");
  const mustNot = sceneMustNot(raw.must_not);
  if (mustNot) caption = `${caption} Avoid: ${mustNot}`.trim();
  const summary = { caption };
  if (Array.isArray(raw.palette) && raw.palette.every((entry) => typeof entry === "string")) {
    summary.palette = raw.palette;
  }
  return {
    width: canvasWidth,
    height: canvasHeight,
    bbox_coord_space: "abs",
    bbox_format: "xyxy",
    summary,
    items,
  };
}

function isCompiledDraft(value) {
  return value?.bbox_coord_space === "abs_centralized" || value?.bbox_format === "yxyx";
}

function draftFromCompiled(raw, width, height) {
  // Compiled prompts carry centered offsets only, so the canvas has to come
  // from somewhere: the draft itself when it still has a width/height, else the
  // canvas the node is on right now.
  const size = (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
  };
  const canvasWidth = size(raw.width, width);
  const canvasHeight = size(raw.height, height);
  const halfWidth = canvasWidth / 2;
  const halfHeight = canvasHeight / 2;
  const items = (Array.isArray(raw.items) ? raw.items : []).map((item) => {
    const box = Array.isArray(item?.bbox) ? item.bbox : null;
    if (!box || box.length !== 4) return item;
    const [y1, x1, y2, x2] = box;
    return { ...item, bbox: [x1 + halfWidth, y1 + halfHeight, x2 + halfWidth, y2 + halfHeight] };
  });
  return {
    width: canvasWidth,
    height: canvasHeight,
    bbox_coord_space: "abs",
    bbox_format: "xyxy",
    summary: raw.summary ?? { caption: "" },
    items,
  };
}

function fitDraftToCanvas(draft) {
  const width = Number(draft?.width);
  const height = Number(draft?.height);
  const items = Array.isArray(draft?.items) ? draft.items : [];
  if (!(width > 0) || !(height > 0) || !items.length) return null;
  let halfWidth = 0;
  let halfHeight = 0;
  for (const item of items) {
    const box = Array.isArray(item?.bbox) ? item.bbox.map(Number) : null;
    if (!box || box.length !== 4 || box.some((value) => !Number.isFinite(value))) continue;
    halfWidth = Math.max(halfWidth, Math.abs(box[0] - width / 2), Math.abs(box[2] - width / 2));
    halfHeight = Math.max(halfHeight, Math.abs(box[1] - height / 2), Math.abs(box[3] - height / 2));
  }
  if (!halfWidth || !halfHeight) return null;
  if (halfWidth <= width / 2 && halfHeight <= height / 2) return null;
  const scale = Math.min((width / 2) / halfWidth, (height / 2) / halfHeight);
  const fitted = items.map((item) => {
    const box = Array.isArray(item?.bbox) ? item.bbox.map(Number) : null;
    if (!box || box.length !== 4 || box.some((value) => !Number.isFinite(value))) return item;
    const [x1, y1, x2, y2] = box;
    return {
      ...item,
      bbox: [
        (x1 - width / 2) * scale + width / 2, (y1 - height / 2) * scale + height / 2,
        (x2 - width / 2) * scale + width / 2, (y2 - height / 2) * scale + height / 2,
      ],
    };
  });
  return { ...draft, items: fitted };
}

function colorOf(item) {
  return item.color || LABEL_COLORS[item.label] || FALLBACK_COLOR;
}

// Text sits on the item's own color, so pick white or near-black by luminance.
function textOn(hex) {
  const value = parseInt(hex.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return (red * 0.299 + green * 0.587 + blue * 0.114) / 255 > 0.62 ? "#101318" : "#f4f7fb";
}

// The one-line summary drawn on the header: the exact text for text boxes,
// otherwise the caption. Whitespace is folded so a multiline caption still reads
// as a single tab label.
function itemText(item) {
  const raw = item.label === "text" && item.text ? item.text : item.caption;
  return typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
}

function roundedRect(context, x, y, width, height, radius) {
  const size = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + size, y);
  context.arcTo(x + width, y, x + width, y + height, size);
  context.arcTo(x + width, y + height, x, y + height, size);
  context.arcTo(x, y + height, x, y, size);
  context.arcTo(x, y, x + width, y, size);
  context.closePath();
}

// A four-way move glyph, drawn by hand so it matches the tab at any zoom.
function drawMoveGlyph(context, centerX, centerY, size, ink) {
  const arm = Math.max(3.5, size * 0.26);
  const head = Math.max(2.2, arm * 0.6);
  context.save();
  context.strokeStyle = ink;
  context.fillStyle = ink;
  context.lineWidth = 1.4;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(centerX - arm + head * 0.3, centerY);
  context.lineTo(centerX + arm - head * 0.3, centerY);
  context.moveTo(centerX, centerY - arm + head * 0.3);
  context.lineTo(centerX, centerY + arm - head * 0.3);
  context.stroke();
  context.beginPath();
  context.moveTo(centerX, centerY - arm - head);
  context.lineTo(centerX - head, centerY - arm + head * 0.45);
  context.lineTo(centerX + head, centerY - arm + head * 0.45);
  context.closePath();
  context.moveTo(centerX, centerY + arm + head);
  context.lineTo(centerX - head, centerY + arm - head * 0.45);
  context.lineTo(centerX + head, centerY + arm - head * 0.45);
  context.closePath();
  context.moveTo(centerX - arm - head, centerY);
  context.lineTo(centerX - arm + head * 0.45, centerY - head);
  context.lineTo(centerX - arm + head * 0.45, centerY + head);
  context.closePath();
  context.moveTo(centerX + arm + head, centerY);
  context.lineTo(centerX + arm - head * 0.45, centerY - head);
  context.lineTo(centerX + arm - head * 0.45, centerY + head);
  context.closePath();
  context.fill();
  context.restore();
}

function createEditor(node) {
  const layoutWidget = node.widgets?.find((widget) => widget.name === LAYOUT_WIDGET);
  if (!layoutWidget) return null;
  if (typeof node.addDOMWidget !== "function") {
    console.warn("[moss-layoutPrompt] this ComfyUI frontend has no DOM widget support");
    return null;
  }
  ensureStyle();
  const isAdvance = node.comfyClass === ADVANCE_CLASS || node.type === ADVANCE_CLASS;

  // The frontend can replace widget objects, so always look them up by name
  // instead of holding references taken at creation time.
  function widgetByName(name) {
    return node.widgets?.find((widget) => widget.name === name);
  }

  let sourceTimer = 0;
  let lastSourceText = "";
  let lastWarnText = "";
  let styledSource = null;
  let sourceDialog = null;

  function queueSource(force) {
    window.clearTimeout(sourceTimer);
    sourceTimer = window.setTimeout(() => applySource(force === true), SOURCE_DEBOUNCE);
  }

  function sourceText() {
    const widget = node.widgets?.find((entry) => entry.name === SOURCE_WIDGET);
    return typeof widget?.value === "string" ? widget.value.trim() : "";
  }

  function applySource(force) {
    const text = sourceText();
    if (!text) {
      lastSourceText = "";
      lastWarnText = "";
      return false;
    }
    if (!force && text === lastSourceText) return false;
    try {
      if (loadDraftText(text, null)) {
        // loadDraftText syncs the canvas, and that sync mirrors the normalized
        // draft back into `source`. Remember what the field actually holds now,
        // not the raw paste — otherwise the pending debounce sees a mismatch and
        // replays the load, re-running the whole parse and overwriting the hint.
        lastSourceText = sourceText();
        lastWarnText = "";
        return true;
      }
    } catch (error) {
      console.error("[moss-layoutPrompt] failed to load the source draft", error);
    }
    return false;
  }

  function sourceElement() {
    const element = widgetByName(SOURCE_WIDGET)?.element;
    return element instanceof HTMLTextAreaElement ? element : null;
  }

  function sourceIsFocused() {
    return document.activeElement === sourceElement();
  }

  // Write the canvas draft back into the external `source` widget without firing
  // input events (a programmatic write must not look like the user pasted it).
  function writeSource(text) {
    const widget = widgetByName(SOURCE_WIDGET);
    if (!widget) return;
    if (widget.value !== text) widget.value = text;
    const element = sourceElement();
    if (element) {
      if (element.value !== text) element.value = text;
      decorateSource(element);
    }
    lastSourceText = text;
  }

  // Keep `source` and the canvas in step. The canvas is the source of truth: every
  // edit mirrors the current draft into `source`, so running the node can never
  // prefer an older draft (or a compiled prompt the backend rejects) over the
  // boxes on screen. While the user types in `source` the field is left alone —
  // the blur handler normalizes it afterwards.
  function mirrorSource(draftJson) {
    const widget = widgetByName(SOURCE_WIDGET);
    if (!widget || sourceIsFocused()) return;
    if (!state.items.length && !sourceText()) return; // pristine canvas: keep the placeholder
    writeSource(draftJson ?? JSON.stringify(buildDraft()));
  }

  // Safety net for focus changes that never reach our blur handler (programmatic
  // blur, older frontends). Only folds text that is already applied (or empty), so
  // it can never eat what the user is still typing.
  function normalizeSource() {
    const widget = widgetByName(SOURCE_WIDGET);
    if (!widget || sourceIsFocused()) return;
    const text = sourceText();
    if (text && text !== lastSourceText) return;
    if (!state.items.length && !text) return;
    const target = JSON.stringify(buildDraft());
    if (typeof widget.value !== "string" || widget.value !== target) writeSource(target);
  }

  // The source field is a plain multiline widget, so on its own it reads as a block
  // of dim body text instead of an input. Frame it like one: a "source" tab on the
  // left, a persistent click/paste hint on the right and a real placeholder. Both
  // decorations live in the widget's DOM wrapper, above the textarea, so clicking
  // anywhere still focuses the textarea.
  function decorateSource(element) {
    const wrap = element.parentElement;
    if (!wrap) return;
    if (!wrap.classList.contains("mlp-source-wrap")) {
      wrap.classList.add("mlp-source-wrap");
      // The tab and hint are absolutely positioned; older frontends may not give
      // the widget wrapper a positioning context of its own.
      if (getComputedStyle(wrap).position === "static") wrap.style.position = "relative";
    }
    if (element.placeholder !== SOURCE_PLACEHOLDER) element.placeholder = SOURCE_PLACEHOLDER;
    if (!wrap.querySelector(".mlp-source-tag")) {
      const tag = document.createElement("button");
      tag.type = "button";
      tag.className = "mlp-source-tag";
      tag.title = "打开 source 完整内容（与画布双向同步）";
      tag.innerHTML = SOURCE_TAG_ICON;
      const label = document.createElement("span");
      label.textContent = "source";
      tag.append(label);
      tag.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openSourceDialog();
      });
      wrap.append(tag);
    }
    if (!wrap.querySelector(".mlp-source-hint")) {
      const hint = document.createElement("span");
      hint.className = "mlp-source-hint";
      hint.textContent = SOURCE_HINT_TEXT;
      wrap.append(hint);
    }
    // With content the placeholder is gone, so the right-hand hint is what keeps
    // saying "you can edit/paste here"; when the field is empty the placeholder
    // already does that job and the hint would just repeat it.
    wrap.querySelector(".mlp-source-hint").style.display =
      element.value.trim() === "" ? "none" : "inline-flex";
  }

  function styleSource(element) {
    element.rows = 1;
    element.style.height = `${SOURCE_WIDGET_HEIGHT}px`;
    element.style.minHeight = `${SOURCE_WIDGET_HEIGHT}px`;
    element.style.maxHeight = `${SOURCE_WIDGET_HEIGHT}px`;
    decorateSource(element);
  }

  function closeSourceDialog() {
    if (!sourceDialog) return;
    const { backdrop } = sourceDialog;
    sourceDialog = null;
    backdrop.remove();
    document.removeEventListener("keydown", sourceDialogKeyDown, true);
    const element = widgetByName(SOURCE_WIDGET)?.element;
    if (element instanceof HTMLTextAreaElement) element.focus({ preventScroll: true });
  }

  function setDialogNote(note, message, isError) {
    note.textContent = message;
    note.classList.toggle("is-error", Boolean(isError));
  }

  // Apply the edited dialog text: load it onto the canvas and let the normal sync
  // write the normalized draft back into `source`. Invalid text keeps the dialog
  // open with an inline error, so nothing is lost or half-applied.
  function applyDialogSource(dialog) {
    if (!dialog) return;
    const { body, note } = dialog;
    const text = body.value;
    if (!text.trim()) {
      setDialogNote(note, "内容为空：请粘贴草稿 JSON、已编译提示词或旧版 scene 提示词", true);
      return;
    }
    const widget = widgetByName(SOURCE_WIDGET);
    if (widget && text === widget.value) {
      closeSourceDialog();
      return;
    }
    try {
      if (!loadDraftText(text, null, true)) {
        setDialogNote(note, "无法解析这段文本：需要草稿 JSON、已编译提示词或旧版 scene 提示词", true);
        return;
      }
    } catch (error) {
      setDialogNote(note, `无法载入：${error?.message ?? error}`, true);
      return;
    }
    closeSourceDialog();
    flash("已应用 source 内容并同步画布");
  }

  function sourceDialogKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeSourceDialog();
      return;
    }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      event.stopPropagation();
      applyDialogSource(sourceDialog);
      return;
    }
    // Keep canvas shortcuts (Delete, Backspace, …) from firing behind the dialog.
    event.stopPropagation();
  }

  function copySourceText(text, button) {
    const done = () => {
      button.textContent = "已复制";
      window.setTimeout(() => {
        button.textContent = "复制全文";
      }, 1500);
    };
    const fallback = () => {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.top = "-1000px";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      try {
        document.execCommand("copy");
        done();
      } catch (error) {
        button.textContent = "复制失败";
      }
      area.remove();
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
      return;
    }
    fallback();
  }

  function showSourceDialog(text) {
    closeSourceDialog();
    const body = h("textarea", {
      class: "mlp-modal-body",
      spellcheck: "false",
      "aria-label": "source 内容",
    });
    body.value = text;
    const count = h("span", { class: "mlp-modal-sub", text: `${text.length} 字符` });
    body.addEventListener("input", () => {
      count.textContent = `${body.value.length} 字符`;
    });
    const note = h("span", {
      class: "mlp-modal-note",
      text: "可直接编辑 · 点「应用」载入画布并与 source 同步 · Ctrl+Enter 应用",
    });
    const copy = h("button", { type: "button", class: "mlp-btn", text: "复制全文" });
    copy.addEventListener("click", () => copySourceText(body.value, copy));
    const close = h("button", { type: "button", class: "mlp-btn", text: "关闭" });
    close.addEventListener("click", closeSourceDialog);
    const apply = h("button", {
      type: "button",
      class: "mlp-btn mlp-btn-primary",
      text: "应用",
      title: "把这段内容载入画布，并同步回 source 输入框",
    });
    apply.addEventListener("click", () => applyDialogSource(sourceDialog));
    const modal = h("div", {
      class: "mlp-modal",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "source 完整内容",
    }, [
      h("div", { class: "mlp-modal-head" }, [
        h("span", { class: "mlp-modal-title", text: "source · 完整内容" }),
        h("span", { class: "mlp-spacer" }),
        count,
      ]),
      body,
      h("div", { class: "mlp-modal-foot" }, [note, copy, close, apply]),
    ]);
    const backdrop = h("div", {
      class: "mlp-modal-backdrop",
      onpointerdown: (event) => {
        if (event.target === backdrop) closeSourceDialog();
      },
    }, [modal]);
    document.body.append(backdrop);
    document.addEventListener("keydown", sourceDialogKeyDown, true);
    sourceDialog = { backdrop, body, note };
    body.focus({ preventScroll: true });
    body.setSelectionRange?.(0, 0);
  }

  // The source tab opens the full text in an editable dialog (the strip itself
  // only shows two lines). Applying it loads the canvas; the sync then writes the
  // normalized draft back, so the dialog and the mini field always agree.
  function openSourceDialog() {
    const widget = widgetByName(SOURCE_WIDGET);
    if (!widget) return;
    window.clearTimeout(sourceTimer);
    mirrorSource();
    const text = typeof widget.value === "string" ? widget.value : "";
    showSourceDialog(text);
  }

  function watchWidgets() {
    hideLayoutWidget();
    wireSizeWidgets();
    const widget = widgetByName(SOURCE_WIDGET);
    if (!widget) return;
    if (widget.__mlpSource !== true) {
      widget.__mlpSource = true;
      widget.options = widget.options ?? {};
      widget.options.getMinHeight = () => SOURCE_WIDGET_HEIGHT;
      widget.options.getMaxHeight = () => SOURCE_WIDGET_HEIGHT;
      const onSourceInput = widget.callback;
      widget.callback = function (...args) {
        const result = onSourceInput?.apply(this, args);
        queueSource();
        return result;
      };
    }
    const element = widget.element;
    if (element instanceof HTMLTextAreaElement) {
      if (element !== styledSource) {
        styledSource = element;
        element.addEventListener("input", () => {
          decorateSource(element);
          queueSource(true);
        });
        // Leaving the field hands the canvas back the last word: apply whatever
        // was typed, then store the normalized draft so `source` stays a valid
        // draft the node can compile.
        element.addEventListener("blur", () => {
          window.clearTimeout(sourceTimer);
          const text = sourceText();
          if (text && text !== lastSourceText && !applySource(true)) return;
          normalizeSource();
        });
      }
      if (!sourceIsFocused() && typeof widget.value === "string" && element.value !== widget.value) {
        // A lazily created DOM field must show the synced widget value.
        element.value = widget.value;
      }
      styleSource(element);
    }
    applySource();
    normalizeSource();
  }

  function clearSource() {
    const widget = node.widgets?.find((entry) => entry.name === SOURCE_WIDGET);
    if (!widget) return;
    widget.value = "";
    const element = widget.element;
    if (element instanceof HTMLTextAreaElement) {
      element.value = "";
      decorateSource(element);
    }
    lastSourceText = "";
  }

  function clearAll() {
    if (!window.confirm("清空所有内容？总提示词、标签、所有框和外部输入都会清空。")) return;
    state.items = [];
    state.summary = { caption: "", meta: [], canvas: "single", palette: null };
    selection = -1;
    hover = -1;
    overlap = 0;
    resetCycle();
    render();
    // Sync first so the layout draft is empty, then clear `source` for real: a
    // pristine canvas must not leave a stale draft behind.
    sync();
    clearSource();
    draw();
  }

  const state = {
    width: DEFAULT_SIZE,
    height: DEFAULT_SIZE,
    summary: { caption: "", meta: [], canvas: "single", palette: null },
    items: [],
  };
  const view = { scale: 1, x: 0, y: 0 };
  let selection = -1;
  let hover = -1;
  let drag = null;
  let cards = [];
  let overlap = 0;
  const cycle = { point: null, stack: [], index: 0 };
  let statusLine = null;
  let statusTimer = 0;

  function flash(message) {
    if (!statusLine) return;
    statusLine.textContent = message;
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => {
      if (statusLine) statusLine.textContent = "";
    }, 2600);
  }

  function resetCycle() {
    cycle.point = null;
    cycle.stack = [];
    cycle.index = 0;
  }

  const canvas = h("canvas", { class: "mlp-canvas", tabindex: "0" });
  const context = canvas.getContext("2d");
  const overlapChip = h("div", { class: "mlp-chip-hint" });
  const stage = h("div", { class: "mlp-stage" }, [canvas, overlapChip]);
  const list = h("div", { class: "mlp-list" });
  const previewBody = h("textarea", {
    class: "mlp-preview-body",
    readonly: "readonly",
    spellcheck: "false",
    title: "只读预览",
    onkeydown: (event) => event.stopPropagation(),
  });

  // JSON requires every backslash to be doubled, so a prompt written as
  // `lumine \(genshin impact\)` shows up as `\\(` in the serialised text. The
  // "text" view folds each escape pair back to what the prompt really holds; it
  // is meant for reading and for handing the prompt to other tools, and is not
  // valid JSON, so it must never be pasted back into the source box.
  let previewDisplay = "json";
  const PREVIEW_DISPLAY = [
    { value: "json", label: "JSON", title: "标准 JSON 视图：反斜杠会写成两个，可以直接回贴" },
    { value: "text", label: "文本", title: "文本视图：反斜杠还原成一个，便于阅读或外发；成对反斜杠会丢一个，要完整还原请用「复制草稿」" },
  ];
  const previewModeBar = h("div", { class: "mlp-seg mlp-seg-mini" }, PREVIEW_DISPLAY.map((option) => h("button", {
    type: "button",
    class: option.value === "json" ? "is-on" : null,
    title: option.title,
    text: option.label,
    "data-display": option.value,
    onclick: () => setPreviewDisplay(option.value),
  })));

  function setPreviewDisplay(value) {
    if (previewDisplay === value) return;
    previewDisplay = value;
    for (const button of previewModeBar.children) {
      button.classList.toggle("is-on", button.dataset.display === value);
    }
    renderPreview();
    if (value === "text") flash("文本视图：反斜杠已还原 · 成对反斜杠会丢一个");
  }

  // `sync()` hands over the draft snapshot it already built, so a drag never pays
  // for a second buildDraft() just to repaint the preview.
  function renderPreview(draft = buildDraft()) {
    const json = compiledPrompt(draft);
    // With no items the preview is the bare caption, not JSON — leave it alone.
    previewBody.value = previewDisplay === "text" && state.items.length
      ? json.replace(/\\\\/g, "\\")
      : json;
  }

  const copyButton = h("button", {
    type: "button",
    class: "mlp-btn mlp-btn-mini",
    title: "把下面这段完整提示词复制到剪贴板",
    text: "复制",
    onclick: () => copyWithFeedback(copyButton, previewBody.value ?? "", "复制"),
  });
  const draftButton = h("button", {
    type: "button",
    class: "mlp-btn mlp-btn-mini",
    title: "复制可回贴的草稿（含画布尺寸与原始坐标），贴回上方输入框能完整还原",
    text: "复制草稿",
    onclick: () => copyWithFeedback(draftButton, draftText(), "复制草稿"),
  });
  const copyTimers = new WeakMap();

  function draftText() {
    return JSON.stringify(buildDraft(), null, 2);
  }

  async function copyWithFeedback(button, text, idleLabel) {
    if (!text.trim()) {
      flash("没有可复制的内容");
      return;
    }
    const copied = await copyText(text);
    button.textContent = copied ? "已复制 ✓" : "复制失败";
    button.classList.toggle("is-ok", copied);
    window.clearTimeout(copyTimers.get(button));
    copyTimers.set(button, window.setTimeout(() => {
      button.textContent = idleLabel;
      button.classList.remove("is-ok");
    }, 1600));
    if (!copied) flash("复制失败，可手动选中文本复制");
  }

  // layout.py rejects a text region whose `text` is empty or whitespace-only
  // (`_text` requires a nonempty string), but the preview is pure JS and can
  // never know that upfront. Deleting the text to retype it is a legitimate
  // intermediate state, so keep the data and flag it in place — blocking sync
  // would leave the widget holding a stale draft while the UI shows empty.
  const warnBar = h("div", { class: "mlp-warn is-hidden" });

  function textGaps() {
    const gaps = [];
    state.items.forEach((item, index) => {
      if (item.label === "text" && !String(item.text ?? "").trim()) gaps.push(index + 1);
    });
    return gaps;
  }

  function refreshWarnings() {
    if (!warnBar) return;
    const gaps = textGaps();
    for (let index = 0; index < state.items.length; index += 1) {
      cards[index]?.element?.classList.toggle("is-warn", gaps.includes(index + 1));
    }
    const message = gaps.length
      ? `${gaps.map((number) => `#${number}`).join("、")} 是 text 区域但内容为空 · 执行时后端会拒绝（text must be nonempty text），请填写内容或把类型改回 object`
      : "";
    warnBar.classList.toggle("is-hidden", !gaps.length);
    if (warnBar.textContent !== message) warnBar.textContent = message;
  }

  const preview = h("div", { class: "mlp-preview" }, [
    h("div", { class: "mlp-preview-head" }, [
      h("span", { class: "mlp-title", text: "编译结果预览" }),
      h("span", { class: "mlp-spacer" }),
      previewModeBar,
      draftButton,
      copyButton,
    ]),
    previewBody,
  ]);
  const side = h("div", { class: "mlp-side" }, [list, preview]);
  const root = h("div", { class: "mlp-root" }, [stage, side]);
  const fileInput = h("input", {
    type: "file",
    accept: ".json,.txt,application/json,text/plain",
    style: { display: "none" },
    onchange: () => {
      const file = fileInput.files?.[0];
      fileInput.value = "";
      if (!file) return;
      file.text()
        .then((text) => loadDraftText(text, file.name))
        .catch((error) => window.alert(`读取文件失败：${error?.message ?? error}`));
    },
  });
  root.append(fileInput);

  function focusCanvas() {
    if (document.activeElement !== canvas) canvas.focus({ preventScroll: true });
  }

  // Backspace and Delete remove the selected box, never the node. The frontend
  // binds both keys to "delete selected items" on window, so while the editor
  // owns the keyboard we swallow them here: the box disappears, the node stays.
  // Text fields keep their normal editing keys.
  function onEditorKeyDown(event) {
    if (event.defaultPrevented) return;
    if (event.key !== "Backspace" && event.key !== "Delete") return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (isEditableElement(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    if (drag) return;
    if (selection < 0) {
      flash("先点击一个框，再按 Delete 或退格删除它");
      return;
    }
    removeItem(selection);
  }

  root.addEventListener("keydown", onEditorKeyDown);

  // Clicking anywhere that is not a text field focuses the canvas, so the delete
  // keys work right after selecting a box from the side list or the canvas.
  root.addEventListener("pointerdown", (event) => {
    if (isEditableElement(event.target)) return;
    focusCanvas();
  }, true);

  node.addDOMWidget("layout_editor", "layout", root, {
    serialize: false,
    hideOnZoom: false,
    getMinHeight: () => EDITOR_MIN_HEIGHT,
  });

  hideLayoutWidget();

  function hideLayoutWidget() {
    const widget = widgetByName(LAYOUT_WIDGET);
    if (!widget || widget.__mlpHidden === true) return;
    widget.__mlpHidden = true;
    widget.hidden = true;
    widget.computeSize = () => [0, -4];
  }

  // --- canvas size panel ---------------------------------------------------
  // Kept in memory and re-derived from the live canvas on load, so a saved
  // workflow reopens in whatever mode matches its width/height without adding a
  // widget the backend would have to validate.
  const canvasUI = { mode: "preset", ratio: "16:9", longEdge: 2048, orient: "landscape", edgeCustom: false };
  let canvasReadout = null;
  let canvasNote = null;
  let canvasBody = null;
  let canvasFoldButton = null;
  let longEdgeSelect = null;
  let longEdgeInput = null;
  let paintCanvasBody = () => {};

  // Whether the size card is folded is a view preference, not part of the
  // layout, so it lives in localStorage instead of the draft widget — same
  // reason canvasUI is memory-only.
  const CANVAS_FOLD_KEY = "moss-layout.canvas-folded";
  let canvasFolded = (() => {
    try {
      return window.localStorage.getItem(CANVAS_FOLD_KEY) === "1";
    } catch {
      return false;
    }
  })();

  function applyCanvasFold() {
    if (!canvasBody || !canvasFoldButton) return;
    // Hide the body rather than detaching it: paintCanvasBody() rewrites its
    // children on every render and would write into a detached node.
    canvasBody.style.display = canvasFolded ? "none" : "";
    canvasFoldButton.textContent = canvasFolded ? "▸" : "▾";
    canvasFoldButton.title = canvasFolded ? "展开画布尺寸" : "收起画布尺寸";
    canvasFoldButton.setAttribute("aria-expanded", String(!canvasFolded));
    try {
      window.localStorage.setItem(CANVAS_FOLD_KEY, canvasFolded ? "1" : "0");
    } catch {
      // Private mode or a sandboxed iframe: folding still works, it just is not
      // remembered across sessions.
    }
  }

  function snapCanvas(value) {
    const rounded = Math.round(Number(value) / SIZE_MULTIPLE) * SIZE_MULTIPLE;
    if (!Number.isFinite(rounded)) return DEFAULT_SIZE;
    return Math.min(Math.max(rounded, MIN_SIZE), MAX_CANVAS);
  }

  // Round up instead of to-nearest. A pasted draft states the canvas its boxes
  // were drawn on, so snapping down (1300 -> 1296) would leave boxes hanging
  // past the new right/bottom edge and fitBox would silently clip them. Growing
  // never drops geometry, and it matches coverBox(), which also expands outward
  // rather than trimming.
  function snapUpCanvas(value) {
    const rounded = Math.ceil(Number(value) / SIZE_MULTIPLE) * SIZE_MULTIPLE;
    if (!Number.isFinite(rounded)) return DEFAULT_SIZE;
    return Math.min(Math.max(rounded, MIN_SIZE), MAX_CANVAS);
  }

  function ratioOf(label) {
    return RATIOS.find((entry) => entry.label === label) ?? RATIOS[0];
  }

  // Closest ratio to an arbitrary canvas, always defined. Used when the user
  // flips to preset mode, so the canvas does not jump to whatever ratio was
  // remembered from a previous workflow.
  function nearestRatio(longEdge, shortEdge) {
    let best = RATIOS[0].label;
    let bestError = Infinity;
    for (const entry of RATIOS) {
      const expected = (longEdge * Math.min(entry.w, entry.h)) / Math.max(entry.w, entry.h);
      const error = Math.abs(expected - shortEdge);
      if (error < bestError) {
        bestError = error;
        best = entry.label;
      }
    }
    return best;
  }

  // The custom mode stores no ratio, so spell out what the current size works out
  // to. It is the only cue telling whether a pasted draft landed on the ratio it
  // came from: preset hits get their label back, anything else its own ratio.
  function ratioHint() {
    const longEdge = Math.max(state.width, state.height);
    const shortEdge = Math.min(state.width, state.height);
    const portrait = state.height > state.width;
    const label = nearestRatio(longEdge, shortEdge);
    const entry = RATIOS.find((item) => item.label === label);
    const expected = (longEdge * Math.min(entry.w, entry.h)) / Math.max(entry.w, entry.h);
    if (Math.abs(expected - shortEdge) <= RATIO_SLACK) {
      return `比例 ${portrait ? `${entry.h}:${entry.w}` : `${entry.w}:${entry.h}`}`;
    }
    return `比例 1 : ${(longEdge / shortEdge).toFixed(2)}（不在预设表中）`;
  }

  // Long edge drives the size; the short edge follows and lands on the 16 grid.
  function presetCanvasSize() {
    const ratio = ratioOf(canvasUI.ratio);
    const longEdge = snapCanvas(canvasUI.longEdge);
    const shortEdge = snapCanvas((longEdge * Math.min(ratio.w, ratio.h)) / Math.max(ratio.w, ratio.h));
    return canvasUI.orient === "landscape" ? [longEdge, shortEdge] : [shortEdge, longEdge];
  }

  function areaLabel(width, height) {
    return `${((width * height) / AREA_UNIT).toFixed(AREA_DIGITS)} M`;
  }

  // Match the live canvas back onto a preset when it happens to sit on one, and
  // fall back to custom otherwise. Only called on load and on edits made through
  // the native width/height widgets, never while the panel itself is editing —
  // otherwise typing a size would immediately flip the mode under the cursor.
  function inferCanvasUI() {
    const width = state.width;
    const height = state.height;
    const longEdge = Math.max(width, height);
    const shortEdge = Math.min(width, height);
    const match = RATIOS.find((entry) => {
      const expected = (longEdge * Math.min(entry.w, entry.h)) / Math.max(entry.w, entry.h);
      return Math.abs(expected - shortEdge) <= RATIO_SLACK;
    });
    canvasUI.mode = match ? "preset" : "custom";
    if (!match) return;
    canvasUI.ratio = match.label;
    canvasUI.longEdge = longEdge;
    canvasUI.edgeCustom = !LONG_EDGES.includes(longEdge);
    canvasUI.orient = width >= height ? "landscape" : "portrait";
  }

  function refreshCanvasReadout() {
    if (!canvasReadout) return;
    // A workflow saved elsewhere can carry a size the backend rejects. Snapping
    // on load would silently rewrite saved geometry, so only flag it here.
    const odd = state.width % SIZE_MULTIPLE !== 0 || state.height % SIZE_MULTIPLE !== 0;
    canvasReadout.textContent = `${state.width} × ${state.height} · ${areaLabel(state.width, state.height)}`
      + (odd ? " · 非 16 倍数" : "");
    canvasReadout.classList.toggle("is-warn", odd);
    if (canvasNote) canvasNote.textContent = ratioHint();
  }

  // Single entry point for resizing the canvas: snaps to the 16 grid the backend
  // demands, mirrors the value onto the native widgets, pulls every box back
  // inside, then repaints. Never calls render(), so typing in the panel keeps
  // its focus and the list keeps its scroll position.
  function applyCanvasSize(width, height) {
    const nextWidth = snapCanvas(width);
    const nextHeight = snapCanvas(height);
    const changed = nextWidth !== state.width || nextHeight !== state.height;
    state.width = nextWidth;
    state.height = nextHeight;
    writeSize("width", nextWidth);
    writeSize("height", nextHeight);
    if (changed) {
      let fitted = 0;
      state.items.forEach((item, index) => {
        const next = fitBox(item.bbox);
        if (next.some((value, position) => value !== item.bbox[position])) fitted += 1;
        item.bbox = next;
        writeBboxInputs(index, false);
      });
      sync();
      draw();
      if (fitted) flash(`${fitted} 个框已收回新画布内`);
    }
    refreshCanvasReadout();
    return changed;
  }

  // Number field for the panel. `onCommit` returns the value actually applied,
  // so a snapped input can rewrite itself once the user leaves the field.
  function canvasNumber(value, onCommit, attrs = {}) {
    let input = null;
    const commit = (rewrite) => {
      const number = Number(input.value);
      if (!Number.isFinite(number) || number < MIN_SIZE) {
        if (rewrite) input.value = String(value);
        return;
      }
      const applied = onCommit(number);
      if (rewrite) input.value = String(Number.isFinite(applied) ? applied : value);
    };
    input = h("input", {
      class: "mlp-num mlp-num-fixed",
      type: "number",
      min: String(MIN_SIZE),
      max: String(MAX_CANVAS),
      step: String(SIZE_MULTIPLE),
      autocomplete: "off",
      onkeydown: (event) => event.stopPropagation(),
      oninput: () => commit(false),
      onchange: () => commit(true),
      ...attrs,
    });
    input.value = String(value);
    return input;
  }

  // Long edge is edited by two controls that stay in sync: a real <select> so the
  // presets are one click away (a <input list=datalist> only offers completion
  // once something is typed, which is what made picking them so awkward), plus a
  // number field for arbitrary values.
  function longEdgePicker() {
    const options = LONG_EDGES.map((edge) => h("option", { value: String(edge), text: String(edge) }));
    options.push(h("option", { value: "custom", text: "自定义…" }));
    const element = h("select", {
      class: "mlp-select mlp-select-long",
      title: "常用长边，点开直接选",
      onchange: (event) => {
        const raw = event.target.value;
        if (raw === "custom") {
          // Nothing changes yet: the point is to hand the cursor to the number
          // field so an arbitrary long edge can be typed in.
          canvasUI.edgeCustom = true;
          paintCanvasBody();
          longEdgeInput?.focus();
          longEdgeInput?.select();
          return;
        }
        canvasUI.edgeCustom = false;
        canvasUI.longEdge = snapCanvas(Number(raw));
        const [width, height] = presetCanvasSize();
        applyCanvasSize(width, height);
        paintCanvasBody();
      },
    }, options);
    element.value = canvasUI.edgeCustom ? "custom" : String(canvasUI.longEdge);
    longEdgeSelect = element;
    return element;
  }

  // Typing in the number field can land on a preset (2048) or off the list
  // (1300); mirror that onto the select without rebuilding the row, which would
  // pull the focus out of the field mid-edit.
  function syncLongEdgeSelect() {
    if (!longEdgeSelect?.isConnected) return;
    const onList = LONG_EDGES.includes(canvasUI.longEdge);
    longEdgeSelect.value = onList && !canvasUI.edgeCustom ? String(canvasUI.longEdge) : "custom";
  }

  function canvasCard() {
    canvasReadout = h("span", { class: "mlp-area" });
    canvasBody = h("div");
    canvasFoldButton = h("button", {
      class: "mlp-fold",
      type: "button",
      text: "▾",
      onclick: () => {
        canvasFolded = !canvasFolded;
        applyCanvasFold();
      },
    });
    const element = h("div", { class: "mlp-card" }, [
      h("div", { class: "mlp-head" }, [
        h("span", { class: "mlp-title", text: "画布尺寸" }),
        h("span", { class: "mlp-spacer" }),
        canvasReadout,
        canvasFoldButton,
      ]),
      canvasBody,
    ]);
    applyCanvasFold();

    paintCanvasBody = () => {
      let edgeInput = null;
      longEdgeSelect = null;
      longEdgeInput = null;
      canvasNote = null;
      const rows = [
        h("div", { class: "mlp-row" }, [
          segment(MODE_OPTIONS, canvasUI.mode, (value) => {
            if (canvasUI.mode === value) return;
            canvasUI.mode = value;
            if (value === "preset") {
              // Seed the preset from what is on the canvas right now, then apply:
              // for a canvas that already sits on a ratio this is a no-op, and for
              // an odd one it picks the nearest ratio instead of the last used.
              const longEdge = Math.max(state.width, state.height);
              canvasUI.ratio = nearestRatio(longEdge, Math.min(state.width, state.height));
              canvasUI.longEdge = longEdge;
              canvasUI.edgeCustom = !LONG_EDGES.includes(longEdge);
              canvasUI.orient = state.width >= state.height ? "landscape" : "portrait";
              const [width, height] = presetCanvasSize();
              applyCanvasSize(width, height);
            } else {
              canvasUI.longEdge = Math.max(state.width, state.height);
              canvasUI.edgeCustom = !LONG_EDGES.includes(canvasUI.longEdge);
            }
            paintCanvasBody();
          }),
        ]),
      ];

      if (canvasUI.mode === "custom") {
        rows.push(h("div", { class: "mlp-row mlp-canvas-row" }, [
          h("span", { class: "mlp-label-inline", text: "宽" }),
          canvasNumber(state.width, (value) => {
            applyCanvasSize(value, state.height);
            return state.width;
          }, { title: CANVAS_STEP_HINT }),
          h("span", { class: "mlp-label-inline", text: "高" }),
          canvasNumber(state.height, (value) => {
            applyCanvasSize(state.width, value);
            return state.height;
          }, { title: CANVAS_STEP_HINT }),
        ]));
        canvasNote = h("span", { class: "mlp-note-text", text: ratioHint() });
        rows.push(h("div", { class: "mlp-row mlp-canvas-note" }, [canvasNote]));
      } else {
        rows.push(h("div", { class: "mlp-row mlp-canvas-row" }, [
          h("span", { class: "mlp-label-inline", text: "比例" }),
          select(RATIOS.map((entry) => entry.label), canvasUI.ratio, (value) => {
            canvasUI.ratio = value;
            const [width, height] = presetCanvasSize();
            applyCanvasSize(width, height);
            paintCanvasBody();
          }),
        ]));
        rows.push(h("div", { class: "mlp-row mlp-canvas-row" }, [
          h("span", { class: "mlp-label-inline", text: "长边" }),
          longEdgePicker(),
          edgeInput = canvasNumber(canvasUI.longEdge, (value) => {
            canvasUI.longEdge = snapCanvas(value);
            canvasUI.edgeCustom = !LONG_EDGES.includes(canvasUI.longEdge);
            const [width, height] = presetCanvasSize();
            applyCanvasSize(width, height);
            syncLongEdgeSelect();
            return canvasUI.longEdge;
          }, { class: "mlp-num mlp-num-fixed mlp-num-long",
               title: `也可以直接输入任意长边。${CANVAS_STEP_HINT}` }),
          h("span", { class: "mlp-unit-text", text: "px" }),
        ]));
        longEdgeInput = edgeInput;
        rows.push(h("div", { class: "mlp-row" }, [
          segment(ORIENT_OPTIONS, canvasUI.orient, (value) => {
            if (canvasUI.orient === value) return;
            canvasUI.orient = value;
            const [width, height] = presetCanvasSize();
            applyCanvasSize(width, height);
            paintCanvasBody();
          }),
        ]));
      }

      canvasBody.replaceChildren(...rows);
      refreshCanvasReadout();
    };

    paintCanvasBody();
    return element;
  }

  function fitBox(box) {
    const x1 = Math.min(Math.max(Math.round(box[0]), 0), state.width - MIN_BOX);
    const y1 = Math.min(Math.max(Math.round(box[1]), 0), state.height - MIN_BOX);
    const x2 = Math.min(Math.max(Math.round(box[2]), x1 + MIN_BOX), state.width);
    const y2 = Math.min(Math.max(Math.round(box[3]), y1 + MIN_BOX), state.height);
    return [x1, y1, x2, y2];
  }

  // Edges alternate width/height: x1,y1,x2,y2 -> width,height,width,height.
  function edgeLimit(position) {
    return position % 2 === 0 ? state.width : state.height;
  }

  // Move a single edge to `value`, keeping the box inside the canvas and at least
  // MIN_BOX thick. Only the edited edge moves, so manual typing never drags the
  // opposite edge around the way a whole-box fit would.
  function setEdge(item, position, value) {
    const limit = edgeLimit(position);
    const box = item.bbox.slice();
    const target = Math.round(Math.min(Math.max(value, 0), limit));
    if (position < 2) {
      const far = box[position + 2];
      box[position] = Math.max(Math.min(target, far - MIN_BOX), 0);
    } else {
      const near = box[position - 2];
      box[position] = Math.min(Math.max(target, near + MIN_BOX), limit);
    }
    item.bbox = box;
  }

  function formatPercent(value, limit) {
    if (!(limit > 0)) return "0";
    return String(Math.round((value / limit) * 10000) / 100);
  }

  function snapBox(box) {
    const maxX = Math.max(SNAP_STEP * 2, Math.floor(state.width / SNAP_STEP) * SNAP_STEP);
    const maxY = Math.max(SNAP_STEP * 2, Math.floor(state.height / SNAP_STEP) * SNAP_STEP);
    const up = (value) => Math.ceil(value / SNAP_STEP) * SNAP_STEP;
    const x1 = Math.min(up(box[0]), maxX - SNAP_STEP);
    const y1 = Math.min(up(box[1]), maxY - SNAP_STEP);
    const x2 = Math.max(Math.min(up(box[2]), maxX), x1 + SNAP_STEP);
    const y2 = Math.max(Math.min(up(box[3]), maxY), y1 + SNAP_STEP);
    return [x1, y1, x2, y2];
  }

  function alignBoxes() {
    if (!state.items.length) {
      window.alert("还没有可以对齐的框。");
      return;
    }
    let changed = 0;
    state.items.forEach((item, index) => {
      const next = snapBox(item.bbox);
      if (next.some((value, position) => value !== item.bbox[position])) changed += 1;
      item.bbox = next;
      // Repaint the inputs in place: a full render would scroll the list back to
      // the top and drop the user's place.
      writeBboxInputs(index, false);
    });
    sync();
    draw();
    flash(changed ? `已对齐 ${changed} 个框` : "所有框已经是 8 的整数倍");
  }

  function sizeValue(name, fallback) {
    const value = Number(widgetByName(name)?.value);
    if (Number.isFinite(value) && value >= MIN_SIZE) return Math.round(value);
    return fallback ?? DEFAULT_SIZE;
  }

  function writeSize(name, value) {
    const widget = widgetByName(name);
    if (widget && Number(widget.value) !== value) widget.value = value;
  }

  // Imported boxes can carry fractions (external tooling, proportional math).
  // layout.py rounds those outward — floor the start, ceil the end — so a
  // fractional box still covers the content it describes. Rounding to nearest
  // here would clip up to 1px off the box, so match the backend on the way in.
  // Only the import path uses this; dragging still rounds to nearest below.
  function coverBox(box) {
    return [Math.floor(box[0]), Math.floor(box[1]), Math.ceil(box[2]), Math.ceil(box[3])];
  }

  function normalizeItem(entry) {
    if (!entry || typeof entry !== "object") return null;
    const box = Array.isArray(entry.bbox) ? entry.bbox.map(Number) : null;
    if (!box || box.length !== 4 || box.some((value) => !Number.isFinite(value))) return null;
    const item = {
      label: LABELS.includes(entry.label) ? entry.label : "object",
      caption: typeof entry.caption === "string" ? entry.caption : "",
      text: typeof entry.text === "string" ? entry.text : "",
      color: typeof entry.color === "string" && HEX_COLOR.test(entry.color) ? entry.color.toLowerCase() : null,
      bbox: fitBox(coverBox(box)),
    };
    for (const key of PASS_THROUGH_FIELDS) {
      const values = stringArray(entry[key]);
      if (values) item[key] = values;
    }
    return item;
  }

  function applyDraft(draft) {
    const source = draft && typeof draft === "object" ? draft : {};
    const size = (value, fallback) => {
      const number = Number(value);
      return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
    };
    state.width = Math.max(MIN_SIZE, size(source.width, sizeValue("width")));
    state.height = Math.max(MIN_SIZE, size(source.height, sizeValue("height")));
    const summary = source.summary && typeof source.summary === "object" ? source.summary : {};
    state.summary = {
      caption: typeof summary.caption === "string" ? summary.caption : "",
      meta: stringArray(summary.meta) ?? [],
      canvas: CANVASES.includes(summary.canvas) ? summary.canvas : "single",
      palette: stringArray(summary.palette),
    };
    state.items = (Array.isArray(source.items) ? source.items : []).map(normalizeItem).filter(Boolean);
    selection = -1;
    hover = -1;
    overlap = 0;
    resetCycle();
    writeSize("width", state.width);
    writeSize("height", state.height);
    inferCanvasUI();
  }

  function buildDraft() {
    const summary = { caption: state.summary.caption, canvas: state.summary.canvas };
    if (state.summary.meta.length) summary.meta = state.summary.meta;
    if (state.summary.palette) summary.palette = state.summary.palette;
    const items = state.items.map((item) => {
      const entry = { label: item.label, caption: item.caption, bbox: item.bbox.slice() };
      if (item.color) entry.color = item.color;
      if (item.label === "text") entry.text = item.text;
      for (const key of PASS_THROUGH_FIELDS) if (item[key]) entry[key] = item[key];
      return entry;
    });
    return {
      width: state.width,
      height: state.height,
      bbox_coord_space: "abs",
      bbox_format: "xyxy",
      summary,
      items,
    };
  }

  function compiledPrompt(draft = buildDraft()) {
    if (!draft.items.length) return draft.summary.caption.trim();
    const halfWidth = Math.floor(draft.width / 2);
    const halfHeight = Math.floor(draft.height / 2);
    const items = draft.items.map((item) => {
      const entry = {};
      for (const [key, value] of Object.entries(item)) {
        if (key === "color") continue;
        if (key !== "bbox") {
          entry[key] = value;
          continue;
        }
        const [x1, y1, x2, y2] = value;
        entry.bbox = [Math.floor(y1) - halfHeight, Math.floor(x1) - halfWidth,
                      Math.ceil(y2) - halfHeight, Math.ceil(x2) - halfWidth];
      }
      return entry;
    });
    return JSON.stringify({
      summary: draft.summary,
      items,
      bbox_coord_space: "abs_centralized",
      bbox_format: "yxyx",
    });
  }

  function sync() {
    hideLayoutWidget();
    const draft = buildDraft();
    const draftJson = JSON.stringify(draft);
    const widget = widgetByName(LAYOUT_WIDGET);
    if (widget) widget.value = draftJson;
    renderPreview(draft);
    mirrorSource(draftJson);
    refreshWarnings();
  }

  function load() {
    const raw = widgetByName(LAYOUT_WIDGET)?.value ?? "";
    applyDraft(parseDraftText(raw));
    if (!state.items.length && typeof raw === "string" && raw.trim() && !parseDraftText(raw)) {
      console.warn("[moss-layoutPrompt] no draft JSON found in the layout widget");
    }
    if (state.items.length) {
      // The saved canvas draft wins: mark the existing source text as already
      // handled so a reload never replays it over later edits.
      lastSourceText = sourceText();
      return;
    }
    applySource();
  }

  // `silent` suppresses the toast for callers that report the failure themselves
  // in place (the source dialog writes an inline note, so a toast would double up).
  function loadDraftText(raw, label, silent = false) {
    const parsed = parseDraftText(raw);
    if (!parsed) {
      const message = "没有找到可用的草稿 JSON（需要含 summary / items 的对象）。";
      if (label) window.alert(`${label}：${message}`);
      else if (!silent && raw !== lastWarnText) flash("没找到可用的草稿 JSON · 画布保持不变");
      lastWarnText = raw;
      return false;
    }
    const compiled = isCompiledDraft(parsed);
    const carriedSize = Number(parsed.width) > 0 && Number(parsed.height) > 0;
    let draft = parsed;
    if (isSceneSchema(parsed)) draft = draftFromSceneSchema(parsed, state.width, state.height);
    else if (compiled) draft = draftFromCompiled(parsed, state.width, state.height);
    const converted = draft !== parsed;

    // layout.py only accepts canvas sizes that are a multiple of 16. The size
    // panel snaps, but a pasted draft used to land in `state` untouched, so the
    // editor would happily show a canvas the backend rejects at execution time.
    // Snap here (import only — never in applyDraft, which also runs when loading
    // an existing workflow and must not rewrite its saved geometry). Round up,
    // not to nearest: the draft's boxes were drawn against the size it declares,
    // so a smaller canvas would clip them. When the size came from a compiled
    // prompt it is just the current canvas, already snapped, so nothing to do.
    let snapNote = "";
    const declaredWidth = Number(draft.width);
    const declaredHeight = Number(draft.height);
    if (declaredWidth > 0 && declaredHeight > 0 && !(compiled && !carriedSize)) {
      const snappedWidth = snapUpCanvas(declaredWidth);
      const snappedHeight = snapUpCanvas(declaredHeight);
      if (snappedWidth !== declaredWidth || snappedHeight !== declaredHeight) {
        snapNote = `画布 ${declaredWidth}×${declaredHeight} 不是 16 的倍数，已吸附为 ${snappedWidth}×${snappedHeight}（后端校验要求）`;
        draft = { ...draft, width: snappedWidth, height: snappedHeight };
      }
    }

    let fittedNote = "";
    if (converted) {
      const fitted = fitDraftToCanvas(draft);
      if (fitted) {
        draft = fitted;
        // A compiled prompt carries no canvas size, so boxes running past the
        // canvas are a strong hint that the original canvas was larger — say so
        // instead of silently rescaling them against the wrong frame.
        fittedNote = compiled && !carriedSize
          ? `框超出当前 ${draft.width}×${draft.height}，已等比缩放 · 原画布未知，可先设好尺寸再粘贴`
          : `框超出 ${draft.width}×${draft.height} 画布，已等比缩放到画布内`;
        if (label) window.alert(`${label}：${fittedNote}`);
      }
    }
    applyDraft(draft);
    // An imported draft states a size outright — it was not picked off the
    // preset row — so show it as custom instead of claiming it came from a ratio.
    canvasUI.mode = "custom";
    canvasUI.longEdge = Math.max(state.width, state.height);
    canvasUI.edgeCustom = !LONG_EDGES.includes(canvasUI.longEdge);
    paintCanvasBody();
    render();
    sync();
    draw();
    const boxes = `${draft.items.length} 个分区`;
    const notes = [snapNote, fittedNote].filter(Boolean);
    if (notes.length) flash(`${notes.join(" · ")} · ${boxes}`);
    else if (compiled && !carriedSize) {
      flash(`已载入编译结果（它不含画布尺寸）· ${boxes}按当前 ${draft.width}×${draft.height} 换算`);
    } else {
      flash(`已载入 ${boxes} · 画布 ${draft.width}×${draft.height}`);
    }
    return true;
  }

  function writeBboxInputs(index, skipFocused = true) {
    const card = cards[index];
    const item = state.items[index];
    if (!card || !item) return;
    item.bbox.forEach((value, position) => {
      const pixel = card.inputs[position];
      if (pixel && (!skipFocused || document.activeElement !== pixel)) pixel.value = String(value);
      const percent = card.pcts?.[position];
      if (percent && (!skipFocused || document.activeElement !== percent)) {
        percent.value = formatPercent(value, edgeLimit(position));
      }
    });
  }

  function selectIndex(index) {
    selection = index;
    cards.forEach((card, position) => card.element.classList.toggle("is-active", position === index));
    revealCard(index);
    draw();
  }

  function revealCard(index) {
    const card = cards[index]?.element;
    if (!card || !card.isConnected) return;
    const top = card.offsetTop;
    const bottom = top + card.offsetHeight;
    const viewTop = list.scrollTop;
    const viewBottom = viewTop + list.clientHeight;
    if (top < viewTop) list.scrollTop = top - 8;
    else if (bottom > viewBottom) list.scrollTop = bottom - list.clientHeight + 8;
  }

  function bboxField(item, index) {
    const names = ["x1", "y1", "x2", "y2"];
    const pixels = [];
    const percents = [];

    const cells = names.map((name, position) => {
      const pixel = h("input", {
        class: "mlp-num",
        type: "number",
        step: "1",
        min: "0",
        title: `${name} · 像素坐标`,
        onkeydown: (event) => event.stopPropagation(),
        oninput: () => {
          const text = pixel.value.trim();
          if (text === "") return;
          const value = Number(text);
          if (!Number.isFinite(value)) return;
          setEdge(item, position, value);
          writeBboxInputs(index);
          draw();
          sync();
        },
        onchange: () => {
          writeBboxInputs(index, false);
          draw();
          sync();
        },
      });

      const percent = h("input", {
        class: "mlp-num mlp-num-pct",
        type: "number",
        step: "0.01",
        min: "0",
        max: "100",
        title: `${name} · 占画布百分比`,
        onkeydown: (event) => event.stopPropagation(),
        oninput: () => {
          const text = percent.value.trim();
          if (text === "") return;
          const value = Number(text);
          if (!Number.isFinite(value)) return;
          setEdge(item, position, (value / 100) * edgeLimit(position));
          writeBboxInputs(index);
          draw();
          sync();
        },
        onchange: () => {
          writeBboxInputs(index, false);
          draw();
          sync();
        },
      });

      pixels.push(pixel);
      percents.push(percent);
      return h("label", { class: "mlp-num-cell" }, [
        h("small", { text: name }),
        pixel,
        h("span", { class: "mlp-num-wrap" }, [percent, h("span", { class: "mlp-unit", text: "%" })]),
      ]);
    });

    names.forEach((name, position) => {
      pixels[position].value = String(item.bbox[position]);
      percents[position].value = formatPercent(item.bbox[position], edgeLimit(position));
    });
    return { element: h("div", { class: "mlp-bbox" }, cells), inputs: pixels, pcts: percents };
  }

  function colorPicker(item, index) {
    const swatch = h("input", {
      class: "mlp-swatch",
      type: "color",
      title: "框颜色",
      value: colorOf(item),
      oninput: (event) => {
        item.color = event.target.value;
        draw();
      },
      onchange: (event) => {
        item.color = event.target.value;
        sync();
        render();
        selectIndex(index);
      },
    });
    const reset = h("button", {
      type: "button",
      class: "mlp-btn mlp-btn-icon",
      title: "恢复为类型默认颜色",
      text: "↺",
      onclick: () => {
        item.color = null;
        sync();
        render();
        selectIndex(index);
      },
    });
    return h("span", { class: "mlp-color" }, [swatch, reset]);
  }

  function itemCard(item, index) {
    const color = colorOf(item);
    const head = h("div", { class: "mlp-head" }, [
      h("span", { class: "mlp-badge" }, [
        h("span", { class: "mlp-dot", style: { background: color } }),
        h("span", { text: `#${index + 1}` }),
      ]),
      colorPicker(item, index),
      select(LABELS, item.label, (value) => {
        item.label = value;
        render();
        sync();
        draw();
      }),
      h("span", { class: "mlp-spacer" }),
      h("button", {
        type: "button",
        class: "mlp-btn mlp-btn-icon",
        title: "删除此框（也可按 Delete / 退格）",
        text: "✕",
        onclick: () => removeItem(index),
      }),
    ]);

    const children = [
      head,
      field("caption · 框内元素的可见外观", textarea(item.caption, "描述该区域内元素的外观、材质、颜色…（回车换行）", (value) => {
        item.caption = value;
        sync();
        draw();
      })),
    ];

    if (item.label === "text") {
      children.push(field("text · 需要渲染的精确文字（回车换行）", textarea(item.text, "例如：把日常，过成诗。", (value) => {
        item.text = value;
        sync();
      })));
    }

    const bbox = bboxField(item, index);
    children.push(field("位置 · 像素坐标（下行为占画布百分比）", bbox.element));

    const element = h("div", {
      class: index === selection ? "mlp-card is-active" : "mlp-card",
      onpointerdown: () => {
        resetCycle();
        if (selection !== index) selectIndex(index);
      },
    }, children);
    cards[index] = { element, inputs: bbox.inputs, pcts: bbox.pcts };
    return element;
  }

  function summaryCard() {
    return h("div", { class: "mlp-card" }, [
      h("span", { class: "mlp-title", text: "总提示词" }),
      textarea(state.summary.caption, "描述整张图的画面、风格、光线与氛围（建议填写，留空也能运行）", (value) => {
        state.summary.caption = value;
        sync();
      }),
      h("div", { class: "mlp-head" }, [
        field("canvas · 画布类型", select(CANVASES, state.summary.canvas, (value) => {
          state.summary.canvas = value;
          sync();
        })),
      ]),
      field("meta · 类型标签（回车或逗号添加，点击标签编辑）", chipField(state.summary.meta, "例如：poster、product photo", (values) => {
        state.summary.meta = values;
        sync();
      })),
    ]);
  }

  function toolbar() {
    statusLine = h("span", { class: "mlp-status" });
    return h("div", { class: "mlp-toolbar" }, [
      h("button", {
        type: "button",
        class: "mlp-btn mlp-btn-primary",
        text: "+ 添加框",
        onclick: () => {
          const width = Math.max(MIN_BOX, Math.round(state.width * 0.3));
          const height = Math.max(MIN_BOX, Math.round(state.height * 0.22));
          const offset = (state.items.length % 5) * 24;
          addItem([32 + offset, 32 + offset, 32 + offset + width, 32 + offset + height]);
        },
      }),
      h("button", {
        type: "button",
        class: "mlp-btn",
        text: "清空",
        onclick: () => {
          if (!state.items.length) return;
          if (!window.confirm("清空所有框？")) return;
          state.items = [];
          selection = -1;
          render();
          sync();
          draw();
        },
      }),
      h("button", {
        type: "button",
        class: "mlp-btn",
        title: "导入草稿 JSON 文件（可夹杂无关文字）",
        text: "从文件导入",
        onclick: () => fileInput.click(),
      }),
      h("button", {
        type: "button",
        class: "mlp-btn",
        title: `把所有框的四个坐标向上对齐到 ${SNAP_STEP} 的整数倍`,
        text: `对齐到 ${SNAP_STEP}`,
        onclick: () => alignBoxes(),
      }),
      isAdvance ? h("button", {
        type: "button",
        class: "mlp-btn mlp-btn-danger",
        title: "清空所有内容：总提示词、标签、所有框和外部输入",
        text: "全部清空",
        onclick: () => clearAll(),
      }) : null,
      h("span", { class: "mlp-count", text: `${state.items.length} 个框` }),
      statusLine,
    ]);
  }

  function render() {
    cards = [];
    const rows = state.items.length
      ? state.items.map(itemCard)
      : [h("div", { class: "mlp-empty", text: "在左侧画布空白处拖动即可新建框" })];
    list.replaceChildren(
      canvasCard(),
      summaryCard(),
      toolbar(),
      warnBar,
      ...rows,
      h("div", {
        class: "mlp-hint",
        text: "空白处拖动新建框 · 左上角编号条显示编号与文字，条越宽可见文字越多 · 拖编号条移动该框（重叠时最可靠）· 选中后按 Delete / 退格删除该框（输入框内仍是正常编辑）· 重叠处重复点击切换 · 悬停后拖右下角圆点缩放 · 右侧可手输像素或百分比微调",
      }),
    );
    list.querySelectorAll(".mlp-textarea").forEach(autosize);
    renderPreview();
    refreshWarnings();
  }

  function addItem(box) {
    state.items.push({ label: "object", caption: "", text: "", bbox: fitBox(box) });
    selection = state.items.length - 1;
    resetCycle();
    render();
    sync();
    draw();
    cards[selection]?.element.scrollIntoView({ block: "nearest" });
    cards[selection]?.element.querySelector("textarea")?.focus();
  }

  function removeItem(index) {
    if (index < 0 || index >= state.items.length) return;
    const number = index + 1;
    state.items.splice(index, 1);
    selection = -1;
    hover = -1;
    overlap = 0;
    resetCycle();
    render();
    sync();
    draw();
    flash(`已删除框 #${number}`);
  }

  function drawItem(item, index, scale) {
    const [x1, y1, x2, y2] = item.bbox;
    const left = view.x + x1 * scale;
    const top = view.y + y1 * scale;
    const width = (x2 - x1) * scale;
    const height = (y2 - y1) * scale;
    const color = colorOf(item);
    const active = index === selection;

    context.fillStyle = rgba(color, active ? 0.26 : 0.14);
    context.fillRect(left, top, width, height);
    context.lineWidth = active ? 2 : 1;
    context.strokeStyle = color;
    context.strokeRect(left + 0.5, top + 0.5, width - 1, height - 1);
  }

  // Lay out the top-left tab in CSS pixels: number, then as much caption text as
  // the box width allows, then the move handle when there is still room. The tab
  // never leaves the box, and the whole union is the pointer target.
  function headerMetrics(item, index) {
    const scale = view.scale || 1;
    const [x1, y1, x2, y2] = item.bbox;
    const boxWidth = (x2 - x1) * scale;
    const boxHeight = (y2 - y1) * scale;
    if (boxWidth < HEADER_MIN_WIDTH || boxHeight < HEADER_HEIGHT + HEADER_INSET) return null;
    const left = view.x + x1 * scale + HEADER_INSET;
    const top = view.y + y1 * scale + HEADER_INSET;
    const available = Math.min(boxWidth - HEADER_INSET * 2, HEADER_MAX_WIDTH);
    if (available < HEADER_HEIGHT) return null;

    const number = String(index + 1);
    context.font = HEADER_FONT;
    const numberWidth = Math.ceil(context.measureText(number).width);
    const textStart = HEADER_PAD + numberWidth + HEADER_PAD;
    const handleFits = available >= textStart + HEADER_GAP + HANDLE_SIZE;
    const handleWidth = handleFits ? HANDLE_SIZE : 0;
    const gap = handleFits ? HEADER_GAP : 0;
    const pillCap = Math.max(textStart, available - handleWidth - gap);
    const textArea = pillCap - textStart - HEADER_PAD;

    let text = "";
    let pillWidth = textStart;
    const label = itemText(item);
    if (label && textArea >= HEADER_MIN_TEXT) {
      context.font = HEADER_TEXT_FONT;
      text = truncate(context, label, textArea);
      pillWidth = Math.min(pillCap, textStart + Math.ceil(context.measureText(text).width) + HEADER_PAD);
    }

    const pill = { x: left, y: top, width: pillWidth, height: HEADER_HEIGHT };
    const handle = handleFits
      ? { x: left + pillWidth + gap, y: top, width: handleWidth, height: HEADER_HEIGHT }
      : null;
    const hit = {
      x: left,
      y: top,
      width: pillWidth + (handle ? gap + handleWidth : 0),
      height: HEADER_HEIGHT,
    };
    return { pill, handle, hit, number, numberWidth, text };
  }

  function drawHandle(item, index, scale) {
    if (index !== selection && index !== hover) return;
    const [x1, y1, x2, y2] = item.bbox;
    const left = view.x + x1 * scale;
    const top = view.y + y1 * scale;
    context.beginPath();
    context.arc(left + (x2 - x1) * scale, top + (y2 - y1) * scale, 5, 0, Math.PI * 2);
    context.fillStyle = "#f2f4f7";
    context.fill();
    context.lineWidth = 1.5;
    context.strokeStyle = rgba(colorOf(item), 0.9);
    context.stroke();
  }

  function drawHeader(item, index) {
    const header = headerMetrics(item, index);
    if (!header) return;
    const { pill, handle } = header;
    const color = colorOf(item);
    const ink = textOn(color);
    const active = index === selection;
    const hovered = index === hover;

    context.save();
    roundedRect(context, pill.x, pill.y, pill.width, pill.height, HEADER_RADIUS);
    context.fillStyle = color;
    context.globalAlpha = active || hovered ? 1 : 0.92;
    context.fill();
    context.globalAlpha = 1;
    if (active) {
      context.lineWidth = 1.5;
      context.strokeStyle = "rgba(255, 255, 255, 0.95)";
      context.stroke();
    } else if (hovered) {
      context.lineWidth = 1;
      context.strokeStyle = "rgba(255, 255, 255, 0.7)";
      context.stroke();
    }

    context.fillStyle = ink;
    context.font = HEADER_FONT;
    context.textAlign = "left";
    context.textBaseline = "middle";
    const baseline = pill.y + pill.height / 2 + 0.5;
    context.fillText(header.number, pill.x + HEADER_PAD, baseline);
    if (header.text) {
      context.font = HEADER_TEXT_FONT;
      context.fillText(header.text, pill.x + HEADER_PAD + header.numberWidth + HEADER_PAD, baseline);
    }

    if (handle) {
      roundedRect(context, handle.x, handle.y, handle.width, handle.height, HEADER_RADIUS);
      context.fillStyle = color;
      context.globalAlpha = active || hovered ? 1 : 0.92;
      context.fill();
      context.globalAlpha = 1;
      if (active) {
        context.lineWidth = 1.5;
        context.strokeStyle = "rgba(255, 255, 255, 0.95)";
        context.stroke();
      } else if (hovered) {
        context.lineWidth = 1;
        context.strokeStyle = "rgba(255, 255, 255, 0.7)";
        context.stroke();
      }
      drawMoveGlyph(context, handle.x + handle.width / 2, handle.y + handle.height / 2, handle.height, ink);
    }
    context.restore();
  }

  function drawOverlay(scale) {
    state.items.forEach((item, index) => drawHandle(item, index, scale));

    const order = state.items
      .map((item, index) => index)
      .sort((a, b) => {
        const area = (index) => {
          const box = state.items[index].bbox;
          return (box[2] - box[0]) * (box[3] - box[1]);
        };
        return area(b) - area(a) || a - b;
      });
    for (const index of order) drawHeader(state.items[index], index);
  }

  function draw() {
    const cssWidth = stage.clientWidth;
    const cssHeight = stage.clientHeight;
    if (cssWidth < 2 || cssHeight < 2) return;

    const ratio = window.devicePixelRatio || 1;
    const pixelWidth = Math.round(cssWidth * ratio);
    const pixelHeight = Math.round(cssHeight * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, cssWidth, cssHeight);
    context.fillStyle = "#14171d";
    context.fillRect(0, 0, cssWidth, cssHeight);

    const pad = 10;
    const availableWidth = Math.max(1, cssWidth - pad * 2);
    const availableHeight = Math.max(1, cssHeight - pad * 2);
    const scale = Math.min(availableWidth / state.width, availableHeight / state.height);
    view.scale = scale;
    view.x = pad + (availableWidth - state.width * scale) / 2;
    view.y = pad + (availableHeight - state.height * scale) / 2;

    context.fillStyle = "#1c2129";
    context.fillRect(view.x, view.y, state.width * scale, state.height * scale);

    let step = 16;
    while (step * scale < 11) step *= 2;
    context.fillStyle = "rgba(255, 255, 255, 0.09)";
    for (let x = step; x < state.width; x += step) {
      for (let y = step; y < state.height; y += step) {
        context.fillRect(view.x + x * scale - 0.5, view.y + y * scale - 0.5, 1, 1);
      }
    }

    context.lineWidth = 1;
    context.strokeStyle = "rgba(255, 255, 255, 0.08)";
    context.strokeRect(view.x + 0.5, view.y + 0.5, state.width * scale - 1, state.height * scale - 1);

    state.items.forEach((item, index) => drawItem(item, index, scale));
    drawOverlay(scale);
    app.graph?.setDirtyCanvas(true, false);
  }

  function screenScale(rect) {
    const box = rect || canvas.getBoundingClientRect();
    return canvas.clientWidth ? box.width / canvas.clientWidth : 1;
  }

  function toImage(event) {
    const rect = canvas.getBoundingClientRect();
    const zoom = screenScale(rect);
    return {
      x: ((event.clientX - rect.left) / zoom - view.x) / view.scale,
      y: ((event.clientY - rect.top) / zoom - view.y) / view.scale,
    };
  }

  function toCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    const zoom = screenScale(rect);
    return { x: (event.clientX - rect.left) / zoom, y: (event.clientY - rect.top) / zoom };
  }

  // Header geometry is kept in CSS pixels (see headerMetrics), so hit tests run
  // there too instead of in image coordinates.
  function toScreen(point) {
    return { x: view.x + point.x * view.scale, y: view.y + point.y * view.scale };
  }

  function handleBoxAt(point) {
    const radius = 12 / (view.scale * screenScale());
    for (let index = state.items.length - 1; index >= 0; index -= 1) {
      const box = state.items[index].bbox;
      if (Math.abs(point.x - box[2]) <= radius && Math.abs(point.y - box[3]) <= radius) return index;
    }
    return -1;
  }

  function itemsAt(point) {
    const stack = [];
    for (let index = state.items.length - 1; index >= 0; index -= 1) {
      const [x1, y1, x2, y2] = state.items[index].bbox;
      if (point.x >= x1 && point.x <= x2 && point.y >= y1 && point.y <= y2) stack.push(index);
    }
    return stack;
  }

  // The tab is small but the most reliable handle: it paints above every box,
  // and its whole blue area — number, text and move glyph — is the target.
  function headerItemAt(point) {
    const screen = toScreen(point);
    let best = -1;
    let bestArea = Infinity;
    state.items.forEach((item, index) => {
      const header = headerMetrics(item, index);
      if (!header) return;
      const { hit } = header;
      if (screen.x < hit.x - HEADER_HIT_SLACK || screen.x > hit.x + hit.width + HEADER_HIT_SLACK) return;
      if (screen.y < hit.y - HEADER_HIT_SLACK || screen.y > hit.y + hit.height + HEADER_HIT_SLACK) return;
      const [x1, y1, x2, y2] = item.bbox;
      const area = (x2 - x1) * (y2 - y1);
      // Headers paint smallest-area-last, so the smallest hit is the topmost.
      if (area <= bestArea) {
        best = index;
        bestArea = area;
      }
    });
    return best;
  }

  function samePoint(a, b) {
    if (!a || !b) return false;
    return Math.hypot(a.x - b.x, a.y - b.y) <= CYCLE_SLACK / Math.max(view.scale, 1e-6);
  }

  // 同一处重复点击时在重叠栈里轮换；首次点击则保持当前选中（若它就在栈里），
  // 这样"已经选中内层框再拖"不会被外层抢走。
  function pickFromStack(stack, point) {
    const repeat =
      samePoint(cycle.point, point) &&
      cycle.stack.length === stack.length &&
      cycle.stack.every((value, position) => value === stack[position]);
    const current = stack.indexOf(selection);
    const cursor = repeat ? (cycle.index + 1) % stack.length : current >= 0 ? current : 0;
    cycle.point = { x: point.x, y: point.y };
    cycle.stack = stack.slice();
    cycle.index = cursor;
    return stack[cursor];
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.isPrimary === false) return;
    event.preventDefault();
    event.stopPropagation();
    hideOverlapChip();
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (error) {
      console.warn("[moss-layoutPrompt] pointer capture unavailable, dragging via window events", error);
    }
    const point = toImage(event);
    const header = headerItemAt(point);
    if (header >= 0) {
      resetCycle();
      drag = { mode: "move", index: header, box: state.items[header].bbox.slice(), origin: point, moved: false };
      selectIndex(header);
      hover = header;
      return;
    }
    const handle = handleBoxAt(point);
    if (handle >= 0) {
      resetCycle();
      drag = { mode: "resize", index: handle, box: state.items[handle].bbox.slice(), moved: false };
      selectIndex(handle);
      hover = handle;
      return;
    }
    const stack = itemsAt(point);
    if (stack.length) {
      const index = pickFromStack(stack, point);
      drag = { mode: "move", index, box: state.items[index].bbox.slice(), origin: point, moved: false };
      selectIndex(index);
      hover = index;
      return;
    }
    resetCycle();
    selection = -1;
    hover = -1;
    overlap = 0;
    cards.forEach((card) => card.element.classList.remove("is-active"));
    draw();
    drag = { mode: "create", index: -1, origin: point, moved: false };
  });

  function applyDrag(point) {
    if (drag.mode === "move") {
      const width = drag.box[2] - drag.box[0];
      const height = drag.box[3] - drag.box[1];
      const x = Math.min(Math.max(Math.round(drag.box[0] + point.x - drag.origin.x), 0), state.width - width);
      const y = Math.min(Math.max(Math.round(drag.box[1] + point.y - drag.origin.y), 0), state.height - height);
      const next = [x, y, x + width, y + height];
      if (next.every((value, position) => value === state.items[drag.index].bbox[position])) return;
      drag.moved = true;
      resetCycle();
      state.items[drag.index].bbox = next;
      writeBboxInputs(drag.index);
      draw();
      return;
    }

    if (drag.mode === "resize") {
      const [x1, y1] = drag.box;
      const x2 = Math.min(Math.max(Math.round(point.x), x1 + MIN_BOX), state.width);
      const y2 = Math.min(Math.max(Math.round(point.y), y1 + MIN_BOX), state.height);
      const next = [x1, y1, x2, y2];
      if (next.every((value, position) => value === state.items[drag.index].bbox[position])) return;
      drag.moved = true;
      state.items[drag.index].bbox = next;
      writeBboxInputs(drag.index);
      draw();
      return;
    }

    if (!drag.moved && Math.hypot(point.x - drag.origin.x, point.y - drag.origin.y) * view.scale <= 3) return;
    drag.moved = true;
    if (drag.index < 0) {
      state.items.push({
        label: "object",
        caption: "",
        text: "",
        bbox: fitBox([drag.origin.x, drag.origin.y, drag.origin.x + MIN_BOX, drag.origin.y + MIN_BOX]),
      });
      drag.index = state.items.length - 1;
      selection = drag.index;
      render();
    }
    state.items[drag.index].bbox = fitBox([
      drag.origin.x,
      drag.origin.y,
      Math.max(point.x, drag.origin.x + MIN_BOX),
      Math.max(point.y, drag.origin.y + MIN_BOX),
    ]);
    writeBboxInputs(drag.index);
    draw();
  }

  // 只量一次尺寸，之后每次 move 只写 left/top，避免逐帧强制布局。
  const chipSize = { count: -1, width: 0, height: 0 };

  function showOverlapChip(position, count) {
    if (chipSize.count !== count) {
      overlapChip.textContent = `重复点击切换 · ${count} 个框重叠`;
      overlapChip.style.display = "block";
      chipSize.count = count;
      chipSize.width = overlapChip.offsetWidth;
      chipSize.height = overlapChip.offsetHeight;
    } else if (overlapChip.style.display !== "block") {
      overlapChip.style.display = "block";
    }
    let left = position.x + 14;
    let top = position.y + 14;
    if (left + chipSize.width > stage.clientWidth - 4) left = Math.max(4, position.x - chipSize.width - 14);
    if (top + chipSize.height > stage.clientHeight - 4) top = Math.max(4, position.y - chipSize.height - 14);
    overlapChip.style.left = `${left}px`;
    overlapChip.style.top = `${top}px`;
  }

  function hideOverlapChip() {
    overlapChip.style.display = "none";
  }

  canvas.addEventListener("pointermove", (event) => {
    const point = toImage(event);
    const position = toCanvas(event);
    if (!drag) {
      const header = headerItemAt(point);
      const handle = header >= 0 ? -1 : handleBoxAt(point);
      const stack = header < 0 && handle < 0 ? itemsAt(point) : [];
      const target = header >= 0 ? header : handle >= 0 ? handle : stack.length ? stack[0] : -1;
      const count = stack.length;
      const dirty = target !== hover || count !== overlap;
      hover = target;
      overlap = count;
      canvas.style.cursor = header >= 0 ? "grab" : handle >= 0 ? "nwse-resize" : count ? "move" : "crosshair";
      if (count > 1) showOverlapChip(position, count);
      else hideOverlapChip();
      if (dirty) draw();
      return;
    }
    hideOverlapChip();
    event.preventDefault();
    event.stopPropagation();
    applyDrag(point);
  });

  canvas.addEventListener("pointerleave", () => {
    hideOverlapChip();
    if (drag || hover < 0) return;
    hover = -1;
    draw();
  });

  function endDrag() {
    if (!drag) return;
    const created = drag.mode === "create" && drag.index >= 0;
    // A plain click also enters "move" mode, but nothing changed. Syncing on it is
    // not just wasteful: the sync mirrors the draft into `source`, that DOM churn
    // makes the frontend re-run onConfigure, and `load()` → `applyDraft()` calls
    // resetCycle() — which wipes the overlap rotation state, so a second click on
    // the same stack could never advance.
    const moved = drag.moved === true;
    drag = null;
    if (created) {
      render();
      list.scrollTop = list.scrollHeight;
    }
    if (created || moved) sync();
    draw();
  }

  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  window.addEventListener("pointermove", (event) => {
    if (!drag) return;
    event.preventDefault();
    applyDrag(toImage(event));
  });
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  function wireSizeWidgets() {
    for (const name of SIZE_WIDGETS) {
      const widget = widgetByName(name);
      if (!widget || widget.__mlpSize === true) continue;
      widget.__mlpSize = true;
      const original = widget.callback;
      widget.callback = function (...args) {
        const result = original?.apply(this, args);
        const value = Math.round(Number(widget.value));
        if (Number.isFinite(value) && value >= MIN_SIZE) {
          state[name] = value;
          // The native widget may have landed on a preset combination, so let the
          // size panel follow instead of showing a stale ratio.
          inferCanvasUI();
          for (const item of state.items) item.bbox = fitBox(item.bbox);
          render();
          sync();
          draw();
        }
        return result;
      };
    }
  }

  wireSizeWidgets();

  const onConfigure = node.onConfigure;
  node.onConfigure = function (...args) {
    const result = onConfigure?.apply(this, args);
    load();
    render();
    sync();
    draw();
    return result;
  };

  if (typeof ResizeObserver === "function") {
    new ResizeObserver(() => draw()).observe(stage);
  }

  load();
  render();
  sync();
  watchWidgets();
  const widgetWatch = window.setInterval(watchWidgets, SOURCE_POLL);
  const onRemoved = node.onRemoved;
  node.onRemoved = function (...args) {
    window.clearInterval(widgetWatch);
    window.clearTimeout(sourceTimer);
    window.clearTimeout(statusTimer);
    closeSourceDialog();
    return onRemoved?.apply(this, args);
  };
  const onResize = node.onResize;
  node.onResize = function (size) {
    const result = onResize?.apply(this, arguments);
    if (size) {
      size[0] = Math.max(size[0], MIN_NODE_WIDTH);
      size[1] = Math.max(size[1], MIN_NODE_HEIGHT);
    }
    return result;
  };
  node.setSize([Math.max(node.size?.[0] ?? 0, MIN_NODE_WIDTH), Math.max(node.size?.[1] ?? 0, MIN_NODE_HEIGHT)]);
  requestAnimationFrame(draw);
  return { draw, render, sync };
}

app.registerExtension({
  name: "MOSSLayout.LayoutPrompt",
  nodeCreated(node) {
    if (!NODE_CLASSES.includes(node.comfyClass) && !NODE_CLASSES.includes(node.type)) return;
    if (node.__mossLayoutEditor) return;
    try {
      node.__mossLayoutEditor = createEditor(node);
    } catch (error) {
      console.error("[moss-layoutPrompt] failed to build the layout editor", error);
    }
  },
});
