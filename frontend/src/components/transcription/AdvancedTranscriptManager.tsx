import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  Brain, 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  DollarSign,
  Play,
  Pause,
  BarChart3
} from 'lucide-react';

interface TranscriptStats {
  total: number;
  processed: number;
  withRecordings: number;
  aiProcessed: number;
  failed: number;
  estimatedCost: number;
}

interface BatchProcessingStatus {
  isRunning: boolean;
  progress: number;
  currentCall?: string;
  processed: number;
  failed: number;
  estimatedCost: number;
}

const AdvancedTranscriptManager: React.FC = () => {
  const [stats, setStats] = useState<TranscriptStats | null>(null);
  const [batchStatus, setBatchStatus] = useState<BatchProcessingStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchLimit, setBatchLimit] = useState(5);

  useEffect(() => {
    loadStats();
    
    // Poll for batch status if processing
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      interval = setInterval(checkBatchStatus, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing]);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/transcript/batch-status');
      const data = await response.json();
      setStats(data.stats);
      
      if (data.batchStatus?.isRunning) {
        setIsProcessing(true);
        setBatchStatus(data.batchStatus);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const checkBatchStatus = async () => {
    try {
      const response = await fetch('/api/transcript/batch-status');
      const data = await response.json();
      
      if (data.batchStatus) {
        setBatchStatus(data.batchStatus);
        
        if (!data.batchStatus.isRunning && isProcessing) {
          setIsProcessing(false);
          loadStats(); // Refresh stats when processing completes
        }
      }
    } catch (error) {
      console.error('Failed to check batch status:', error);
    }
  };

  const startBatchProcessing = async () => {
    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/transcript/batch-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: batchLimit, onlyWithRecordings: true })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Batch processing failed');
      }
      
      // Start polling for status
      checkBatchStatus();
    } catch (error) {
      console.error('Failed to start batch processing:', error);
      setIsProcessing(false);
    }
  };

  const stopBatchProcessing = async () => {
    try {
      await fetch('/api/transcript/batch-stop', { method: 'POST' });
      setIsProcessing(false);
      setBatchStatus(null);
      loadStats();
    } catch (error) {
      console.error('Failed to stop batch processing:', error);
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(4)}`;
  
  const getProgressPercentage = () => {
    if (!batchStatus || !stats) return 0;
    return Math.round((batchStatus.processed / batchLimit) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <Brain className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Advanced AI Transcription</h2>
          <p className="text-muted-foreground">
            OpenAI Whisper + GPT-powered call analysis and sentiment detection
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Total Calls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.withRecordings} with recordings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Processed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.aiProcessed}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((stats.aiProcessed / stats.withRecordings) * 100)}% coverage
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Failed/Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {stats.withRecordings - stats.aiProcessed}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.failed} failed attempts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Estimated Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.estimatedCost)}</div>
              <p className="text-xs text-muted-foreground">
                ~{formatCurrency(stats.estimatedCost / Math.max(stats.aiProcessed, 1))} per call
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Batch Processing Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Batch AI Processing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isProcessing ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="batch-limit" className="text-sm font-medium">
                  Process limit:
                </label>
                <input
                  id="batch-limit"
                  type="number"
                  min="1"
                  max="50"
                  value={batchLimit}
                  onChange={(e) => setBatchLimit(parseInt(e.target.value) || 5)}
                  className="w-20 px-2 py-1 border rounded text-sm"
                />
                <span className="text-xs text-muted-foreground">calls</span>
              </div>
              
              <Button 
                onClick={startBatchProcessing}
                className="flex items-center gap-2"
                disabled={!stats || stats.withRecordings === stats.aiProcessed}
              >
                <Play className="h-4 w-4" />
                Start AI Processing
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  Processing {batchStatus?.currentCall || 'calls'}...
                </span>
                <Button 
                  onClick={stopBatchProcessing}
                  variant="destructive"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Pause className="h-4 w-4" />
                  Stop
                </Button>
              </div>
              
              <Progress value={getProgressPercentage()} className="w-full" />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {batchStatus?.processed || 0} processed, {batchStatus?.failed || 0} failed
                </span>
                <span>
                  Cost: {formatCurrency(batchStatus?.estimatedCost || 0)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            AI Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium">OpenAI Whisper Transcription</h4>
                <p className="text-sm text-muted-foreground">
                  High-accuracy speech-to-text with support for multiple languages
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium">GPT Sentiment Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  Real-time emotion detection and customer satisfaction scoring
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Call Classification</h4>
                <p className="text-sm text-muted-foreground">
                  Automatic outcome detection: sales, callbacks, complaints, etc.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Agent Performance Insights</h4>
                <p className="text-sm text-muted-foreground">
                  AI-powered coaching recommendations and quality scoring
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedTranscriptManager;