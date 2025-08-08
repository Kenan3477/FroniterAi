# Configuration settings for the Frontier AI project

# Constants
REPO_URL = "https://github.com/yourusername/FrontierAI.git"
EVOLUTION_CYCLE_INTERVAL = 60  # in seconds
METRICS_LOG_INTERVAL = 300  # in seconds

# Database configurations
DATABASE_PATH = "data/databases/"
EVOLUTION_DB_NAME = "evolution.db"
METRICS_DB_NAME = "metrics.db"

# Logging configurations
LOGGING_LEVEL = "INFO"
LOGGING_FORMAT = "%(asctime)s - %(levelname)s - %(message)s"
LOGGING_FILE = "logs/system.log"

# Git configurations
GIT_BRANCH = "main"
COMMIT_MESSAGE_TEMPLATE = "AUTO-EVOLUTION: {description}"

# UI configurations
DASHBOARD_REFRESH_INTERVAL = 5  # in seconds
MATRIX_UI_THEME = "green_terminal"