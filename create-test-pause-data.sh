#!/bin/bash

echo "🧪 Creating Test Pause Events for Reports"
echo "========================================"

echo ""
echo "This script will create sample pause events that should show up in your Pause Reasons report."
echo "We'll use direct database insertion to bypass any API authentication issues."
echo ""

# Database connection info
DB_HOST="localhost"
DB_USER="zenan" 
DB_NAME="omnivox_dev"

echo "📊 Attempting to connect to database..."

# Check if we can connect to the database
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client (psql) not found"
    echo "⚠️  The local database might not be running or accessible"
    echo ""
    echo "🔄 Alternative: Let's try to trigger pause events via the frontend interface"
    echo ""
    echo "👇 Manual Steps to Create Test Data:"
    echo ""
    echo "1. 🌐 Navigate to: http://localhost:3000"
    echo "2. 🔑 Login with your credentials (ken/password)"
    echo "3. 👆 Click on your status (top right) and change to 'Unavailable'"
    echo "4. 📝 Select 'Toilet Break' as the reason"
    echo "5. ✅ Confirm the pause"
    echo "6. ⏸️ Wait a few seconds"
    echo "7. 👆 Click status again and change back to 'Available'"
    echo "8. 🔄 This should create a pause event with duration"
    echo "9. 📊 Check the Pause Reasons report again"
    echo ""
    echo "🌐 Pause Reasons Report: http://localhost:3000/reports/pause_reasons"
    
else
    echo "✅ PostgreSQL client found, attempting database operations..."
    
    # Try to connect and create test data
    echo ""
    echo "📋 Creating sample pause events..."
    
    # Create sample pause events SQL
    cat << EOF > /tmp/create_pause_events.sql
-- Insert sample agent if not exists
INSERT INTO agents (id, agent_id, first_name, last_name, email, status)
VALUES ('agent_509', '509', 'Ken', 'User', 'ken@example.com', 'Available')
ON CONFLICT (agent_id) DO NOTHING;

-- Insert sample pause events
INSERT INTO agent_pause_events (
    id, agent_id, event_type, pause_reason, pause_category, 
    start_time, end_time, duration, agent_comment, created_at, updated_at
) VALUES 
(
    'pause_' || extract(epoch from now())::text,
    '509',
    'break',
    'Toilet Break', 
    'personal',
    now() - interval '10 minutes',
    now() - interval '5 minutes',
    300,
    'Test bathroom break',
    now(),
    now()
),
(
    'pause_' || (extract(epoch from now()) + 1)::text,
    '509', 
    'break',
    'Lunch Time',
    'scheduled', 
    now() - interval '2 hours',
    now() - interval '1 hour',
    3600,
    'Lunch break',
    now() - interval '2 hours',
    now()
),
(
    'pause_' || (extract(epoch from now()) + 2)::text,
    '509',
    'break', 
    'Break Time',
    'scheduled',
    now() - interval '30 minutes',
    now() - interval '15 minutes', 
    900,
    'Coffee break',
    now() - interval '30 minutes',
    now()
);

SELECT 'Successfully created pause events' as result;
EOF

    # Execute the SQL
    if psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f /tmp/create_pause_events.sql 2>/dev/null; then
        echo "✅ Sample pause events created successfully!"
        echo "📊 You should now see data in the Pause Reasons report"
        echo "🌐 Check at: http://localhost:3000/reports/pause_reasons"
    else
        echo "❌ Database connection failed"
        echo "ℹ️  Please use the manual steps above"
    fi
    
    # Clean up
    rm -f /tmp/create_pause_events.sql
fi

echo ""
echo "🎯 Next Steps:"
echo "1. 🔄 Refresh the Pause Reasons report page"
echo "2. 📊 Check that the stats now show data instead of zeros"  
echo "3. 📋 Verify the 'Recent Pause Events' table shows entries"
echo "4. 🔍 Try filtering by different date ranges"
echo ""
echo "✨ If you see data, the system is working correctly!"
echo "🚨 If still empty, there may be an API authentication issue"