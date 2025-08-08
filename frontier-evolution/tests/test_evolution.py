import unittest
from src.evolution.code_modifier import CodeModifier
from src.evolution.implementation_generator import ImplementationGenerator
from src.evolution.evolution_engine import EvolutionEngine

class TestEvolution(unittest.TestCase):

    def setUp(self):
        self.code_modifier = CodeModifier()
        self.implementation_generator = ImplementationGenerator()
        self.evolution_engine = EvolutionEngine()

    def test_modify_code(self):
        original_code = "print('Hello, World!')"
        modified_code = self.code_modifier.modify_code(original_code)
        self.assertNotEqual(original_code, modified_code)
        self.assertIn("print('Hello, Universe!')", modified_code)

    def test_generate_implementation_plan(self):
        upgrades = ["Add logging", "Improve error handling"]
        plan = self.implementation_generator.generate_implementation_plan(upgrades)
        self.assertIsInstance(plan, list)
        self.assertGreater(len(plan), 0)

    def test_start_evolution(self):
        result = self.evolution_engine.start_evolution()
        self.assertTrue(result)
        self.assertIsNotNone(self.evolution_engine.track_progress())

    def test_track_progress(self):
        self.evolution_engine.start_evolution()
        progress = self.evolution_engine.track_progress()
        self.assertIsInstance(progress, dict)
        self.assertIn("status", progress)

if __name__ == '__main__':
    unittest.main()