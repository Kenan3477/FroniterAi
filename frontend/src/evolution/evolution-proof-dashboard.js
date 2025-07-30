/**
 * 📈 Evolution Proof Dashboard
 * Real-time monitoring and proof display for autonomous evolution
 */

class EvolutionProofDashboard {
    constructor() {
        this.initialized = false;
        this.autonomousEvolution = null;
        this.updateInterval = null;
        this.proofHistory = [];
        this.realTimeMetrics = new Map();
        
        console.log('📈 Evolution Proof Dashboard initialized');
    }

    async initialize(evolutionSystem) {
        try {
            console.log('🚀 Initializing Evolution Proof Dashboard...');
            
            this.autonomousEvolution = evolutionSystem;
            
            // Create dashboard interface
            await this.createDashboardInterface();
            
            // Setup real-time monitoring
            await this.setupRealTimeMonitoring();
            
            // Initialize proof tracking
            await this.initializeProofTracking();
            
            this.initialized = true;
            console.log('✅ Evolution Proof Dashboard ready');
            
            return { status: 'initialized' };
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
            throw error;
        }
    }

    async createDashboardInterface() {
        const dashboardContainer = document.createElement('div');
        dashboardContainer.id = 'evolution-proof-dashboard';
        dashboardContainer.className = 'evolution-proof-dashboard';
        
        dashboardContainer.innerHTML = `
            <div class="dashboard-header">
                <h1>📈 Frontier Evolution Proof Dashboard</h1>
                <div class="live-indicator">
                    <span class="pulse-dot"></span>
                    <span class="live-text">LIVE MONITORING</span>
                </div>
            </div>
            
            <div class="dashboard-content">
                <div class="proof-summary-section">
                    <h2>🎯 Evolution Verification Summary</h2>
                    <div class="summary-grid">
                        <div class="summary-card verified">
                            <h3>Verified Evolutions</h3>
                            <div class="big-number" id="verified-count">0</div>
                            <div class="trend" id="verified-trend">↗️ +0 today</div>
                        </div>
                        <div class="summary-card accuracy">
                            <h3>Verification Accuracy</h3>
                            <div class="big-number" id="accuracy-rate">100%</div>
                            <div class="trend" id="accuracy-trend">↗️ High confidence</div>
                        </div>
                        <div class="summary-card generation">
                            <h3>Current Generation</h3>
                            <div class="big-number" id="current-generation">0</div>
                            <div class="trend" id="generation-trend">🧬 Evolving</div>
                        </div>
                        <div class="summary-card velocity">
                            <h3>Evolution Velocity</h3>
                            <div class="big-number" id="evolution-velocity">0.0</div>
                            <div class="trend" id="velocity-trend">📈 per day</div>
                        </div>
                    </div>
                </div>
                
                <div class="real-time-section">
                    <h2>📊 Real-Time Capability Tracking</h2>
                    <div class="capability-grid">
                        <div class="capability-card">
                            <h4>🧠 Reasoning</h4>
                            <div class="capability-bar">
                                <div class="capability-progress" id="reasoning-progress" style="width: 0%"></div>
                                <div class="capability-baseline" id="reasoning-baseline"></div>
                            </div>
                            <div class="capability-values">
                                <span class="baseline">Baseline: <span id="reasoning-baseline-val">0.0</span></span>
                                <span class="current">Current: <span id="reasoning-current-val">0.0</span></span>
                                <span class="improvement" id="reasoning-improvement">+0.0%</span>
                            </div>
                        </div>
                        
                        <div class="capability-card">
                            <h4>🎯 Problem Solving</h4>
                            <div class="capability-bar">
                                <div class="capability-progress" id="problem-solving-progress" style="width: 0%"></div>
                                <div class="capability-baseline" id="problem-solving-baseline"></div>
                            </div>
                            <div class="capability-values">
                                <span class="baseline">Baseline: <span id="problem-solving-baseline-val">0.0</span></span>
                                <span class="current">Current: <span id="problem-solving-current-val">0.0</span></span>
                                <span class="improvement" id="problem-solving-improvement">+0.0%</span>
                            </div>
                        </div>
                        
                        <div class="capability-card">
                            <h4>🎨 Creativity</h4>
                            <div class="capability-bar">
                                <div class="capability-progress" id="creativity-progress" style="width: 0%"></div>
                                <div class="capability-baseline" id="creativity-baseline"></div>
                            </div>
                            <div class="capability-values">
                                <span class="baseline">Baseline: <span id="creativity-baseline-val">0.0</span></span>
                                <span class="current">Current: <span id="creativity-current-val">0.0</span></span>
                                <span class="improvement" id="creativity-improvement">+0.0%</span>
                            </div>
                        </div>
                        
                        <div class="capability-card">
                            <h4>💬 Communication</h4>
                            <div class="capability-bar">
                                <div class="capability-progress" id="communication-progress" style="width: 0%"></div>
                                <div class="capability-baseline" id="communication-baseline"></div>
                            </div>
                            <div class="capability-values">
                                <span class="baseline">Baseline: <span id="communication-baseline-val">0.0</span></span>
                                <span class="current">Current: <span id="communication-current-val">0.0</span></span>
                                <span class="improvement" id="communication-improvement">+0.0%</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="proof-log-section">
                    <h2>📋 Evolution Proof Log</h2>
                    <div class="proof-controls">
                        <button id="export-proof-btn" class="proof-button">📊 Export Full Proof</button>
                        <button id="verify-now-btn" class="proof-button">🔍 Verify Current State</button>
                        <button id="clear-log-btn" class="proof-button">🗑️ Clear Log</button>
                    </div>
                    <div id="proof-log" class="proof-log"></div>
                </div>
                
                <div class="evidence-section">
                    <h2>🔍 Latest Evolution Evidence</h2>
                    <div id="evidence-container" class="evidence-container"></div>
                </div>
            </div>
        `;
        
        // Add to document
        const targetContainer = document.getElementById('app') || document.body;
        targetContainer.appendChild(dashboardContainer);
        
        // Add CSS styles
        this.addDashboardStyles();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    addDashboardStyles() {
        const styles = `
            <style>
                .evolution-proof-dashboard {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 20px;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                    min-height: 100vh;
                    color: white;
                }
                
                .dashboard-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                    padding: 20px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 15px;
                    backdrop-filter: blur(10px);
                }
                
                .dashboard-header h1 {
                    margin: 0;
                    font-size: 2.2em;
                    font-weight: 700;
                }
                
                .live-indicator {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.9em;
                    font-weight: 600;
                }
                
                .pulse-dot {
                    width: 8px;
                    height: 8px;
                    background: #ff4444;
                    border-radius: 50%;
                    animation: pulse 1s infinite;
                }
                
                @keyframes pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.2); }
                    100% { opacity: 1; transform: scale(1); }
                }
                
                .dashboard-content {
                    display: grid;
                    gap: 30px;
                }
                
                .proof-summary-section {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 15px;
                    padding: 25px;
                    backdrop-filter: blur(10px);
                }
                
                .proof-summary-section h2 {
                    margin: 0 0 20px 0;
                    font-size: 1.4em;
                }
                
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                }
                
                .summary-card {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 20px;
                    text-align: center;
                    backdrop-filter: blur(5px);
                    border: 2px solid rgba(255, 255, 255, 0.2);
                }
                
                .summary-card.verified {
                    border-color: #4CAF50;
                }
                
                .summary-card.accuracy {
                    border-color: #2196F3;
                }
                
                .summary-card.generation {
                    border-color: #FF9800;
                }
                
                .summary-card.velocity {
                    border-color: #E91E63;
                }
                
                .summary-card h3 {
                    margin: 0 0 10px 0;
                    font-size: 0.9em;
                    opacity: 0.8;
                }
                
                .big-number {
                    font-size: 2.5em;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                
                .trend {
                    font-size: 0.8em;
                    opacity: 0.7;
                }
                
                .real-time-section {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 15px;
                    padding: 25px;
                    backdrop-filter: blur(10px);
                }
                
                .real-time-section h2 {
                    margin: 0 0 20px 0;
                    font-size: 1.4em;
                }
                
                .capability-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                }
                
                .capability-card {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 20px;
                    backdrop-filter: blur(5px);
                }
                
                .capability-card h4 {
                    margin: 0 0 15px 0;
                    font-size: 1.1em;
                }
                
                .capability-bar {
                    width: 100%;
                    height: 20px;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 10px;
                    position: relative;
                    margin-bottom: 10px;
                    overflow: hidden;
                }
                
                .capability-progress {
                    height: 100%;
                    background: linear-gradient(90deg, #4CAF50, #8BC34A);
                    border-radius: 10px;
                    transition: width 0.5s ease;
                }
                
                .capability-baseline {
                    position: absolute;
                    top: 0;
                    height: 100%;
                    width: 2px;
                    background: #FFC107;
                    opacity: 0.8;
                }
                
                .capability-values {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.8em;
                }
                
                .capability-values .improvement {
                    color: #4CAF50;
                    font-weight: bold;
                }
                
                .proof-log-section {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 15px;
                    padding: 25px;
                    backdrop-filter: blur(10px);
                }
                
                .proof-log-section h2 {
                    margin: 0 0 20px 0;
                    font-size: 1.4em;
                }
                
                .proof-controls {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                }
                
                .proof-button {
                    padding: 10px 15px;
                    border: none;
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 0.9em;
                }
                
                .proof-button:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: translateY(-2px);
                }
                
                .proof-log {
                    height: 300px;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 10px;
                    padding: 15px;
                    overflow-y: auto;
                    font-family: monospace;
                    font-size: 12px;
                    line-height: 1.4;
                }
                
                .proof-entry {
                    margin-bottom: 8px;
                    padding: 5px 8px;
                    border-radius: 4px;
                    border-left: 3px solid #4CAF50;
                    background: rgba(255, 255, 255, 0.05);
                }
                
                .proof-entry.verified {
                    border-left-color: #4CAF50;
                }
                
                .proof-entry.improvement {
                    border-left-color: #2196F3;
                }
                
                .proof-entry.warning {
                    border-left-color: #FF9800;
                }
                
                .evidence-section {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 15px;
                    padding: 25px;
                    backdrop-filter: blur(10px);
                }
                
                .evidence-section h2 {
                    margin: 0 0 20px 0;
                    font-size: 1.4em;
                }
                
                .evidence-container {
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 10px;
                    padding: 20px;
                    min-height: 200px;
                }
                
                .evidence-item {
                    margin-bottom: 15px;
                    padding: 15px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    border-left: 4px solid #4CAF50;
                }
                
                .evidence-header {
                    font-weight: bold;
                    margin-bottom: 8px;
                    color: #4CAF50;
                }
                
                .evidence-details {
                    font-size: 0.9em;
                    line-height: 1.4;
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    setupEventListeners() {
        document.getElementById('export-proof-btn')?.addEventListener('click', () => {
            this.exportFullProof();
        });
        
        document.getElementById('verify-now-btn')?.addEventListener('click', () => {
            this.verifyCurrentState();
        });
        
        document.getElementById('clear-log-btn')?.addEventListener('click', () => {
            this.clearProofLog();
        });
    }

    async setupRealTimeMonitoring() {
        console.log('📊 Setting up real-time proof monitoring...');
        
        // Update dashboard every 3 seconds
        this.updateInterval = setInterval(async () => {
            await this.updateDashboard();
        }, 3000);
        
        // Initial update
        await this.updateDashboard();
    }

    async initializeProofTracking() {
        console.log('📋 Initializing proof tracking...');
        
        this.logProofEvent('🚀 Evolution proof tracking started', 'system');
        this.logProofEvent('📊 Monitoring all evolution events for verification', 'system');
    }

    async updateDashboard() {
        if (!this.autonomousEvolution) return;
        
        try {
            // Update summary metrics
            await this.updateSummaryMetrics();
            
            // Update capability progression
            await this.updateCapabilityProgression();
            
            // Update latest evidence
            await this.updateLatestEvidence();
            
        } catch (error) {
            console.error('❌ Dashboard update failed:', error);
        }
    }

    async updateSummaryMetrics() {
        const verificationStatus = await this.autonomousEvolution.getVerificationStatus();
        const evolutionStatus = this.autonomousEvolution.getStatus();
        
        if (verificationStatus && !verificationStatus.error) {
            // Update verified count
            document.getElementById('verified-count').textContent = verificationStatus.total_proofs || 0;
            
            // Update accuracy rate
            const accuracy = Math.round((verificationStatus.verification_accuracy || 1) * 100);
            document.getElementById('accuracy-rate').textContent = accuracy + '%';
            
            // Update evolution velocity
            const velocity = (verificationStatus.evolution_velocity || 0).toFixed(2);
            document.getElementById('evolution-velocity').textContent = velocity;
        }
        
        // Update current generation
        document.getElementById('current-generation').textContent = evolutionStatus.current_generation || 0;
    }

    async updateCapabilityProgression() {
        const progression = await this.autonomousEvolution.getCapabilityProgression();
        
        if (progression && !progression.error) {
            const capabilities = ['reasoning', 'problem-solving', 'creativity', 'communication'];
            
            capabilities.forEach(capability => {
                const capabilityKey = capability.replace('-', '_');
                const data = progression[capabilityKey];
                
                if (data) {
                    const progressElement = document.getElementById(`${capability}-progress`);
                    const baselineElement = document.getElementById(`${capability}-baseline`);
                    const baselineValElement = document.getElementById(`${capability}-baseline-val`);
                    const currentValElement = document.getElementById(`${capability}-current-val`);
                    const improvementElement = document.getElementById(`${capability}-improvement`);
                    
                    if (progressElement) {
                        const progressPercent = Math.min((data.current || 0) * 100, 100);
                        progressElement.style.width = progressPercent + '%';
                    }
                    
                    if (baselineElement) {
                        const baselinePercent = (data.baseline || 0) * 100;
                        baselineElement.style.left = baselinePercent + '%';
                    }
                    
                    if (baselineValElement) {
                        baselineValElement.textContent = (data.baseline || 0).toFixed(2);
                    }
                    
                    if (currentValElement) {
                        currentValElement.textContent = (data.current || 0).toFixed(2);
                    }
                    
                    if (improvementElement) {
                        const improvement = data.improvement_percentage || 0;
                        improvementElement.textContent = (improvement >= 0 ? '+' : '') + improvement.toFixed(1) + '%';
                        improvementElement.style.color = improvement >= 0 ? '#4CAF50' : '#f44336';
                    }
                }
            });
        }
    }

    async updateLatestEvidence() {
        const proofs = await this.autonomousEvolution.getLatestEvolutionProofs(3);
        const evidenceContainer = document.getElementById('evidence-container');
        
        if (evidenceContainer && proofs && proofs.length > 0) {
            evidenceContainer.innerHTML = '';
            
            proofs.forEach(proof => {
                const evidenceItem = document.createElement('div');
                evidenceItem.className = 'evidence-item';
                
                evidenceItem.innerHTML = `
                    <div class="evidence-header">
                        🔍 Evolution Proof #${proof.id} - ${new Date(proof.timestamp).toLocaleString()}
                    </div>
                    <div class="evidence-details">
                        <strong>Type:</strong> ${proof.evidence?.evolution_type || 'Unknown'}<br>
                        <strong>Confidence:</strong> ${Math.round((proof.evidence?.confidence_score || 0) * 100)}%<br>
                        <strong>Improvements:</strong> ${proof.evidence?.measurable_improvements?.length || 0} verified<br>
                        <strong>Verification Hash:</strong> ${proof.certification?.proof_hash || 'N/A'}
                    </div>
                `;
                
                evidenceContainer.appendChild(evidenceItem);
            });
        } else if (evidenceContainer) {
            evidenceContainer.innerHTML = '<div style="text-align: center; opacity: 0.7; padding: 40px;">No evolution proofs available yet. System is monitoring for improvements...</div>';
        }
    }

    logProofEvent(message, type = 'info') {
        const proofLog = document.getElementById('proof-log');
        if (!proofLog) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = `proof-entry ${type}`;
        entry.textContent = `[${timestamp}] ${message}`;
        
        proofLog.appendChild(entry);
        proofLog.scrollTop = proofLog.scrollHeight;
        
        // Keep only last 50 entries
        while (proofLog.children.length > 50) {
            proofLog.removeChild(proofLog.firstChild);
        }
        
        // Store in history
        this.proofHistory.push({
            timestamp: Date.now(),
            message,
            type
        });
    }

    async exportFullProof() {
        try {
            this.logProofEvent('📊 Exporting complete evolution proof...', 'system');
            
            const proofData = await this.autonomousEvolution.exportEvolutionProof();
            
            // Create download
            const dataBlob = new Blob([JSON.stringify(proofData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `frontier-evolution-proof-${Date.now()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
            this.logProofEvent('✅ Evolution proof exported successfully', 'verified');
            
        } catch (error) {
            console.error('❌ Proof export failed:', error);
            this.logProofEvent('❌ Proof export failed: ' + error.message, 'warning');
        }
    }

    async verifyCurrentState() {
        try {
            this.logProofEvent('🔍 Running immediate evolution verification...', 'system');
            
            const verificationStatus = await this.autonomousEvolution.getVerificationStatus();
            const progression = await this.autonomousEvolution.getCapabilityProgression();
            
            if (verificationStatus && !verificationStatus.error) {
                this.logProofEvent(`📊 Verification complete: ${verificationStatus.total_proofs} proofs, ${Math.round(verificationStatus.verification_accuracy * 100)}% accuracy`, 'verified');
            }
            
            if (progression && !progression.error) {
                const improvements = Object.keys(progression).filter(key => 
                    progression[key].improvement > 0.05
                );
                
                if (improvements.length > 0) {
                    this.logProofEvent(`📈 Current improvements detected in: ${improvements.join(', ')}`, 'improvement');
                } else {
                    this.logProofEvent('📊 No significant improvements detected since baseline', 'system');
                }
            }
            
        } catch (error) {
            console.error('❌ Verification failed:', error);
            this.logProofEvent('❌ Verification failed: ' + error.message, 'warning');
        }
    }

    clearProofLog() {
        const proofLog = document.getElementById('proof-log');
        if (proofLog) {
            proofLog.innerHTML = '';
        }
        
        this.proofHistory = [];
        this.logProofEvent('🗑️ Proof log cleared', 'system');
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        const dashboard = document.getElementById('evolution-proof-dashboard');
        if (dashboard) {
            dashboard.remove();
        }
        
        this.initialized = false;
    }

    getStatus() {
        return {
            initialized: this.initialized,
            monitoring: !!this.updateInterval,
            proof_events: this.proofHistory.length,
            connected_to_evolution_system: !!this.autonomousEvolution
        };
    }
}

// Export the dashboard
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EvolutionProofDashboard;
} else if (typeof window !== 'undefined') {
    window.EvolutionProofDashboard = EvolutionProofDashboard;
}
