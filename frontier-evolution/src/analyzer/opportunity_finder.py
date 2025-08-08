class OpportunityFinder:
    def __init__(self, code_parser, issue_detector):
        self.code_parser = code_parser
        self.issue_detector = issue_detector

    def find_opportunities(self, code_files):
        opportunities = []
        for file in code_files:
            metrics = self.code_parser.extract_metrics(file)
            issues = self.issue_detector.detect_issues(file)
            if metrics['complexity'] > 5 or issues:
                opportunities.append({
                    'file': file,
                    'metrics': metrics,
                    'issues': issues
                })
        return opportunities

    def suggest_upgrades(self, opportunities):
        suggestions = []
        for opportunity in opportunities:
            if opportunity['metrics']['complexity'] > 10:
                suggestions.append({
                    'file': opportunity['file'],
                    'suggestion': 'Refactor for better readability and maintainability.'
                })
            if opportunity['issues']:
                suggestions.append({
                    'file': opportunity['file'],
                    'suggestion': 'Address the identified issues to improve code quality.'
                })
        return suggestions