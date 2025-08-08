class CommitHandler:
    def __init__(self, repo_manager):
        self.repo_manager = repo_manager

    def create_commit(self, message):
        """
        Create a git commit with the provided message.
        """
        self.repo_manager.run_command("git add .")
        self.repo_manager.run_command(f"git commit -m '{message}'")

    def push_changes(self):
        """
        Push the committed changes to the remote repository.
        """
        self.repo_manager.run_command("git push")