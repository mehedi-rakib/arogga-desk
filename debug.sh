#!/bin/bash
# Quick Debug Script for Arogga Desk

echo "🔍 Arogga Desk - Debug Script"
echo "======================================"

# Check Node.js
echo ""
echo "1️⃣ Checking Node.js..."
node --version
npm --version

# Check .env file
echo ""
echo "2️⃣ Checking .env configuration..."
if [ -f .env ]; then
    echo "✅ .env exists"
    echo "Database config:"
    grep MYSQL_ .env | sed 's/=.*/=***/'
else
    echo "❌ .env file missing!"
fi

# Check node_modules
echo ""
echo "3️⃣ Checking dependencies..."
if [ -d node_modules ]; then
    echo "✅ node_modules exists"
    echo "xlsx installed: $(npm list xlsx 2>/dev/null | head -1)"
else
    echo "❌ node_modules missing - run: npm install"
fi

# Check database connection
echo ""
echo "4️⃣ Checking MySQL connection..."
if command -v mysql &> /dev/null; then
    MYSQL_HOST=$(grep MYSQL_HOST .env | cut -d'=' -f2)
    MYSQL_USER=$(grep MYSQL_USER .env | cut -d'=' -f2)
    MYSQL_DB=$(grep MYSQL_DATABASE .env | cut -d'=' -f2)

    if mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$(grep MYSQL_PASSWORD .env | cut -d'=' -f2)" "$MYSQL_DB" -e "SELECT 1;" 2>/dev/null; then
        echo "✅ MySQL connection successful"
        PRODUCT_COUNT=$(mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$(grep MYSQL_PASSWORD .env | cut -d'=' -f2)" "$MYSQL_DB" -e "SELECT COUNT(*) FROM products;" 2>/dev/null | tail -1)
        echo "📊 Products in database: $PRODUCT_COUNT"
    else
        echo "❌ MySQL connection failed"
        echo "  - Check MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD in .env"
        echo "  - Ensure MySQL server is running"
    fi
else
    echo "⚠️  mysql-client not installed (can't test connection)"
fi

# Check build
echo ""
echo "5️⃣ Checking Next.js build..."
if [ -d .next ]; then
    echo "✅ Build exists"
    BUILD_SIZE=$(du -sh .next 2>/dev/null | cut -f1)
    echo "  Size: $BUILD_SIZE"
else
    echo "⚠️  .next not built - run: npm run build"
fi

# Check for errors in code
echo ""
echo "6️⃣ Checking for TypeScript errors..."
if npm run build 2>&1 | grep -q "Failed to type check"; then
    echo "❌ TypeScript errors found"
    npm run build 2>&1 | grep "Type error" | head -5
else
    echo "✅ TypeScript checks passed"
fi

echo ""
echo "======================================"
echo "✨ Debug complete!"
echo ""
echo "Next steps:"
echo "1. Fix any ❌ errors shown above"
echo "2. Run: npm run build"
echo "3. Run: npm start"
echo "4. Open: http://localhost:3090"
echo "5. Check browser console (F12) for errors"
