# main.py

from analyzer.code_parser import CodeParser
from analyzer.issue_detector import IssueDetector
from analyzer.opportunity_finder import OpportunityFinder
from evolution.evolution_engine import EvolutionEngine
from git.repo_manager import RepoManager
from database.evolution_db import EvolutionDB
from dashboard.matrix_ui import MatrixUI
from documentation.progress_tracker import ProgressTracker
from documentation.benefits_analyzer import BenefitsAnalyzer

def main():
    # Initialize components
    repo_manager = RepoManager()
    code_parser = CodeParser()
    issue_detector = IssueDetector()
    opportunity_finder = OpportunityFinder()
    evolution_engine = EvolutionEngine()
    evolution_db = EvolutionDB()
    matrix_ui = MatrixUI()
    progress_tracker = ProgressTracker()
    benefits_analyzer = BenefitsAnalyzer()

    # Clone the repository
    repo_manager.clone_repo()

    # Start the evolution process
    evolution_engine.start_evolution()

    # Parse code and extract metrics
    code_files = repo_manager.fetch_updates()
    for file in code_files:
        metrics = code_parser.parse_code(file)
        issues = issue_detector.detect_issues(file)
        opportunities = opportunity_finder.find_opportunities(file)

        # Document the findings
        progress_tracker.track_progress(file, metrics, issues, opportunities)

    # Analyze benefits of implemented upgrades
    benefits_report = benefits_analyzer.analyze_benefits()
    print(benefits_report)

    # Render the dashboard
    matrix_ui.render_dashboard()

if __name__ == "__main__":
    main()