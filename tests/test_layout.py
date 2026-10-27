import json
import unittest

from layout import compile_layout


class LayoutCompilerTest(unittest.TestCase):
    def test_near_integer_edges_match_moss_reference_compiler(self):
        draft = {
            "width": 1536,
            "height": 1024,
            "bbox_coord_space": "abs",
            "bbox_format": "xyxy",
            "summary": {"caption": "A poster."},
            "items": [{
                "label": "text",
                "caption": "Large title.",
                "text": "EXPLORE",
                "bbox": [927.9999999999, 271.9999999999,
                         1408.0000000001, 448.0000000001],
            }],
        }
        prompt, width, height = compile_layout(draft)
        self.assertEqual((width, height), (1536, 1024))
        self.assertEqual(json.loads(prompt)["items"][0]["bbox"],
                         [-240, 160, -64, 640])

    def test_fractional_edges_still_enclose_visible_area(self):
        draft = {
            "width": 1536,
            "height": 1024,
            "bbox_coord_space": "abs",
            "bbox_format": "xyxy",
            "summary": {"caption": "A poster."},
            "items": [{
                "label": "object",
                "caption": "A circle.",
                "bbox": [927.9999999, 271.9999999,
                         1408.0000001, 448.0000001],
            }],
        }
        prompt, _, _ = compile_layout(draft)
        self.assertEqual(json.loads(prompt)["items"][0]["bbox"],
                         [-241, 159, -63, 641])


if __name__ == "__main__":
    unittest.main()
