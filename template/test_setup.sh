#!/bin/bash

# Quick Test Script for Chatbot Framework
# Run this script to verify the framework is set up correctly

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       Chatbot Framework Setup Verification Script           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for passed/failed tests
PASSED=0
FAILED=0

# Test 1: Check Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ ${NC}Found: $NODE_VERSION"
    ((PASSED++))
else
    echo -e "${RED}✗ ${NC}Node.js not found. Install from https://nodejs.org"
    ((FAILED++))
fi

# Test 2: Check npm
echo -n "Checking npm... "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ ${NC}Found: npm $NPM_VERSION"
    ((PASSED++))
else
    echo -e "${RED}✗ ${NC}npm not found"
    ((FAILED++))
fi

# Test 3: Check Python
echo -n "Checking Python 3... "
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✓ ${NC}Found: $PYTHON_VERSION"
    ((PASSED++))
else
    echo -e "${RED}✗ ${NC}Python 3 not found. Install from https://python.org"
    ((FAILED++))
fi

# Test 4: Check if node_modules exists
echo -n "Checking node_modules... "
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ ${NC}Dependencies installed"
    ((PASSED++))
else
    echo -e "${YELLOW}! ${NC}Dependencies not installed. Run: npm install"
    ((FAILED++))
fi

# Test 5: Check if package.json exists
echo -n "Checking package.json... "
if [ -f "package.json" ]; then
    echo -e "${GREEN}✓ ${NC}Found"
    ((PASSED++))
else
    echo -e "${RED}✗ ${NC}package.json not found"
    ((FAILED++))
fi

# Test 6: Check if app.py exists
echo -n "Checking app.py... "
if [ -f "app.py" ]; then
    echo -e "${GREEN}✓ ${NC}Found"
    ((PASSED++))
else
    echo -e "${RED}✗ ${NC}app.py not found"
    ((FAILED++))
fi

# Test 7: Check required directories
echo -n "Checking app/api/ structure... "
if [ -d "app/api/chat" ] && [ -d "app/api/batch" ]; then
    echo -e "${GREEN}✓ ${NC}Found"
    ((PASSED++))
else
    echo -e "${RED}✗ ${NC}app/api/ structure not found"
    ((FAILED++))
fi

# Test 8: Check if requirements.txt exists
echo -n "Checking requirements.txt... "
if [ -f "requirements.txt" ]; then
    echo -e "${GREEN}✓ ${NC}Found"
    ((PASSED++))
else
    echo -e "${RED}✗ ${NC}requirements.txt not found"
    ((FAILED++))
fi

# Test 9: Check if .env.example exists
echo -n "Checking .env.example... "
if [ -f ".env.example" ]; then
    echo -e "${GREEN}✓ ${NC}Found"
    ((PASSED++))
else
    echo -e "${RED}✗ ${NC}.env.example not found"
    ((FAILED++))
fi

# Test 10: Check Docker
echo -n "Checking Docker... "
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✓ ${NC}Found: $DOCKER_VERSION"
    ((PASSED++))
else
    echo -e "${YELLOW}! ${NC}Docker not found (optional for development)"
    ((FAILED++))
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                        Test Summary                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Install frontend dependencies:"
    echo "     npm install"
    echo ""
    echo "  2. Install backend dependencies:"
    echo "     pip install -r requirements.txt"
    echo ""
    echo "  3. Start backend (Terminal 1):"
    echo "     python app.py"
    echo ""
    echo "  4. Start frontend (Terminal 2):"
    echo "     npm run dev"
    echo ""
    echo "  5. Open in browser:"
    echo "     http://localhost:3000"
else
    echo -e "${RED}Please fix the errors above before proceeding.${NC}"
    echo ""
    echo "Common fixes:"
    echo "  - Install Node.js: https://nodejs.org"
    echo "  - Install Python: https://python.org"
    echo "  - Install npm packages: npm install"
    echo "  - Install pip packages: pip install -r requirements.txt"
fi
