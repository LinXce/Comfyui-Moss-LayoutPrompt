# MOSS Layout Prompt for ComfyUI

[English](README.md) | 简体中文

MOSS-Image 的 JSON Layout 提示词画布编辑器。在画布上为每个元素画一个框，
右侧每个框一行编辑，节点输出编译后的提示词以及工作流应使用的画布尺寸。

![MOSS Layout Prompt 节点：左侧是画有两个框的画布，右侧是 meta 标签、每个框一行的编辑卡片，以及底部只读的编译结果预览。](assets/editor.png)

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

**MOSS Layout Prompt** — 节点 ID `MOSSImageLayoutPrompt`，分类 `moss-layoutPrompt-LP`。
节点 ID 沿用旧版本，已保存的工作流仍可正常加载。

| 输入 | |
| --- | --- |
| `width`、`height` | 画布与图片尺寸，须为 16 的正整数倍。 |
| `layout` | 草稿 JSON。编辑器会隐藏它；画布不可用时可直接手写。 |

| 输出 | |
| --- | --- |
| `prompt` | 供 `CLIPTextEncode` 使用的编译后提示词。 |
| `width`、`height` | 供潜空间节点使用的画布尺寸。 |

## 编辑器

- 在画布空白处拖动新建框，框内拖动移动，拖右下角圆点缩放（悬停该框或选中它时
  显示圆点）；也可以在行内直接输入 `x1, y1, x2, y2`。
- 右侧编辑总提示词，以及每个框一行：`label`（`object`、`character`、`text`）、
  `caption`（元素外观）和文字元素需要渲染的 `text`。`caption`、`text` 与总提示词
  都是多行输入框，会随内容自动增高。
- `meta` 标签是胶囊：输入后回车或逗号添加；点击胶囊文字即可就地编辑，点击编辑框以外的任意位置
  （或回车）完成编辑，`Esc` 取消，`×` 移除。
- `添加框` 新建框，`✕` 删除该框，`清空` 清空画布。
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

字段规范、坐标系与构图要求见 MOSS-Image 仓库中的
[references/layout.md](https://github.com/OpenMOSS/MOSS-Image/blob/main/skills/moss-image-prompt-enhancer/references/layout.md)
与[用户指南](https://github.com/OpenMOSS/MOSS-Image/blob/main/USERGUIDE_ZH.md)。

编辑器需要支持 DOM widget 的 ComfyUI 前端。不支持时节点仍可运行，
直接手写 `layout` 文本框即可。

## 许可

Apache-2.0，见 [LICENSE](LICENSE)。
