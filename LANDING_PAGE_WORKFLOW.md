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
