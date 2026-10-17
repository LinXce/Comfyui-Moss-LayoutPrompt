from comfy_api.latest import ComfyExtension, io

from .layout import DEFAULT_SIZE, SIZE_MULTIPLE, compile_layout, draft_has_boxes

CATEGORY = "moss-layoutPrompt-LP"


def _size_inputs():
    return [
        io.Int.Input("width", default=DEFAULT_SIZE, min=SIZE_MULTIPLE, max=SIZE_MULTIPLE * 1024,
                     step=SIZE_MULTIPLE,
                     tooltip="Canvas and image width in pixels, a multiple of 16."),
        io.Int.Input("height", default=DEFAULT_SIZE, min=SIZE_MULTIPLE, max=SIZE_MULTIPLE * 1024,
                     step=SIZE_MULTIPLE,
                     tooltip="Canvas and image height in pixels, a multiple of 16."),
    ]


def _source_input():
    return io.String.Input("source", multiline=True, default="",
                           tooltip="External draft text. Paste a draft JSON, or a legacy MOSS-Image "
                                   "scene prompt, even when it is wrapped in unrelated prose. "
                                   "Used when the canvas has no boxes.")


def _layout_input():
    return io.String.Input("layout", multiline=True, default="",
                           tooltip="Layout draft JSON, written by the canvas editor.")


def _outputs():
    return [io.String.Output("prompt"), io.Int.Output("width"), io.Int.Output("height")]


class MOSSImageLayoutPrompt(io.ComfyNode):
    """Original node, kept as it was so saved workflows keep loading."""

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="MOSSImageLayoutPrompt",
            display_name="MOSS Layout Prompt",
            category=CATEGORY,
            description="Draw one box per element and edit the summary prompt, then output the "
                        "compiled MOSS-Image JSON Layout prompt with its canvas size.",
            inputs=[*_size_inputs(), _layout_input()],
            outputs=_outputs(),
        )

    @classmethod
    def execute(cls, width, height, layout):
        prompt, out_width, out_height = compile_layout(layout, width, height)
        return io.NodeOutput(prompt, out_width, out_height)


class MOSSImageLayoutPromptAdvance(io.ComfyNode):
    """Canvas editor with draft import and a compiled-prompt preview."""

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="MOSSImageLayoutPromptAdvance",
            display_name="MOSS Layout Prompt (Advance)",
            category=CATEGORY,
            description="Canvas editor for the MOSS-Image JSON Layout prompt, with draft import and "
                        "a compiled-prompt preview. Paste or import a draft (a legacy MOSS-Image "
                        "scene prompt is converted), then output the compiled prompt and canvas size.",
            inputs=[*_size_inputs(), _source_input(), _layout_input()],
            outputs=_outputs(),
        )

    @classmethod
    def execute(cls, width, height, source, layout):
        draft = source if source.strip() and not draft_has_boxes(layout) else layout
        prompt, out_width, out_height = compile_layout(draft, width, height)
        return io.NodeOutput(prompt, out_width, out_height)


class MOSSImageLayoutExtension(ComfyExtension):
    async def get_node_list(self):
        return [MOSSImageLayoutPrompt, MOSSImageLayoutPromptAdvance]


async def comfy_entrypoint():
    return MOSSImageLayoutExtension()
