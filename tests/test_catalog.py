import unittest
import json
import os
import sys

class TestOpusMotionCatalog(unittest.TestCase):
    def setUp(self):
        self.root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.styles_path = os.path.join(self.root, 'data', 'styles.json')
        self.prompts_path = os.path.join(self.root, 'data', 'prompts.json')

    def test_styles_json_validity(self):
        self.assertTrue(os.path.exists(self.styles_path), "styles.json should exist")
        with open(self.styles_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        styles = data if isinstance(data, list) else data.get('styles', [])
        self.assertGreater(len(styles), 10, "styles.json should have catalogued styles")
        first = styles[0]
        self.assertIn('slug', first)
        self.assertIn('en', first)

    def test_prompts_json_validity(self):
        self.assertTrue(os.path.exists(self.prompts_path), "prompts.json should exist")
        with open(self.prompts_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        prompts = data if isinstance(data, list) else data.get('prompts', [])
        self.assertGreater(len(prompts), 5, "prompts.json should have prompt records")

if __name__ == '__main__':
    unittest.main()
