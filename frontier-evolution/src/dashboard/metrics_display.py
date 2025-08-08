class MetricsDisplay:
    def __init__(self):
        self.metrics = {}

    def show_metrics(self):
        # Display the current system metrics
        print("Current System Metrics:")
        for metric, value in self.metrics.items():
            print(f"{metric}: {value}")

    def refresh_display(self, new_metrics):
        # Update the metrics and refresh the display
        self.metrics.update(new_metrics)
        self.show_metrics()