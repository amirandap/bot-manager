#!/bin/bash

# 📁 Bot Manager - File Organization Script
# This script helps organize files and maintain clean project structure

echo "📁 Bot Manager File Organization Tool"

# Function to create directory structure
create_structure() {
    echo "🏗️  Creating directory structure..."
    
    mkdir -p docs/{development,deployment,api}
    mkdir -p scripts/{maintenance,deployment,testing}
    mkdir -p tests/{unit,integration,e2e}
    mkdir -p backend/backups
    mkdir -p data/{logs,sessions,qr-codes}
    
    echo "✅ Directory structure created"
}

# Function to organize loose files
organize_loose_files() {
    echo "📋 Organizing loose files..."
    
    # Move documentation files
    find . -maxdepth 1 -name "*.md" ! -name "README.md" | while read file; do
        filename=$(basename "$file")
        case "$filename" in
            *API*|*IMPLEMENTATION*)
                mv "$file" docs/api/ 2>/dev/null && echo "📄 Moved $filename to docs/api/"
                ;;
            *DEPLOYMENT*|*ENVIRONMENT*)
                mv "$file" docs/deployment/ 2>/dev/null && echo "📄 Moved $filename to docs/deployment/"
                ;;
            *)
                mv "$file" docs/development/ 2>/dev/null && echo "📄 Moved $filename to docs/development/"
                ;;
        esac
    done
    
    # Move test scripts
    find . -maxdepth 1 -name "test-*.sh" -o -name "*-test.sh" -o -name "verify-*.sh" | while read file; do
        mv "$file" scripts/testing/ 2>/dev/null && echo "🧪 Moved $(basename "$file") to scripts/testing/"
    done
    
    # Move deployment scripts
    find . -maxdepth 1 -name "deploy*.sh" -o -name "setup*.sh" | while read file; do
        mv "$file" scripts/deployment/ 2>/dev/null && echo "🚀 Moved $(basename "$file") to scripts/deployment/"
    done
}

# Function to organize backend files
organize_backend() {
    echo "🔧 Organizing backend files..."
    
    cd backend 2>/dev/null || return
    
    # Move backup files
    find src -name "*.backup*" -o -name "*.bak" -o -name "*.old" | while read file; do
        mv "$file" backups/ 2>/dev/null && echo "💾 Moved $(basename "$file") to backups/"
    done
    
    cd ..
}

# Function to show current organization
show_organization() {
    echo ""
    echo "📊 Current Project Organization:"
    echo ""
    echo "📁 Root Structure:"
    ls -la | grep "^d" | awk '{print "  📂 " $9}' | grep -v "^\.$\|^\.\.$"
    
    echo ""
    echo "📚 Documentation (docs/):"
    find docs -type f -name "*.md" | sort | sed 's/^/  📄 /'
    
    echo ""
    echo "🔧 Scripts:"
    echo "  🛠️  Maintenance:"
    find scripts/maintenance -type f | sort | sed 's/^scripts\/maintenance\//    🔧 /'
    echo "  🚀 Deployment:"
    find scripts/deployment -type f | sort | sed 's/^scripts\/deployment\//    🚀 /'
    echo "  🧪 Testing:"
    find scripts/testing -type f | sort | sed 's/^scripts\/testing\//    🧪 /'
}

# Main execution
case "$1" in
    --create)
        create_structure
        ;;
    --organize)
        organize_loose_files
        organize_backend
        echo "✅ File organization completed"
        ;;
    --show)
        show_organization
        ;;
    --full)
        create_structure
        organize_loose_files
        organize_backend
        show_organization
        echo "✅ Full organization completed"
        ;;
    *)
        echo "📁 Bot Manager File Organization Tool"
        echo ""
        echo "Usage: $0 [option]"
        echo ""
        echo "Options:"
        echo "  --create     Create directory structure"
        echo "  --organize   Organize loose files"
        echo "  --show       Show current organization"
        echo "  --full       Complete organization (create + organize + show)"
        echo ""
        ;;
esac
