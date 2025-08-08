class MatrixUI:
    def __init__(self):
        self.metrics_display = MetricsDisplay()
        self.activity_feed = ActivityFeed()

    def render_dashboard(self):
        # Code to render the dashboard UI
        self.metrics_display.show_metrics()
        self.activity_feed.display_feed()

    def update_metrics_display(self, metrics):
        # Code to update the metrics display with new data
        self.metrics_display.refresh_display(metrics)