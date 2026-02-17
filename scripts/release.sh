#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: ./scripts/release.sh <major|minor|patch>"
  exit 1
}

[[ $# -ne 1 ]] && usage

bump="$1"
[[ "$bump" != "major" && "$bump" != "minor" && "$bump" != "patch" ]] && usage

# Ensure we're on main with a clean working tree
branch=$(git branch --show-current)
if [[ "$branch" != "main" ]]; then
  echo "Error: must be on main branch (currently on '$branch')"
  exit 1
fi

if [[ -n $(git status --porcelain) ]]; then
  echo "Error: working tree is not clean — commit or stash changes first"
  exit 1
fi

# Read current version
current=$(node -p "require('./package.json').version")
IFS='.' read -r major minor patch <<< "$current"

case "$bump" in
  major) major=$((major + 1)); minor=0; patch=0 ;;
  minor) minor=$((minor + 1)); patch=0 ;;
  patch) patch=$((patch + 1)) ;;
esac

next="${major}.${minor}.${patch}"

echo "Bumping version: $current → $next"

# Update package.json version
npm pkg set "version=$next"

# Commit and tag
git add package.json
git commit -m "Release v${next}"
git tag "v${next}"

echo ""
echo "Created commit and tag v${next}."
echo "Run 'git push origin main v${next}' to trigger the deploy."
