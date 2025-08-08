class ProgressTracker:
    def __init__(self):
        self.progress_data = []

    def track_progress(self, step_description, status):
        """
        Track the progress of the evolution process.

        :param step_description: Description of the step taken.
        :param status: Status of the step (e.g., 'completed', 'in progress').
        """
        self.progress_data.append({
            'step': step_description,
            'status': status
        })

    def generate_progress_report(self):
        """
        Generate a report of the tracked progress.

        :return: A formatted string report of the progress.
        """
        report = "Progress Report:\n"
        for entry in self.progress_data:
            report += f"Step: {entry['step']}, Status: {entry['status']}\n"
        return report.strip()