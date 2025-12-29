import React, { useState, useEffect } from 'react';

const CampaignDebugPage = () => {
  const [userManagementData, setUserManagementData] = useState(null);
  const [campaignManagementData, setCampaignManagementData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBothEndpoints = async () => {
      try {
        console.log('🔍 Debug: Fetching from both endpoints...');
        
        // Simulate UserManagement call
        const userMgmtResponse = await fetch('/api/admin/campaign-management/campaigns', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        // Simulate CampaignManagement call  
        const campaignMgmtResponse = await fetch('/api/admin/campaign-management/campaigns');

        if (userMgmtResponse.ok && campaignMgmtResponse.ok) {
          const userMgmtData = await userMgmtResponse.json();
          const campaignMgmtData = await campaignMgmtResponse.json();
          
          console.log('🔧 UserManagement Response:', userMgmtData);
          console.log('🔧 CampaignManagement Response:', campaignMgmtData);
          
          setUserManagementData(userMgmtData);
          setCampaignManagementData(campaignMgmtData);
          
          // Process like CampaignManagementPage does
          const campaignsWithDialQueue = (campaignMgmtData.data || []).map((campaign) => ({
            ...campaign,
            dialMethod: campaign.dialMethod || 'MANUAL_DIAL',
            dialSpeed: campaign.dialSpeed || 60,
            isActive: campaign.isActive || false,
            agentCount: campaign.agentCount || 0,
            predictiveDialingEnabled: campaign.predictiveDialingEnabled || false,
            maxConcurrentCalls: campaign.maxConcurrentCalls || 10,
          }));
          
          console.log('🔧 Processed like CampaignManagement:', campaignsWithDialQueue);
        }
      } catch (err) {
        console.error('🚨 Debug error:', err);
        setError(err.message);
      }
    };

    fetchBothEndpoints();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Campaign Debug Comparison</h1>
      
      {error && (
        <div style={{ color: 'red', marginBottom: '20px' }}>
          Error: {error}
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <h2>UserManagement Response</h2>
          <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
            <p>Count: {userManagementData?.data?.length || 0}</p>
            <p>Campaign Names:</p>
            <ul>
              {(userManagementData?.data || []).map(c => (
                <li key={c.id}>{c.name} (Status: {c.status}, Active: {c.isActive ? 'Yes' : 'No'})</li>
              ))}
            </ul>
          </div>
        </div>
        
        <div style={{ flex: 1 }}>
          <h2>CampaignManagement Response</h2>
          <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
            <p>Count: {campaignManagementData?.data?.length || 0}</p>
            <p>Campaign Names:</p>
            <ul>
              {(campaignManagementData?.data || []).map(c => (
                <li key={c.id}>{c.name} (Status: {c.status}, Active: {c.isActive ? 'Yes' : 'No'})</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h2>JSON Data</h2>
        <details>
          <summary>UserManagement Response</summary>
          <pre>{JSON.stringify(userManagementData, null, 2)}</pre>
        </details>
        <details>
          <summary>CampaignManagement Response</summary>
          <pre>{JSON.stringify(campaignManagementData, null, 2)}</pre>
        </details>
      </div>
    </div>
  );
};

export default CampaignDebugPage;