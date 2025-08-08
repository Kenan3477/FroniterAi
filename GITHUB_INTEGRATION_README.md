# GitHub Integration for Code Analysis on Railway

This document outlines how to use the GitHub repository integration for code analysis in the Railway deployment environment.

## Overview

The GitHub integration allows you to analyze any GitHub repository directly through the Railway-deployed Frontier AI system. This feature enables:

1. **Remote Repository Analysis**: Analyze any public GitHub repository
2. **Private Repository Access**: Access private repositories using a GitHub token
3. **Railway-Optimized Storage**: Results stored in Railway-compatible paths
4. **Commit History Analysis**: Review recent changes in the repository
5. **Repository Metrics**: Get insights into repository activity and statistics

## API Endpoints

### 1. GitHub Repository Analysis

```
POST /api/github-analysis
```

This endpoint allows you to analyze a GitHub repository directly.

**Request Body:**

```json
{
  "repo": "username/repository",
  "token": "your_github_token",  // Optional for private repos
  "branch": "main"  // Optional, defaults to main
}
```

**Response:**

```json
{
  "success": true,
  "repository": "username/repository",
  "analysis_timestamp": "20230827_152514",
  "repository_info": {
    "name": "repository",
    "description": "Repository description",
    "stars": 42,
    "forks": 12,
    "created_at": "2023-01-01T12:00:00Z",
    "updated_at": "2023-08-25T15:30:00Z",
    "default_branch": "main"
  },
  "summary": {
    "files_analyzed": 25,
    "total_lines": 5432,
    "total_issues": 12,
    "total_opportunities": 8
  },
  "report_path": "/tmp/frontier_analysis/username_repository_20230827_152514_analysis.md",
  "data_path": "/tmp/frontier_analysis/username_repository_20230827_152514_analysis.json"
}
```

### 2. Standard Code Analysis with GitHub Support

```
POST /api/run-code-analysis
```

This endpoint has been enhanced to optionally accept GitHub repository information.

**Request Body:**

```json
{
  "github_repo": "username/repository",  // Optional
  "github_token": "your_github_token"    // Optional
}
```

## Environment Variables

The following environment variables can be set in Railway:

- `GITHUB_TOKEN`: Your GitHub personal access token for private repository access
- `RAILWAY_ENVIRONMENT`: Set to "production" by default in the Dockerfile

## Testing the Integration

You can test the GitHub integration using the included test script:

```bash
python test_github_railway_integration.py
```

This script will:
1. Test Railway environment detection
2. Clone a test repository
3. Run a full analysis
4. Generate a report
5. Test commit history retrieval

## Railway Deployment Notes

When deployed on Railway:

1. Analysis results are stored in `/tmp/frontier_analysis`
2. The system automatically detects the Railway environment
3. Git is pre-installed in the Docker container for repository cloning
4. All necessary Python dependencies are installed
