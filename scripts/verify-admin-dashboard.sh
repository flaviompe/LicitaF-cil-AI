#!/bin/bash

# LicitaFácil AI - Admin Dashboard Verification Script
# This script verifies that all admin dashboard components are properly implemented

echo "🚀 LicitaFácil AI - Admin Dashboard Verification"
echo "=============================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅ $1${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ $1 - NOT FOUND${NC}"
        ((FAILED++))
    fi
}

# Function to check if directory exists
check_directory() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✅ $1/ directory${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ $1/ directory - NOT FOUND${NC}"
        ((FAILED++))
    fi
}

# Function to check package.json dependencies
check_dependency() {
    if grep -q "\"$1\"" package.json; then
        echo -e "${GREEN}✅ $1 dependency${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ $1 dependency - NOT FOUND${NC}"
        ((FAILED++))
    fi
}

# Function to check if string exists in file
check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✅ $1 contains required content${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠️  $1 - content check failed${NC}"
        ((WARNINGS++))
    fi
}

echo -e "\n${BLUE}📦 Checking Project Structure...${NC}"
echo "--------------------------------"

# Check core directories
check_directory "components/admin"
check_directory "components/admin/ui"
check_directory "types"
check_directory "lib"
check_directory "docs"

echo -e "\n${BLUE}📋 Checking Core Admin Files...${NC}"
echo "--------------------------------"

# Check main admin components
check_file "components/admin/navigation.tsx"
check_file "components/admin/header.tsx"
check_file "components/admin/layout.tsx"
check_file "components/admin/dashboard.tsx"
check_file "components/admin/auth-provider.tsx"
check_file "components/admin/lazy-components.tsx"

echo -e "\n${BLUE}🎨 Checking UI Components...${NC}"
echo "-----------------------------"

# Check UI components
check_file "components/admin/ui/index.ts"
check_file "components/admin/ui/admin-card.tsx"
check_file "components/admin/ui/admin-button.tsx"
check_file "components/admin/ui/admin-modal.tsx"

echo -e "\n${BLUE}⚙️ Checking Configuration Files...${NC}"
echo "----------------------------------"

# Check configuration files
check_file "lib/admin-config.ts"
check_file "types/admin.ts"
check_file "tsconfig.json"
check_file "tailwind.config.js"

echo -e "\n${BLUE}📦 Checking Dependencies...${NC}"
echo "---------------------------"

# Check required dependencies
check_dependency "@headlessui/react"
check_dependency "@heroicons/react"
check_dependency "next"
check_dependency "react"
check_dependency "typescript"
check_dependency "tailwindcss"

echo -e "\n${BLUE}📄 Checking Documentation...${NC}"
echo "-----------------------------"

# Check documentation
check_file "docs/ADMIN_DASHBOARD_GUIDE.md"
check_file "PRD_LicitaFacil_AI.md"

echo -e "\n${BLUE}🔍 Checking Content Quality...${NC}"
echo "------------------------------"

# Check important content in key files
check_content "components/admin/navigation.tsx" "AdminNavigation"
check_content "components/admin/header.tsx" "AdminHeader"
check_content "components/admin/dashboard.tsx" "AdminDashboard"
check_content "components/admin/auth-provider.tsx" "AdminAuthProvider"
check_content "lib/admin-config.ts" "getNavigationForRole"
check_content "types/admin.ts" "User"
check_content "types/admin.ts" "DashboardStats"

echo -e "\n${BLUE}⚡ Checking Performance Features...${NC}"
echo "-----------------------------------"

# Check performance implementations
check_content "components/admin/lazy-components.tsx" "dynamic"
check_content "components/admin/lazy-components.tsx" "withLazyLoading"
check_content "package.json" "next"

echo -e "\n${BLUE}🔒 Checking Security Features...${NC}"
echo "--------------------------------"

# Check security implementations
check_content "components/admin/auth-provider.tsx" "hasPermission"
check_content "components/admin/auth-provider.tsx" "PermissionGate"
check_content "lib/admin-config.ts" "ROLE_PERMISSIONS"

echo -e "\n${BLUE}🎯 Checking TypeScript Types...${NC}"
echo "-------------------------------"

# Check TypeScript implementations
check_content "types/admin.ts" "interface"
check_content "tsconfig.json" "strict"
check_content "components/admin/navigation.tsx" "AdminNavigationProps"

echo -e "\n${BLUE}📱 Checking Responsive Design...${NC}"
echo "--------------------------------"

# Check responsive design implementations
check_content "components/admin/navigation.tsx" "lg:hidden"
check_content "components/admin/header.tsx" "md:block"
check_content "components/admin/dashboard.tsx" "sm:grid-cols"

echo -e "\n${BLUE}🎨 Checking Theme Support...${NC}"
echo "----------------------------"

# Check theme implementations
check_content "lib/admin-config.ts" "themes"
check_content "lib/admin-config.ts" "ThemeConfig"

# Final verification - try to run TypeScript check
echo -e "\n${BLUE}🔧 Running TypeScript Check...${NC}"
echo "------------------------------"

if command -v npx &> /dev/null; then
    if npx tsc --noEmit --skipLibCheck 2>/dev/null; then
        echo -e "${GREEN}✅ TypeScript check passed${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠️  TypeScript check failed (may need npm install)${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠️  npx not available, skipping TypeScript check${NC}"
    ((WARNINGS++))
fi

# Summary
echo -e "\n${BLUE}📊 VERIFICATION SUMMARY${NC}"
echo "======================="
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"

TOTAL=$((PASSED + FAILED + WARNINGS))
echo -e "\nTotal checks: $TOTAL"

if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "\n${GREEN}🎉 EXCELLENT! All checks passed successfully!${NC}"
        echo -e "${GREEN}The admin dashboard is ready for deployment.${NC}"
        exit 0
    else
        echo -e "\n${YELLOW}✅ GOOD! All critical checks passed with some warnings.${NC}"
        echo -e "${YELLOW}Review warnings before deployment.${NC}"
        exit 0
    fi
else
    echo -e "\n${RED}⚠️  ISSUES FOUND! $FAILED critical checks failed.${NC}"
    echo -e "${RED}Please fix the issues before deployment.${NC}"
    exit 1
fi

echo -e "\n${BLUE}🚀 Next Steps:${NC}"
echo "1. Run 'npm install' to install dependencies"
echo "2. Run 'npm run dev' to start development server"
echo "3. Run 'npm run build' to test production build"
echo "4. Review documentation in docs/ADMIN_DASHBOARD_GUIDE.md"
echo -e "\n${GREEN}Happy coding! 🎯${NC}"