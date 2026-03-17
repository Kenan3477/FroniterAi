/**
 * Test the reports API directly to see if campaign assignments are fixed
 */

const fetch = require('node-fetch');

async function testReportsAPI() {
    console.log('\n🌐 TESTING REPORTS API AFTER CAMPAIGN FIXES\n');
    
    try {
        // Test dashboard API
        console.log('📊 Testing dashboard API...');
        const dashboardResponse = await fetch('https://omnivox-backend-production.up.railway.app/api/reports/dashboard');
        
        if (dashboardResponse.ok) {
            const dashboardData = await dashboardResponse.json();
            console.log('✅ Dashboard API successful');
            console.log(`Widgets returned: ${dashboardData.length}`);
            
            // Show widget details
            for (const widget of dashboardData) {
                console.log(`\nWidget: ${widget.title} (${widget.type})`);
                if (widget.data && widget.data.totalCalls) {
                    console.log(`  Total Calls: ${widget.data.totalCalls}`);
                }
                if (widget.data && widget.data.conversions) {
                    console.log(`  Conversions: ${widget.data.conversions}`);
                }
                if (widget.data && widget.data.conversionRate) {
                    console.log(`  Conversion Rate: ${widget.data.conversionRate}%`);
                }
            }
        } else {
            console.log(`❌ Dashboard API error: ${dashboardResponse.status} - ${dashboardResponse.statusText}`);
        }
        
        // Test reports templates
        console.log('\n📋 Testing report templates...');
        const templatesResponse = await fetch('https://omnivox-backend-production.up.railway.app/api/reports/templates');
        
        if (templatesResponse.ok) {
            const templatesData = await templatesResponse.json();
            console.log('✅ Templates API successful');
            console.log(`Templates available: ${templatesData.length}`);
            
            for (const template of templatesData) {
                console.log(`  - ${template.name}: ${template.description}`);
            }
        } else {
            console.log(`❌ Templates API error: ${templatesResponse.status}`);
        }
        
        // Test individual report generation
        console.log('\n📈 Testing call records report...');
        const reportResponse = await fetch('https://omnivox-backend-production.up.railway.app/api/reports/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                templateId: 'call_records',
                filters: {
                    dateRange: 'last_7_days'
                }
            })
        });
        
        if (reportResponse.ok) {
            const reportData = await reportResponse.json();
            console.log('✅ Call records report generated');
            console.log(`Total records: ${reportData.summary?.totalRecords || 'N/A'}`);
            console.log(`Generated at: ${reportData.generatedAt || 'N/A'}`);
            
            // Show some sample data
            if (reportData.data && Array.isArray(reportData.data) && reportData.data.length > 0) {
                console.log('\nSample call records:');
                for (const call of reportData.data.slice(0, 5)) {
                    console.log(`  Call ${call.callId}: Campaign "${call.campaignName}" - ${call.disposition || 'No disposition'}`);
                }
            }
        } else {
            console.log(`❌ Call records report error: ${reportResponse.status}`);
        }
        
        console.log('\n✅ API TESTING COMPLETE');
        
    } catch (error) {
        console.error('❌ API test error:', error.message);
    }
}

testReportsAPI();