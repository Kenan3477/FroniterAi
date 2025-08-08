class RepoManager:
    def __init__(self, repo_url, local_path):
        self.repo_url = repo_url
        self.local_path = local_path

    def clone_repo(self):
        import subprocess
        try:
            subprocess.run(['git', 'clone', self.repo_url, self.local_path], check=True)
            print(f'Repository cloned to {self.local_path}')
        except subprocess.CalledProcessError as e:
            print(f'Error cloning repository: {e}')

    def fetch_updates(self):
        import subprocess
        try:
            subprocess.run(['git', '-C', self.local_path, 'fetch'], check=True)
            print('Updates fetched from the remote repository')
        except subprocess.CalledProcessError as e:
            print(f'Error fetching updates: {e}')