class IssueDetector:
    def __init__(self, code_parser):
        self.code_parser = code_parser

    def detect_issues(self, code_files):
        issues = {}
        for file in code_files:
            metrics = self.code_parser.parse_code(file)
            # Example logic to identify issues based on metrics
            if metrics['complexity'] > 10:
                issues[file] = 'High complexity detected'
            if metrics['test_coverage'] < 70:
                issues[file] = 'Low test coverage'
        return issues

    def generate_report(self, issues):
        report = "Issue Detection Report\n"
        report += "=" * 30 + "\n"
        for file, issue in issues.items():
            report += f"{file}: {issue}\n"
        return report