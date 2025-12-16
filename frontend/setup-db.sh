#!/bin/bash

# KENNEX Dial Queue Database Setup Script
# Automatically sets up SQLite + Prisma for development

echo "🚀 Setting up KENNEX Dial Queue Database..."
echo "================================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the frontend directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install prisma @prisma/client sqlite3 tsx

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Create database and tables
echo "🗃️ Creating database tables..."
npx prisma db push

# Seed with test data
echo "🌱 Seeding database with test data..."
npx tsx prisma/seed.ts

# Success message
echo ""
echo "✅ Database setup completed successfully!"
echo ""
echo "📊 Test data created:"
echo "   • 5 campaigns"
echo "   • 6 data lists" 
echo "   • ~300 contacts"
echo "   • 5 agents"
echo "   • 25 call records"
echo ""
echo "🔗 Pre-configured assignments:"
echo "   • Campaign 1125: 2 active lists (60/40 blend)"
echo "   • Campaign 6002: 2 active lists (70/30 blend)"
echo "   • Campaign 6666: 1 inactive list"
echo ""
echo "🌐 View your data:"
echo "   npx prisma studio"
echo ""
echo "🔄 Reset database:"
echo "   npm run db:reset"
echo ""
echo "💡 Ready to test the dial queue system!"

# Add package.json scripts if they don't exist
echo ""
echo "📝 Adding database scripts to package.json..."

# Check if scripts section exists and add our scripts
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.scripts = pkg.scripts || {};

const dbScripts = {
  'db:generate': 'prisma generate',
  'db:push': 'prisma db push', 
  'db:seed': 'tsx prisma/seed.ts',
  'db:studio': 'prisma studio',
  'db:reset': 'prisma db push --force-reset && npm run db:seed',
  'db:migrate': 'prisma migrate dev'
};

Object.assign(pkg.scripts, dbScripts);

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('✅ Added database scripts to package.json');
"

echo ""
echo "🎉 Setup complete! Your dial queue system is ready for testing."