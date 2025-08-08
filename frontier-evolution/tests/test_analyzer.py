import unittest
from src.analyzer.code_parser import CodeParser
from src.analyzer.issue_detector import IssueDetector
from src.analyzer.opportunity_finder import OpportunityFinder

class TestAnalyzer(unittest.TestCase):

    def setUp(self):
        self.code_parser = CodeParser()
        self.issue_detector = IssueDetector()
        self.opportunity_finder = OpportunityFinder()

    def test_parse_code(self):
        code = "def example_function(): pass"
        metrics = self.code_parser.parse_code(code)
        self.assertIsInstance(metrics, dict)
        self.assertIn('lines_of_code', metrics)

    def test_extract_metrics(self):
        code = "def example_function(): pass"
        metrics = self.code_parser.extract_metrics(code)
        self.assertGreater(metrics['lines_of_code'], 0)

    def test_detect_issues(self):
        code = "def example_function(): pass"  # Example code with no issues
        issues = self.issue_detector.detect_issues(code)
        self.assertEqual(issues, [])

    def test_generate_report(self):
        code = "def example_function(): pass"
        issues = self.issue_detector.detect_issues(code)
        report = self.issue_detector.generate_report(issues)
        self.assertIn('Report', report)

    def test_find_opportunities(self):
        code = "def example_function(): pass"
        opportunities = self.opportunity_finder.find_opportunities(code)
        self.assertIsInstance(opportunities, list)

    def test_suggest_upgrades(self):
        code = "def example_function(): pass"
        suggestions = self.opportunity_finder.suggest_upgrades(code)
        self.assertIsInstance(suggestions, list)

if __name__ == '__main__':
    unittest.main()