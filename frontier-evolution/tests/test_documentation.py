import unittest
from src.documentation.progress_tracker import ProgressTracker
from src.documentation.benefits_analyzer import BenefitsAnalyzer

class TestDocumentation(unittest.TestCase):

    def setUp(self):
        self.progress_tracker = ProgressTracker()
        self.benefits_analyzer = BenefitsAnalyzer()

    def test_track_progress(self):
        # Test tracking progress
        self.progress_tracker.track_progress("Test evolution step")
        report = self.progress_tracker.generate_progress_report()
        self.assertIn("Test evolution step", report)

    def test_analyze_benefits(self):
        # Test analyzing benefits
        benefits = self.benefits_analyzer.analyze_benefits("Test upgrade")
        self.assertIsInstance(benefits, dict)
        self.assertIn("upgrade", benefits)

    def test_generate_benefits_report(self):
        # Test generating benefits report
        self.benefits_analyzer.analyze_benefits("Test upgrade")
        report = self.benefits_analyzer.generate_benefits_report()
        self.assertIn("Benefits Report", report)

if __name__ == '__main__':
    unittest.main()