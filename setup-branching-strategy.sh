#!/bin/bash

# TraceChain Web3-Dream - Branching Strategy Setup Script
# This script sets up the complete branching strategy for the project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_color $CYAN "🚀 Setting up TraceChain Branching Strategy"
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_color $RED "❌ Error: Not in a git repository"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -f "docker-compose.yml" ]; then
    print_color $RED "❌ Error: Not in the TraceChain project directory"
    exit 1
fi

print_color $BLUE "📋 Setting up branching strategy components..."

# 1. Configure Git settings
print_color $YELLOW "1️⃣ Configuring Git settings..."
git config commit.template .gitmessage
git config pull.rebase true
git config push.default current
git config push.followTags true
git config rebase.autoStash true

# Set up aliases if not already configured
if ! git config --get alias.co > /dev/null 2>&1; then
    print_color $BLUE "📝 Adding Git aliases..."
    
    # Source the git config file
    if [ -f ".gitconfig.local" ]; then
        # Add aliases from our config file
        git config alias.co checkout
        git config alias.br branch
        git config alias.ci commit
        git config alias.st status
        git config alias.unstage 'reset HEAD --'
        git config alias.last 'log -1 HEAD'
        git config alias.lg 'log --oneline --graph --all --decorate'
        git config alias.cleanup '!git branch --merged | grep -v "\\*\\|main\\|develop" | xargs -n 1 git branch -d'
    fi
fi

print_color $GREEN "✅ Git configuration updated"

# 2. Ensure main branch exists and is up to date
print_color $YELLOW "2️⃣ Setting up main branch..."
if git show-ref --verify --quiet refs/heads/main; then
    print_color $BLUE "📝 Main branch exists, updating..."
    git checkout main
    git pull origin main 2>/dev/null || true
else
    print_color $BLUE "📝 Creating main branch from develop..."
    git checkout develop
    git checkout -b main
    git push origin main
fi

print_color $GREEN "✅ Main branch ready"

# 3. Set up branch protection (informational)
print_color $YELLOW "3️⃣ Branch protection setup..."
print_color $BLUE "📝 Manual steps required for GitHub branch protection:"
echo ""
echo "🌐 Go to GitHub repository settings:"
echo "   https://github.com/parthadcdev/web3-dream/settings/branches"
echo ""
echo "🔒 Set up branch protection rules:"
echo ""
echo "   For 'main' branch:"
echo "   ✅ Require pull request reviews (2 reviewers)"
echo "   ✅ Require status checks to pass"
echo "   ✅ Require branches to be up to date"
echo "   ✅ Restrict pushes to matching branches"
echo "   ❌ Allow force pushes: false"
echo "   ❌ Allow deletions: false"
echo ""
echo "   For 'develop' branch:"
echo "   ✅ Require pull request reviews (1 reviewer)"
echo "   ✅ Require status checks to pass"
echo "   ✅ Require branches to be up to date"
echo "   ✅ Restrict pushes to matching branches"
echo "   ❌ Allow force pushes: false"
echo ""

# 4. Create example feature branch
print_color $YELLOW "4️⃣ Creating example feature branch..."
example_branch="feature/TC-001-branching-strategy-setup"
if ! git show-ref --verify --quiet refs/heads/$example_branch; then
    git checkout develop
    git checkout -b $example_branch
    print_color $GREEN "✅ Created example feature branch: $example_branch"
else
    print_color $YELLOW "ℹ️  Example branch already exists"
fi

# 5. Set up GitHub Actions secrets (informational)
print_color $YELLOW "5️⃣ GitHub Actions setup..."
print_color $BLUE "📝 Manual steps required for GitHub Actions:"
echo ""
echo "🌐 Go to GitHub repository settings:"
echo "   https://github.com/parthadcdev/web3-dream/settings/secrets/actions"
echo ""
echo "🔑 Add the following secrets:"
echo "   - SONAR_TOKEN: SonarCloud token for code quality"
echo "   - CODECOV_TOKEN: Codecov token for coverage reporting"
echo "   - DOCKER_USERNAME: Docker Hub username"
echo "   - DOCKER_PASSWORD: Docker Hub password"
echo "   - PRODUCTION_SECRETS: Production environment variables"
echo ""

# 6. Verify setup
print_color $YELLOW "6️⃣ Verifying setup..."

# Check if hooks are executable
if [ -x ".git/hooks/pre-commit" ]; then
    print_color $GREEN "✅ Pre-commit hook is executable"
else
    print_color $RED "❌ Pre-commit hook is not executable"
    chmod +x .git/hooks/pre-commit
    print_color $GREEN "✅ Fixed pre-commit hook permissions"
fi

# Check if workflow script is executable
if [ -x "scripts/git-workflow.sh" ]; then
    print_color $GREEN "✅ Git workflow script is executable"
else
    print_color $RED "❌ Git workflow script is not executable"
    chmod +x scripts/git-workflow.sh
    print_color $GREEN "✅ Fixed git workflow script permissions"
fi

# Check branch structure
print_color $BLUE "📊 Current branch structure:"
git branch -vv

echo ""
print_color $GREEN "🎉 Branching strategy setup complete!"
echo ""

print_color $CYAN "📚 Next steps:"
echo ""
echo "1. 🔧 Configure branch protection rules on GitHub"
echo "2. 🔑 Add GitHub Actions secrets"
echo "3. 🧪 Test the workflow with a sample feature branch"
echo "4. 📖 Review the BRANCHING_STRATEGY.md documentation"
echo "5. 👥 Share the workflow with your team"
echo ""

print_color $YELLOW "🛠️  Useful commands:"
echo ""
echo "# Create a new feature branch"
echo "./scripts/git-workflow.sh feature TC-123-my-feature"
echo ""
echo "# Check branch status"
echo "./scripts/git-workflow.sh status"
echo ""
echo "# Sync with develop"
echo "./scripts/git-workflow.sh sync"
echo ""
echo "# Prepare branch for PR"
echo "./scripts/git-workflow.sh pr-ready"
echo ""
echo "# Clean up merged branches"
echo "./scripts/git-workflow.sh cleanup"
echo ""

print_color $GREEN "✅ Setup complete! Happy coding! 🚀"
