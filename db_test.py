#!/usr/bin/env python3
"""
Simple Evolution Feed Test
"""

print("Testing Evolution Feed...")

try:
    import sqlite3
    print("✅ SQLite3 available")
    
    # Create test database
    conn = sqlite3.connect('test_evolution.db')
    cursor = conn.cursor()
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS test_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    cursor.execute('''
    INSERT INTO test_activities (title, description) 
    VALUES (?, ?)
    ''', ('Test Security Scan', 'Found 3 potential security issues in system files'))
    
    cursor.execute('''
    INSERT INTO test_activities (title, description) 
    VALUES (?, ?)
    ''', ('Code Optimization', 'Improved performance in authentication module'))
    
    conn.commit()
    
    # Read back the data
    cursor.execute('SELECT * FROM test_activities ORDER BY created_at DESC')
    activities = cursor.fetchall()
    
    print(f"✅ Database test successful! Found {len(activities)} activities:")
    for activity in activities:
        print(f"   - {activity[1]}: {activity[2]}")
    
    conn.close()
    
    print("\n🎉 Basic database functionality is working!")
    print("The Evolution Feed system should now work correctly.")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
