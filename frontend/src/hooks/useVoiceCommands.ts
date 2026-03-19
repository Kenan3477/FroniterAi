/**
 * useVoiceCommands Hook
 * Provides voice recognition and command processing for admin quick actions
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface VoiceCommand {
  command: string;
  confidence: number;
  timestamp: Date;
  processed: boolean;
  action?: any;
}

interface VoiceCommandsHookReturn {
  isListening: boolean;
  isSupported: boolean;
  lastCommand: VoiceCommand | null;
  startListening: () => void;
  stopListening: () => void;
  processedCommands: VoiceCommand[];
  clearHistory: () => void;
}

export const useVoiceCommands = (): VoiceCommandsHookReturn => {
  const { user, getAuthHeaders } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [processedCommands, setProcessedCommands] = useState<VoiceCommand[]>([]);
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        setIsSupported(true);
        
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          console.log('🎤 Voice recognition started');
        };

        recognition.onresult = (event: any) => {
          const result = event.results[0][0];
          const command: VoiceCommand = {
            command: result.transcript,
            confidence: result.confidence,
            timestamp: new Date(),
            processed: false
          };
          
          setLastCommand(command);
          processVoiceCommand(command);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } else {
        console.log('Speech recognition not supported');
        setIsSupported(false);
      }
    }
  }, []);

  // Process voice command through API
  const processVoiceCommand = useCallback(async (command: VoiceCommand) => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return;

    try {
      const response = await fetch('/api/admin/quick-actions/voice-command', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          command: command.command,
          context: window.location.pathname,
          organizationId: user.organizationId
        })
      });

      if (response.ok) {
        const data = await response.json();
        const processedCommand: VoiceCommand = {
          ...command,
          processed: true,
          action: data.data.processedCommand
        };

        setLastCommand(processedCommand);
        setProcessedCommands(prev => [processedCommand, ...prev].slice(0, 10)); // Keep last 10 commands

        // Execute action if valid
        const actionData = data.data.processedCommand.actionData;
        if (actionData && actionData.href && actionData.href !== '#') {
          // Small delay for user feedback
          setTimeout(() => {
            if (actionData.type === 'help') {
              // Show help modal or notification
              showVoiceHelp(actionData);
            } else {
              window.location.href = actionData.href;
            }
          }, 500);
        }
      }
    } catch (error) {
      console.error('Voice command processing failed:', error);
      const failedCommand: VoiceCommand = {
        ...command,
        processed: false
      };
      setLastCommand(failedCommand);
    }
  }, [user, getAuthHeaders]);

  // Show voice help
  const showVoiceHelp = (actionData: any) => {
    if (actionData.commands) {
      const helpText = `Available voice commands:\n${actionData.commands.join('\n')}`;
      alert(helpText); // In production, use a proper modal
    }
  };

  // Start listening
  const startListening = useCallback(() => {
    if (recognitionRef.current && isSupported && !isListening) {
      try {
        setIsListening(true);
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start voice recognition:', error);
        setIsListening(false);
      }
    }
  }, [isSupported, isListening]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  // Clear command history
  const clearHistory = useCallback(() => {
    setProcessedCommands([]);
    setLastCommand(null);
  }, []);

  return {
    isListening,
    isSupported,
    lastCommand,
    startListening,
    stopListening,
    processedCommands,
    clearHistory
  };
};