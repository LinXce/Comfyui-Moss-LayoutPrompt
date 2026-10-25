# MOSS Layout Prompt for ComfyUI

[English](README.md) | 简体中文

MOSS-Image 的 JSON Layout 提示词画布编辑器。在画布上为每个元素画一个框，
右侧每个框一行编辑，节点输出编译后的提示词以及工作流应使用的画布尺寸。

本插件提供两个节点：稳定版 **MOSS Layout Prompt**，以及在其之上增加外部草稿输入的
**MOSS Layout Prompt (Advance)**（**实验阶段**）。

![MOSS Layout Prompt 节点：左侧画布上的每个框都带有一条编号标签条（编号 + caption），右侧是 meta 标签、每个框一行的编辑卡片，以及底部只读的编译结果预览。](assets/editor.png)

## 安装

本插件独立成包。把本目录放到 `ComfyUI/custom_nodes/` 下，使其位于
`ComfyUI/custom_nodes/moss-layoutPrompt-LP/`，重启 ComfyUI 即可。它只使用 ComfyUI
自身提供的依赖，自带节点与前端扩展，不与其他插件共享代码。

自带的示例工作流通过 MOSS-Image 节点加载模型，因此该工作流还需要另行安装
[MOSS-Image](https://github.com/OpenMOSS/MOSS-Image) 节点包。

## 工作流

1. 下载 [moss-layout-prompt.json](example_workflows/moss-layout-prompt.json)，拖入 ComfyUI。
2. 在 **MOSS-Image HF Loader** 中填写本地模型目录。
3. 在画布上绘制布局，点击 **Run** 生成图片。

工作流已把 `prompt` 接到 `CLIPTextEncode`，把 `width`/`height` 接到
`EmptyFlux2LatentImage`，因此布局画布与生成图片的尺寸始终一致。

## 节点

两个节点都在 `moss-layoutPrompt-LP` 分类下，共用同一个画布编辑器，输出也完全相同。

> **实验阶段：**`MOSS Layout Prompt (Advance)` 仍在开发中，输入与行为可能随版本变化；
> 需要长期稳定的工作流请继续使用 `MOSS Layout Prompt`。两个节点总是一起发布，同一份
> 草稿产出的提示词完全一致。

### MOSS Layout Prompt (Advance) — 实验阶段

节点 ID `MOSSImageLayoutPromptAdvance`。原节点再加上外部草稿输入：`source` 接受草稿
JSON、已编译提示词或旧版 scene 提示词，并载入画布。`source` 与画布双向同步：在
`source` 里输入/粘贴会载入画布，画布上的任何修改也会把当前草稿写回 `source`。输入框带
`source` 标签条，标签条是按钮，点击会在弹窗里显示完整内容（输入框本身只显示两行）。

![source 弹窗：完整内容显示在大号只读输入框中，可复制或关闭，并提示 source 与画布双向同步。](assets/source-dialog.png)

| 输入 | |
| --- | --- |
| `width`、`height` | 画布与图片尺寸，须为 16 的正整数倍。 |
| `source` | **实验阶段。**外部草稿文本。粘贴草稿 JSON（可夹杂无关文字，也可以是已编译的 `abs_centralized`/`yxyx`）后会载入画布；画布上的修改也会把当前草稿同步写回这里。没有编辑器时直接编译，但仅当画布没有框。 |
| `layout` | 草稿 JSON。编辑器会隐藏它；画布不可用时可直接手写。 |

### MOSS Layout Prompt — 稳定版

节点 ID `MOSSImageLayoutPrompt`。原节点保留，已保存的工作流仍可正常加载。画布编辑器、
输出、`width`/`height`/`layout` 输入都与上面相同，只是没有 `source`。它的 `layout` 也接受
MOSS-Image 旧版 scene schema（`scene_type` / `gen_brief` / `elements`），会按节点的画布尺寸转换。

| 输出（两个节点相同） | |
| --- | --- |
| `prompt` | 供 `CLIPTextEncode` 使用的编译后提示词。 |
| `width`、`height` | 供潜空间节点使用的画布尺寸。 |

## 编辑器

- 在画布空白处拖动新建框，框内拖动移动，拖右下角圆点缩放（悬停该框或选中它时
  显示圆点）；也可以在行内直接输入 `x1, y1, x2, y2`。
- 框重叠时，每个框左上角的编号标签条是最可靠的抓手：先说编号，随后按框的宽度显示
  尽可能多的 caption（文字框显示要渲染的 text），最后是四向移动图标。标签条画在所有
  框之上，整条底色区域都可以点击——编号、文字或图标——点它就选中该框，从它拖就是移动
  该框；框越窄显示的文字越少。在重叠区同一位置重复点击会在堆叠的框之间轮换；如果其中
  一个框已经选中，第一次点击不会把它换掉，所以拖动不会被意外抢走。
- 每个框的坐标显示两行：上一行是 `x1, y1, x2, y2` 像素值，下一行是同样四条边占画布的
  百分比。两行都能直接输入，画布随输入即时变化；数值会被夹在画布内，并保证相邻两边
  至少相差 8px。
- `对齐到 8` 把所有框的四条边向上取整到 8 的整数倍，宽高因此也落在 8 的网格上，
  便于与 latent 网格对齐；取整后仍限制在画布内，也不会塌成 0 面积。
- 右侧编辑总提示词，以及每个框一行：`label`（`object`、`character`、`text`）、
  `caption`（元素外观）和文字元素需要渲染的 `text`。`caption`、`text` 与总提示词
  都是多行输入框，会随内容自动增高。
- `meta` 标签是胶囊：输入后回车或逗号添加；点击胶囊文字即可就地编辑，点击编辑框以外的任意位置
  （或回车）完成编辑，`Esc` 取消，`×` 移除。
- `添加框` 新建框，`✕` 删除该框，`清空` 清空画布。选中框后按 `Delete` 或退格键也会
  删除该框；光标在输入框内时保持正常编辑，且编辑器获得焦点时这两个键不会误删整个节点。
- `全部清空`（红色，仅 Advance 节点）清空**所有内容**：全部框、总提示词、`meta` 标签和
  `source` 外部输入；画布尺寸保留。
- `从文件导入` 从磁盘载入草稿 JSON 文件并放进画布。文件里的 JSON 可以夹杂无关文字或
  被代码块包裹，会自动提取出对象；若导入的是已编译的 `abs_centralized`/`yxyx` 提示词或
  旧版 `scene_type`/`elements` 提示词，会按节点的 `width`/`height` 反解成草稿。转换后如果
  框超出画布，会围绕画布中心等比缩放到画布内。
- 面板底部固定一个只读的编译结果预览，实时显示节点即将输出的提示词。

## 草稿与编译后的提示词

编辑器保存草稿，节点输出编译后的提示词。草稿框是画布左上角原点的
`[x1, y1, x2, y2]` 像素坐标：

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

执行时节点会把每条件减去画布中心并重排为 `yxyx`，得到 MOSS-Image 需要的
`abs_centralized` 提示词。没有框的草稿会退化为其 summary caption，
因此未编辑的节点等同于普通文本提示词。

校验只针对草稿的结构：画布尺寸、框的几何、`label` 取值和字段名。caption 属于内容，
总提示词或某个框的 caption 留空是允许的，节点照常运行。

草稿也可以通过 `source` 输入传入：粘贴或导入后会载入画布，之后以画布为准继续编辑；
如果是已编译的 `abs_centralized`/`yxyx` 提示词，会先用节点的 `width`/`height` 反解回草稿。
没有编辑器时 `source` 会被直接编译，但仅当画布上没有框。

编辑或粘贴 `source` 会**立即重新应用**（即使文本内容没变，也会重新载入以替换画布）；
反过来，编辑器会把画布的最新草稿同步写回 `source`（在输入框内打字时不会打扰你，离开
输入框后自动整理成标准草稿）。因此 `source` 中始终是可直接编译的草稿：旧的粘贴内容、
已编译提示词或旧版 scene 提示词都会先转换再写回，运行节点也不会再用过期内容覆盖你在
画布上的修改。刷新界面或执行生成都不会重放 `source`：只要画布上有框，就以画布草稿为准。

字段规范、坐标系与构图要求见 MOSS-Image 仓库中的
[references/layout.md](https://github.com/OpenMOSS/MOSS-Image/blob/main/skills/moss-image-prompt-enhancer/references/layout.md)
与[用户指南](https://github.com/OpenMOSS/MOSS-Image/blob/main/USERGUIDE_ZH.md)。

编辑器需要支持 DOM widget 的 ComfyUI 前端。不支持时节点仍可运行，
直接手写 `layout` 文本框即可。

## 许可

Apache-2.0，见 [LICENSE](LICENSE)。
