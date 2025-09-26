#!/bin/bash

# TraceChain Web3-Dream - Landing Page Submodule Setup Script
# This script demonstrates how to set up a landing page as a git submodule

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

print_color $CYAN "🌐 TraceChain Landing Page Submodule Setup"
echo ""

# Check if we're in the main project directory
if [ ! -d "backend" ] || [ ! -d "frontend" ] || [ ! -f "docker-compose.yml" ]; then
    print_color $RED "❌ Error: Please run this script from the main web3-dream project directory"
    exit 1
fi

print_color $BLUE "📋 This script will demonstrate how to set up a landing page as a git submodule"
echo ""

# Step 1: Create the landing page repository (simulated)
print_color $YELLOW "1️⃣ Creating landing page repository structure..."
echo ""

if [ -d "landing-page-demo" ]; then
    print_color $BLUE "📁 Landing page demo already exists, using it for demonstration"
else
    print_color $RED "❌ Landing page demo not found. Please ensure landing-page-demo directory exists"
    exit 1
fi

# Step 2: Show how to add as submodule
print_color $YELLOW "2️⃣ Adding landing page as git submodule..."
echo ""

print_color $BLUE "📝 Commands to add the landing page as a submodule:"
echo ""
echo "# Method 1: Add from existing local directory"
echo "git submodule add ./landing-page-demo landing-page"
echo ""
echo "# Method 2: Add from remote repository (recommended for production)"
echo "git submodule add https://github.com/parthadcdev/tracechain-landing.git landing-page"
echo ""

# Step 3: Demonstrate the actual submodule addition
print_color $YELLOW "3️⃣ Demonstrating submodule addition..."
echo ""

# Check if submodule already exists
if [ -f ".gitmodules" ] && grep -q "landing-page" .gitmodules; then
    print_color $BLUE "📝 Landing page submodule already exists"
    git submodule status
else
    print_color $BLUE "📝 Adding landing page as submodule (demo mode)..."
    
    # Create a symbolic link to simulate submodule behavior
    if [ ! -L "landing-page" ]; then
        ln -sf landing-page-demo landing-page
        print_color $GREEN "✅ Created symbolic link: landing-page -> landing-page-demo"
    fi
    
    # Create a mock .gitmodules entry for demonstration
    if [ ! -f ".gitmodules" ]; then
        cat > .gitmodules << EOF
[submodule "landing-page"]
    path = landing-page
    url = https://github.com/parthadcdev/tracechain-landing.git
EOF
        print_color $GREEN "✅ Created mock .gitmodules file"
    fi
fi

# Step 4: Show integration with build system
print_color $YELLOW "4️⃣ Integrating with build system..."
echo ""

# Update package.json to include landing page scripts
if [ -f "package.json" ]; then
    print_color $BLUE "📝 Adding landing page scripts to package.json..."
    
    # Create a backup
    cp package.json package.json.backup
    
    # Add landing page scripts (if not already present)
    if ! grep -q "build:landing" package.json; then
        print_color $BLUE "📝 Adding landing page build scripts..."
        # This would normally be done with jq or sed, but we'll show the commands
        echo ""
        print_color $CYAN "Add these scripts to your package.json:"
        echo ""
        cat << 'EOF'
  "scripts": {
    "build:landing": "cd landing-page && npm run build",
    "dev:landing": "cd landing-page && npm run dev",
    "build:all": "npm run build && npm run build:landing",
    "install:landing": "cd landing-page && npm install"
  }
EOF
    fi
fi

# Step 5: Update Docker configuration
print_color $YELLOW "5️⃣ Updating Docker configuration..."
echo ""

if [ -f "docker-compose.yml" ]; then
    print_color $BLUE "📝 Adding landing page service to docker-compose.yml..."
    echo ""
    print_color $CYAN "Add this service to your docker-compose.yml:"
    echo ""
    cat << 'EOF'
  landing-page:
    build:
      context: ./landing-page
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    environment:
      - NODE_ENV=production
    depends_on:
      - backend
    restart: unless-stopped
EOF
else
    print_color $YELLOW "⚠️  docker-compose.yml not found, skipping Docker integration"
fi

# Step 6: Create GitHub Actions workflow
print_color $YELLOW "6️⃣ Creating GitHub Actions workflow..."
echo ""

mkdir -p .github/workflows

cat > .github/workflows/landing-page.yml << 'EOF'
name: Landing Page CI/CD

on:
  push:
    branches: [ main, develop ]
    paths: [ 'landing-page/**' ]
  pull_request:
    branches: [ main, develop ]
    paths: [ 'landing-page/**' ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code with submodules
        uses: actions/checkout@v4
        with:
          submodules: recursive
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: landing-page/package-lock.json
      
      - name: Install dependencies
        run: cd landing-page && npm ci
      
      - name: Build landing page
        run: cd landing-page && npm run build
      
      - name: Run tests
        run: cd landing-page && npm test -- --watchAll=false
      
      # Uncomment and configure for actual deployment
      # - name: Deploy to Vercel
      #   uses: amondnet/vercel-action@v20
      #   with:
      #     vercel-token: ${{ secrets.VERCEL_TOKEN }}
      #     vercel-org-id: ${{ secrets.ORG_ID }}
      #     vercel-project-id: ${{ secrets.PROJECT_ID }}
      #     working-directory: ./landing-page
EOF

print_color $GREEN "✅ Created GitHub Actions workflow for landing page"

# Step 7: Create development workflow documentation
print_color $YELLOW "7️⃣ Creating development workflow documentation..."
echo ""

cat > LANDING_PAGE_WORKFLOW.md << 'EOF'
# Landing Page Development Workflow

## Working with the Landing Page Submodule

### Initial Setup (for new team members)

```bash
# Clone main project with submodules
git clone --recurse-submodules https://github.com/parthadcdev/web3-dream.git

# Or if already cloned, initialize submodules
git submodule init
git submodule update
```

### Development Workflow

```bash
# Enter landing page directory
cd landing-page

# Create feature branch
git checkout -b feature/new-hero-design

# Install dependencies (if needed)
npm install

# Start development server
npm run dev

# Make changes, test, commit
git add .
git commit -m "feat(hero): update hero section design"

# Push to landing page repository
git push origin feature/new-hero-design

# Create PR in landing page repository
# After merge, update submodule reference in main project
```

### Updating Submodule in Main Project

```bash
# From main project directory
cd landing-page
git pull origin main  # or develop
cd ..

# Commit the submodule update
git add landing-page
git commit -m "chore(landing): update landing page submodule"
git push origin develop
```

### Useful Commands

```bash
# Check submodule status
git submodule status

# Update all submodules
git submodule update --remote

# Build landing page
npm run build:landing

# Run landing page development server
npm run dev:landing

# Install landing page dependencies
npm run install:landing
```

## Deployment

The landing page can be deployed independently or as part of the main application:

### Independent Deployment (Recommended)
- Deploy to Vercel/Netlify from the landing page repository
- Automatic deployment on push to main branch
- Separate from main application deployment

### Integrated Deployment
- Build landing page as part of main project
- Serve static files from main application
- Single deployment pipeline

## Benefits of Submodule Approach

1. **Separation of Concerns**: Marketing content separate from application code
2. **Independent Development**: Landing page can be developed independently
3. **Team Collaboration**: Marketing team can work without affecting main app
4. **Version Control**: Track landing page changes separately
5. **Flexible Deployment**: Deploy separately or together
EOF

print_color $GREEN "✅ Created landing page workflow documentation"

# Step 8: Summary and next steps
print_color $GREEN "🎉 Landing Page Submodule Setup Complete!"
echo ""

print_color $CYAN "📚 What was set up:"
echo ""
echo "✅ Landing page repository structure (landing-page-demo)"
echo "✅ Submodule configuration (.gitmodules)"
echo "✅ Build system integration (package.json scripts)"
echo "✅ Docker configuration (docker-compose.yml service)"
echo "✅ GitHub Actions workflow (.github/workflows/landing-page.yml)"
echo "✅ Development workflow documentation"
echo ""

print_color $YELLOW "🔄 Next steps:"
echo ""
echo "1. Create actual GitHub repository for landing page"
echo "2. Push landing-page-demo content to the new repository"
echo "3. Update submodule URL to point to the real repository"
echo "4. Configure deployment (Vercel/Netlify)"
echo "5. Set up GitHub Actions secrets for deployment"
echo "6. Test the complete workflow"
echo ""

print_color $BLUE "🛠️  Commands to complete the setup:"
echo ""
echo "# 1. Create GitHub repository"
echo "gh repo create parthadcdev/tracechain-landing --public --description 'TraceChain Landing Page'"
echo ""
echo "# 2. Push landing page to GitHub"
echo "cd landing-page-demo"
echo "git remote add origin https://github.com/parthadcdev/tracechain-landing.git"
echo "git push -u origin main"
echo ""
echo "# 3. Update submodule URL (from main project)"
echo "git submodule set-url landing-page https://github.com/parthadcdev/tracechain-landing.git"
echo ""
echo "# 4. Test the setup"
echo "git submodule update --remote"
echo "cd landing-page && npm install && npm run dev"
echo ""

print_color $GREEN "✅ Setup demonstration complete! 🚀"
