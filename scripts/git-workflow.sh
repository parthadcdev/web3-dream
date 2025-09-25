#!/bin/bash

# TraceChain Web3-Dream - Git Workflow Helper Script
# This script provides convenient commands for working with our branching strategy

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

# Function to show help
show_help() {
    print_color $CYAN "🚀 TraceChain Git Workflow Helper"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  feature <name>     Create and switch to a new feature branch"
    echo "  bugfix <name>      Create and switch to a new bugfix branch"
    echo "  hotfix <name>      Create and switch to a new hotfix branch"
    echo "  release <version>  Create and switch to a new release branch"
    echo "  smart <name>       Create and switch to a new smart-contracts branch"
    echo "  infra <name>       Create and switch to a new infrastructure branch"
    echo "  exp <name>         Create and switch to a new experimental branch"
    echo "  sync               Sync current branch with develop"
    echo "  cleanup            Clean up merged branches"
    echo "  status             Show current branch status"
    echo "  pr-ready           Prepare current branch for PR (rebase and push)"
    echo "  switch <branch>    Switch to specified branch"
    echo "  help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 feature TC-123-jwt-authentication"
    echo "  $0 bugfix TC-456-login-error"
    echo "  $0 release v1.0.0"
    echo "  $0 smart trace-token-upgrade"
    echo "  $0 infra docker-optimization"
    echo ""
}

# Function to create a new branch
create_branch() {
    local type=$1
    local name=$2
    local source_branch=$3
    
    if [ -z "$name" ]; then
        print_color $RED "❌ Error: Branch name is required"
        echo "Usage: $0 $type <name>"
        exit 1
    fi
    
    print_color $BLUE "🔄 Switching to $source_branch..."
    git checkout $source_branch
    git pull origin $source_branch
    
    local branch_name="$type/$name"
    print_color $BLUE "🌿 Creating branch: $branch_name"
    git checkout -b $branch_name
    
    print_color $GREEN "✅ Created and switched to $branch_name"
    print_color $YELLOW "💡 Next steps:"
    echo "  1. Make your changes"
    echo "  2. Commit frequently with meaningful messages"
    echo "  3. Push regularly: git push origin $branch_name"
    echo "  4. Create PR when ready: $0 pr-ready"
}

# Function to sync current branch with develop
sync_branch() {
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    
    if [ "$current_branch" = "develop" ] || [ "$current_branch" = "main" ]; then
        print_color $BLUE "🔄 Updating $current_branch..."
        git pull origin $current_branch
        print_color $GREEN "✅ $current_branch is up to date"
        return
    fi
    
    print_color $BLUE "🔄 Syncing $current_branch with develop..."
    git fetch origin
    git rebase origin/develop
    
    print_color $GREEN "✅ $current_branch synced with develop"
}

# Function to clean up merged branches
cleanup_branches() {
    print_color $BLUE "🧹 Cleaning up merged branches..."
    
    # Update remote tracking branches
    git remote prune origin
    
    # Delete local branches that have been merged
    local merged_branches=$(git branch --merged develop | grep -v -E '(develop|main|\*)' | xargs -r)
    
    if [ -z "$merged_branches" ]; then
        print_color $YELLOW "ℹ️  No merged branches to clean up"
        return
    fi
    
    print_color $YELLOW "Found merged branches:"
    echo "$merged_branches"
    echo ""
    
    read -p "Delete these branches? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "$merged_branches" | xargs git branch -d
        print_color $GREEN "✅ Merged branches deleted"
    else
        print_color $YELLOW "❌ Cleanup cancelled"
    fi
}

# Function to show branch status
show_status() {
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    local status=$(git status --porcelain)
    local ahead=$(git rev-list --count HEAD ^origin/$current_branch 2>/dev/null || echo "0")
    local behind=$(git rev-list --count origin/$current_branch ^HEAD 2>/dev/null || echo "0")
    
    print_color $CYAN "📊 Current Branch Status"
    echo ""
    print_color $BLUE "Branch: $current_branch"
    
    if [ "$ahead" -gt 0 ]; then
        print_color $GREEN "↑ $ahead commits ahead of origin"
    fi
    
    if [ "$behind" -gt 0 ]; then
        print_color $YELLOW "↓ $behind commits behind origin"
    fi
    
    if [ "$ahead" -eq 0 ] && [ "$behind" -eq 0 ]; then
        print_color $GREEN "✅ Up to date with origin"
    fi
    
    echo ""
    
    if [ -n "$status" ]; then
        print_color $YELLOW "📝 Uncommitted changes:"
        git status --short
    else
        print_color $GREEN "✅ Working directory clean"
    fi
    
    echo ""
    print_color $BLUE "🌿 Recent branches:"
    git branch -vv | head -10
}

# Function to prepare branch for PR
pr_ready() {
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    
    if [ "$current_branch" = "develop" ] || [ "$current_branch" = "main" ]; then
        print_color $RED "❌ Cannot prepare PR from $current_branch"
        exit 1
    fi
    
    print_color $BLUE "🔄 Preparing $current_branch for PR..."
    
    # Sync with develop
    sync_branch
    
    # Push with force-with-lease
    print_color $BLUE "📤 Pushing to origin..."
    git push --force-with-lease origin $current_branch
    
    print_color $GREEN "✅ Branch ready for PR!"
    print_color $YELLOW "💡 Next steps:"
    echo "  1. Go to GitHub and create a pull request"
    echo "  2. Target branch: develop"
    echo "  3. Add reviewers and description"
    echo "  4. Wait for approval and merge"
}

# Function to switch to a branch
switch_branch() {
    local branch_name=$1
    
    if [ -z "$branch_name" ]; then
        print_color $RED "❌ Error: Branch name is required"
        echo "Usage: $0 switch <branch-name>"
        exit 1
    fi
    
    print_color $BLUE "🔄 Switching to $branch_name..."
    git checkout $branch_name
    
    if [ $? -eq 0 ]; then
        print_color $GREEN "✅ Switched to $branch_name"
        show_status
    else
        print_color $RED "❌ Failed to switch to $branch_name"
        exit 1
    fi
}

# Main script logic
case "$1" in
    feature)
        create_branch "feature" "$2" "develop"
        ;;
    bugfix)
        create_branch "bugfix" "$2" "develop"
        ;;
    hotfix)
        create_branch "hotfix" "$2" "main"
        ;;
    release)
        create_branch "release" "$2" "develop"
        ;;
    smart)
        create_branch "smart-contracts" "$2" "develop"
        ;;
    infra)
        create_branch "infrastructure" "$2" "develop"
        ;;
    exp)
        create_branch "experimental" "$2" "develop"
        ;;
    sync)
        sync_branch
        ;;
    cleanup)
        cleanup_branches
        ;;
    status)
        show_status
        ;;
    pr-ready)
        pr_ready
        ;;
    switch)
        switch_branch "$2"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_color $RED "❌ Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
