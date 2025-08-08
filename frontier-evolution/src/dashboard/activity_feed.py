class ActivityFeed:
    def __init__(self):
        self.activities = []

    def log_activity(self, activity):
        self.activities.append(activity)

    def display_feed(self):
        for activity in self.activities:
            print(activity)