import { app } from "../../scripts/app.js";

const NODE_CLASS = "MOSSImageLayoutPrompt";
const LAYOUT_WIDGET = "layout";
const SIZE_WIDGETS = ["width", "height"];
const PASS_THROUGH_FIELDS = ["tags", "palette"];
const LABELS = ["object", "character", "text"];
const CANVASES = ["single", "multi_panel", "collage"];
const LABEL_COLORS = { object: "#4a9eff", character: "#ff9147", text: "#59d97f" };
const FALLBACK_COLOR = "#8a8f98";
const PALETTE = ["#4a9eff", "#ff9147", "#59d97f", "#ff6b8b", "#c084fc", "#facc15", "#22d3ee", "#f5f5f5"];
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const MIN_BOX = 8;
const MIN_SIZE = 16;
const EDITOR_MIN_HEIGHT = 420;
const MIN_NODE_WIDTH = 980;
const MIN_NODE_HEIGHT = 680;
const SIDE_WIDTH = 360;
const DEFAULT_SIZE = 1024;
const STYLE_ID = "moss-layout-style";

const CSS = `
.mlp-root{display:flex;gap:10px;width:100%;height:100%;box-sizing:border-box;padding:2px;
  font:12px/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#d7dae0}
.mlp-stage{position:relative;flex:1 1 0;min-width:200px;height:100%;border-radius:8px;
  border:1px solid #2c313a;background:#14171d;overflow:hidden}
.mlp-canvas{display:block;width:100%;height:100%;touch-action:none}
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
.mlp-bbox{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.mlp-num{width:100%;box-sizing:border-box;border:1px solid #343b47;background:#121519;color:#e2e5ea;
  border-radius:6px;padding:5px 6px;font:12px ui-monospace,SFMono-Regular,Menlo,monospace;
  text-align:center;outline:none;transition:border-color .12s,box-shadow .12s}
.mlp-num:focus{border-color:#4a9eff;box-shadow:0 0 0 2px rgba(74,158,255,.18)}
.mlp-num-cell small{display:block;margin-bottom:2px;text-align:center;font-size:10px;color:#6b7380}
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
.mlp-btn-icon{border:0;background:transparent;color:#8b93a1;padding:2px 6px;font-size:14px}
.mlp-btn-icon:hover{color:#ff8a8a;background:transparent;border:0}
.mlp-color{display:inline-flex;align-items:center;gap:2px}
.mlp-swatch{-webkit-appearance:none;appearance:none;width:22px;height:18px;padding:0;border:1px solid #3a414c;
  border-radius:4px;background:none;cursor:pointer}
.mlp-swatch::-webkit-color-swatch-wrapper{padding:0}
.mlp-swatch::-webkit-color-swatch{border:0;border-radius:3px}
.mlp-swatch::-moz-color-swatch{border:0;border-radius:3px}
.mlp-toolbar{display:flex;align-items:center;gap:6px;margin:2px 0}
.mlp-count{margin-left:auto;color:#6b7380;font-size:11px}
.mlp-hint{color:#6b7380;font-size:11px;padding:0 2px 4px;margin-top:-2px}
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

function colorOf(item) {
  return item.color || LABEL_COLORS[item.label] || FALLBACK_COLOR;
}

function createEditor(node) {
  const layoutWidget = node.widgets?.find((widget) => widget.name === LAYOUT_WIDGET);
  if (!layoutWidget) return null;
  if (typeof node.addDOMWidget !== "function") {
    console.warn("[moss-layoutPrompt] this ComfyUI frontend has no DOM widget support");
    return null;
  }
  ensureStyle();

  const sizeWidgets = {};
  for (const name of SIZE_WIDGETS) {
    sizeWidgets[name] = node.widgets?.find((widget) => widget.name === name);
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

  const canvas = h("canvas", { class: "mlp-canvas" });
  const context = canvas.getContext("2d");
  const stage = h("div", { class: "mlp-stage" }, [canvas]);
  const list = h("div", { class: "mlp-list" });
  const previewBody = h("textarea", {
    class: "mlp-preview-body",
    readonly: "readonly",
    spellcheck: "false",
    onkeydown: (event) => event.stopPropagation(),
  });
  const preview = h("div", { class: "mlp-preview" }, [
    h("div", { class: "mlp-preview-head" }, [
      h("span", { class: "mlp-title", text: "编译结果预览" }),
      h("span", { class: "mlp-spacer" }),
      h("span", { class: "mlp-count", text: "只读 · 与节点输出一致" }),
    ]),
    previewBody,
  ]);
  const side = h("div", { class: "mlp-side" }, [list, preview]);
  const root = h("div", { class: "mlp-root" }, [stage, side]);

  node.addDOMWidget("layout_editor", "layout", root, {
    serialize: false,
    hideOnZoom: false,
    getMinHeight: () => EDITOR_MIN_HEIGHT,
  });

  layoutWidget.hidden = true;
  layoutWidget.computeSize = () => [0, -4];

  function fitBox(box) {
    const x1 = Math.min(Math.max(Math.round(box[0]), 0), state.width - MIN_BOX);
    const y1 = Math.min(Math.max(Math.round(box[1]), 0), state.height - MIN_BOX);
    const x2 = Math.min(Math.max(Math.round(box[2]), x1 + MIN_BOX), state.width);
    const y2 = Math.min(Math.max(Math.round(box[3]), y1 + MIN_BOX), state.height);
    return [x1, y1, x2, y2];
  }

  function sizeValue(name, fallback) {
    const value = Number(sizeWidgets[name]?.value);
    if (Number.isFinite(value) && value >= MIN_SIZE) return Math.round(value);
    return fallback ?? DEFAULT_SIZE;
  }

  function writeSize(name, value) {
    const widget = sizeWidgets[name];
    if (widget && Number(widget.value) !== value) widget.value = value;
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
      bbox: fitBox(box),
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
    writeSize("width", state.width);
    writeSize("height", state.height);
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

  function compiledPrompt() {
    const draft = buildDraft();
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
    layoutWidget.value = JSON.stringify(buildDraft());
    previewBody.value = compiledPrompt();
  }

  function load() {
    let draft = null;
    const raw = layoutWidget.value;
    if (typeof raw === "string" && raw.trim()) {
      try {
        draft = JSON.parse(raw);
      } catch (error) {
        console.warn("[moss-layoutPrompt] layout widget is not valid JSON", error);
      }
    }
    applyDraft(draft);
  }

  function writeBboxInputs(index) {
    const card = cards[index];
    const item = state.items[index];
    if (!card || !item) return;
    card.inputs.forEach((input, position) => {
      if (document.activeElement !== input) input.value = String(item.bbox[position]);
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
    const inputs = names.map((name, position) => {
      const input = h("input", {
        class: "mlp-num",
        type: "number",
        step: "1",
        oninput: () => {
          const values = inputs.map((element) => (element.value.trim() === "" ? NaN : Number(element.value)));
          if (values.some((value) => !Number.isFinite(value))) return;
          item.bbox = fitBox(values);
          draw();
          sync();
        },
        onchange: () => {
          writeBboxInputs(index);
          sync();
        },
      });
      return h("label", { class: "mlp-num-cell" }, [h("small", { text: name }), input]);
    });
    const controls = inputs.map((cell) => cell.querySelector("input"));
    controls.forEach((input, position) => {
      input.value = String(item.bbox[position]);
    });
    return { element: h("div", { class: "mlp-bbox" }, inputs), inputs: controls };
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
        title: "删除此框",
        text: "✕",
        onclick: () => {
          state.items.splice(index, 1);
          selection = -1;
          render();
          sync();
          draw();
        },
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
    children.push(field("位置 · 画布像素坐标", bbox.element));

    const element = h("div", {
      class: index === selection ? "mlp-card is-active" : "mlp-card",
      onpointerdown: () => {
        if (selection !== index) selectIndex(index);
      },
    }, children);
    cards[index] = { element, inputs: bbox.inputs };
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
      h("span", { class: "mlp-count", text: `${state.items.length} 个框` }),
    ]);
  }

  function render() {
    cards = [];
    const rows = state.items.length
      ? state.items.map(itemCard)
      : [h("div", { class: "mlp-empty", text: "在左侧画布空白处拖动即可新建框" })];
    list.replaceChildren(
      summaryCard(),
      toolbar(),
      ...rows,
      h("div", {
        class: "mlp-hint",
        text: "空白处拖动新建框 · 框内拖动移动 · 悬停后拖右下角圆点缩放",
      }),
    );
    list.querySelectorAll(".mlp-textarea").forEach(autosize);
    previewBody.value = compiledPrompt();
  }

  function addItem(box) {
    state.items.push({ label: "object", caption: "", text: "", bbox: fitBox(box) });
    selection = state.items.length - 1;
    render();
    sync();
    draw();
    cards[selection]?.element.scrollIntoView({ block: "nearest" });
    cards[selection]?.element.querySelector("textarea")?.focus();
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

    if (width > 16 && height > 16) {
      context.beginPath();
      context.arc(left + 10, top + 10, 8, 0, Math.PI * 2);
      context.fillStyle = color;
      context.fill();
      context.fillStyle = "#101318";
      context.font = "bold 10px ui-sans-serif, system-ui, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(String(index + 1), left + 10, top + 10.5);
    }

    const label = item.label === "text" && item.text ? item.text : item.caption;
    if (label && width > 46 && height > 30) {
      context.save();
      context.beginPath();
      context.rect(left, top, width, height);
      context.clip();
      context.fillStyle = "rgba(235, 240, 246, 0.85)";
      context.font = "11px ui-sans-serif, system-ui, sans-serif";
      context.textAlign = "left";
      context.textBaseline = "top";
      context.fillText(truncate(context, label.split("\n")[0], width - 12), left + 6, top + 20);
      context.restore();
    }

    if (active || index === hover) {
      context.beginPath();
      context.arc(left + width, top + height, 5, 0, Math.PI * 2);
      context.fillStyle = "#f2f4f7";
      context.fill();
      context.lineWidth = 1.5;
      context.strokeStyle = rgba(color, 0.9);
      context.stroke();
    }
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

  function handleBoxAt(point) {
    const radius = 12 / (view.scale * screenScale());
    for (let index = state.items.length - 1; index >= 0; index -= 1) {
      const box = state.items[index].bbox;
      if (Math.abs(point.x - box[2]) <= radius && Math.abs(point.y - box[3]) <= radius) return index;
    }
    return -1;
  }

  function itemAt(point) {
    for (let index = state.items.length - 1; index >= 0; index -= 1) {
      const [x1, y1, x2, y2] = state.items[index].bbox;
      if (point.x >= x1 && point.x <= x2 && point.y >= y1 && point.y <= y2) return index;
    }
    return -1;
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.isPrimary === false) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (error) {
      console.warn("[moss-layoutPrompt] pointer capture unavailable, dragging via window events", error);
    }
    const point = toImage(event);
    const handle = handleBoxAt(point);
    if (handle >= 0) {
      selectIndex(handle);
      hover = handle;
      drag = { mode: "resize", index: handle, box: state.items[handle].bbox.slice() };
      return;
    }
    const index = itemAt(point);
    if (index >= 0) {
      selectIndex(index);
      drag = { mode: "move", index, box: state.items[index].bbox.slice(), origin: point };
      return;
    }
    selection = -1;
    hover = -1;
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
      state.items[drag.index].bbox = [x, y, x + width, y + height];
      writeBboxInputs(drag.index);
      draw();
      return;
    }

    if (drag.mode === "resize") {
      const [x1, y1] = drag.box;
      const x2 = Math.min(Math.max(Math.round(point.x), x1 + MIN_BOX), state.width);
      const y2 = Math.min(Math.max(Math.round(point.y), y1 + MIN_BOX), state.height);
      state.items[drag.index].bbox = [x1, y1, x2, y2];
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

  canvas.addEventListener("pointermove", (event) => {
    const point = toImage(event);
    if (!drag) {
      const handle = handleBoxAt(point);
      if (handle !== hover) {
        hover = handle;
        draw();
      }
      canvas.style.cursor = handle >= 0 ? "nwse-resize" : itemAt(point) >= 0 ? "move" : "crosshair";
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    applyDrag(point);
  });

  canvas.addEventListener("pointerleave", () => {
    if (drag || hover < 0) return;
    hover = -1;
    draw();
  });

  function endDrag() {
    if (!drag) return;
    const created = drag.mode === "create" && drag.index >= 0;
    const changed = created || drag.mode === "move" || drag.mode === "resize";
    drag = null;
    if (created) {
      render();
      list.scrollTop = list.scrollHeight;
    }
    if (changed) sync();
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

  for (const name of SIZE_WIDGETS) {
    const sizeWidget = sizeWidgets[name];
    if (!sizeWidget) continue;
    const original = sizeWidget.callback;
    sizeWidget.callback = function (...args) {
      const result = original?.apply(this, args);
      const value = Math.round(Number(sizeWidget.value));
      if (Number.isFinite(value) && value >= MIN_SIZE) {
        state[name] = value;
        for (const item of state.items) item.bbox = fitBox(item.bbox);
        render();
        sync();
        draw();
      }
      return result;
    };
  }

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
    if (node.comfyClass !== NODE_CLASS && node.type !== NODE_CLASS) return;
    if (node.__mossLayoutEditor) return;
    try {
      node.__mossLayoutEditor = createEditor(node);
    } catch (error) {
      console.error("[moss-layoutPrompt] failed to build the layout editor", error);
    }
  },
});
