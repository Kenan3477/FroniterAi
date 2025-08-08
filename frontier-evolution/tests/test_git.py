import unittest
from src.git.repo_manager import RepoManager
from src.git.commit_handler import CommitHandler

class TestRepoManager(unittest.TestCase):

    def setUp(self):
        self.repo_manager = RepoManager()

    def test_clone_repo(self):
        # Assuming clone_repo method returns a success message
        result = self.repo_manager.clone_repo('https://github.com/user/repo.git')
        self.assertEqual(result, 'Repository cloned successfully.')

    def test_fetch_updates(self):
        # Assuming fetch_updates method returns a success message
        result = self.repo_manager.fetch_updates()
        self.assertEqual(result, 'Updates fetched successfully.')

class TestCommitHandler(unittest.TestCase):

    def setUp(self):
        self.commit_handler = CommitHandler()

    def test_create_commit(self):
        # Assuming create_commit method returns a success message
        result = self.commit_handler.create_commit('Test commit message')
        self.assertEqual(result, 'Commit created successfully.')

    def test_push_changes(self):
        # Assuming push_changes method returns a success message
        result = self.commit_handler.push_changes()
        self.assertEqual(result, 'Changes pushed successfully.')

if __name__ == '__main__':
    unittest.main()