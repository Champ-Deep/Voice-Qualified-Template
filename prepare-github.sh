#!/bin/bash

# ChampQualifier - GitHub Preparation Script
# This script prepares your repository for pushing to GitHub

set -e  # Exit on error

echo "🚀 ChampQualifier - GitHub Preparation Script"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check if git is installed
echo "📋 Step 1: Checking prerequisites..."
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed. Please install git first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Git is installed${NC}"

# Step 2: Check if we're in a git repository
echo ""
echo "📋 Step 2: Checking git repository..."
if [ -d .git ]; then
    echo -e "${GREEN}✅ Git repository already initialized${NC}"
else
    echo -e "${YELLOW}⚠️  Initializing git repository...${NC}"
    git init
    echo -e "${GREEN}✅ Git repository initialized${NC}"
fi

# Step 3: Check for sensitive files
echo ""
echo "📋 Step 3: Checking for sensitive files..."
SENSITIVE_FILES=(".env" "backend/.env" ".env.local" ".env.production")
FOUND_SENSITIVE=false

for file in "${SENSITIVE_FILES[@]}"; do
    if [ -f "$file" ]; then
        if ! grep -q "$file" .gitignore 2>/dev/null; then
            echo -e "${RED}❌ Warning: $file exists but not in .gitignore!${NC}"
            FOUND_SENSITIVE=true
        else
            echo -e "${GREEN}✅ $file is properly ignored${NC}"
        fi
    fi
done

if [ "$FOUND_SENSITIVE" = true ]; then
    echo -e "${YELLOW}⚠️  Please ensure sensitive files are in .gitignore${NC}"
fi

# Step 4: Check for large files
echo ""
echo "📋 Step 4: Checking for large files/folders..."
if [ -d "node_modules" ]; then
    if grep -q "node_modules" .gitignore; then
        echo -e "${GREEN}✅ node_modules is properly ignored${NC}"
    else
        echo -e "${RED}❌ node_modules should be in .gitignore!${NC}"
        echo "node_modules/" >> .gitignore
        echo -e "${GREEN}✅ Added node_modules to .gitignore${NC}"
    fi
fi

if [ -d "dist" ]; then
    if grep -q "dist" .gitignore; then
        echo -e "${GREEN}✅ dist is properly ignored${NC}"
    else
        echo -e "${YELLOW}⚠️  Adding dist to .gitignore...${NC}"
        echo "dist/" >> .gitignore
        echo -e "${GREEN}✅ Added dist to .gitignore${NC}"
    fi
fi

# Step 5: Show current status
echo ""
echo "📋 Step 5: Current git status..."
git status --short | head -20

# Step 6: Check remotes
echo ""
echo "📋 Step 6: Checking git remotes..."
if git remote -v | grep -q origin; then
    echo -e "${GREEN}✅ Remote 'origin' is configured:${NC}"
    git remote -v
else
    echo -e "${YELLOW}⚠️  No remote 'origin' configured yet${NC}"
    echo ""
    echo "To add a remote, run:"
    echo "  git remote add origin https://github.com/YOUR_USERNAME/champqualifier.git"
fi

# Step 7: Offer to stage files
echo ""
echo "📋 Step 7: Ready to stage files?"
read -p "Do you want to stage all files now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Staging all files..."
    git add .
    echo -e "${GREEN}✅ All files staged${NC}"
    echo ""
    echo "Files to be committed:"
    git status --short
fi

# Step 8: Offer to commit
echo ""
echo "📋 Step 8: Ready to commit?"
if git diff --staged --quiet; then
    echo -e "${YELLOW}⚠️  No files staged for commit${NC}"
else
    read -p "Do you want to create a commit now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Creating commit..."
        git commit -m "Initial commit: ChampQualifier application

- Frontend: React + Vite + TypeScript
- Backend: Express.js API + Serverless functions
- Database: Redis (Upstash ready)
- Voice API: Eleven Labs integration
- Docker: Full containerization
- CI/CD: GitHub Actions workflow
- Deployment: Vercel ready"
        echo -e "${GREEN}✅ Commit created${NC}"
    fi
fi

# Step 9: Check branch
echo ""
echo "📋 Step 9: Checking branch..."
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    read -p "Rename branch to 'main'? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git branch -M main
        echo -e "${GREEN}✅ Branch renamed to 'main'${NC}"
    fi
fi

# Step 10: Summary and next steps
echo ""
echo "=============================================="
echo "🎉 Preparation Complete!"
echo "=============================================="
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Create GitHub repository:"
echo "   → Go to https://github.com/new"
echo "   → Name: champqualifier"
echo "   → Visibility: Private (recommended)"
echo "   → DO NOT initialize with README/License/.gitignore"
echo ""
echo "2. Add remote (if not already done):"
echo "   git remote add origin https://github.com/YOUR_USERNAME/champqualifier.git"
echo ""
echo "3. Push to GitHub:"
echo "   git push -u origin main"
echo ""
echo "4. Set up GitHub Secrets (for CI/CD):"
echo "   → Go to repo Settings → Secrets → Actions"
echo "   → Add: VITE_VOICE_API_KEY, VITE_AGENT_ID, etc."
echo ""
echo "5. Deploy to Vercel:"
echo "   → See VERCEL_DEPLOYMENT_GUIDE.md"
echo ""
echo "For detailed instructions, read:"
echo "  → GITHUB_SETUP.md"
echo ""
echo "Good luck! 🚀"
