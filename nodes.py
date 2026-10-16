from comfy_api.latest import ComfyExtension, io

from .layout import DEFAULT_SIZE, SIZE_MULTIPLE, compile_layout


class MOSSImageLayoutPrompt(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="MOSSImageLayoutPrompt",
            display_name="MOSS Layout Prompt",
            category="moss-layoutPrompt-LP",
            description="Draw one box per element and edit the summary prompt, then output the "
                        "compiled MOSS-Image JSON Layout prompt with its canvas size.",
            inputs=[
                io.Int.Input("width", default=DEFAULT_SIZE, min=SIZE_MULTIPLE,
                             max=SIZE_MULTIPLE * 1024, step=SIZE_MULTIPLE,
                             tooltip="Canvas and image width in pixels, a multiple of 16."),
                io.Int.Input("height", default=DEFAULT_SIZE, min=SIZE_MULTIPLE,
                             max=SIZE_MULTIPLE * 1024, step=SIZE_MULTIPLE,
                             tooltip="Canvas and image height in pixels, a multiple of 16."),
                io.String.Input("layout", multiline=True, default="",
                                tooltip="Layout draft JSON, written by the canvas editor."),
            ],
            outputs=[
                io.String.Output("prompt"),
                io.Int.Output("width"),
                io.Int.Output("height"),
            ],
        )

    @classmethod
    def execute(cls, width, height, layout):
        prompt, out_width, out_height = compile_layout(layout, width, height)
        return io.NodeOutput(prompt, out_width, out_height)


class MOSSImageLayoutExtension(ComfyExtension):
    async def get_node_list(self):
        return [MOSSImageLayoutPrompt]


async def comfy_entrypoint():
    return MOSSImageLayoutExtension()
