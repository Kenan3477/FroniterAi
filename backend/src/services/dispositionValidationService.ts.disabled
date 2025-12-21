// Real-time Disposition Validation and Rule Engine
import { PrismaClient } from '@prisma/client';
import { eventManager } from './eventManager';
import { EventPriority } from '../types/events';
import { automatedDispositionService } from './automatedDispositionService';

const prisma = new PrismaClient();

// Enhanced validation types
interface ValidationRule {
  id: string;
  name: string;
  dispositionId: string;
  campaignId?: string; // If null, applies to all campaigns
  field: string;
  validationType: 'required' | 'length' | 'format' | 'range' | 'custom';
  criteria: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    minValue?: number;
    maxValue?: number;
    allowedValues?: string[];
    customValidator?: string; // Function name for custom validation
  };
  errorMessage: string;
  isActive: boolean;
  priority: number;
}

interface DispositionValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  score: number; // 0-100 quality score
}

interface ValidationError {
  field: string;
  rule: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
}

interface ValidationWarning {
  field: string;
  rule: string;
  message: string;
  suggestion?: string;
}

// Enhanced disposition completion data
interface EnhancedDispositionData {
  callId: string;
  dispositionId: string;
  notes?: string;
  leadScore?: number;
  saleAmount?: number;
  followUpDate?: Date;
  customFields: Record<string, any>;
  outcomes: {
    appointment_set?: boolean;
    demo_scheduled?: boolean;
    literature_sent?: boolean;
    callback_requested?: boolean;
    sale_value?: number;
    product_interest?: string[];
  };
  compliance: {
    consent_recorded?: boolean;
    dnc_requested?: boolean;
    privacy_notice_given?: boolean;
    data_protection_consent?: boolean;
  };
  analytics: {
    sentiment?: 'positive' | 'neutral' | 'negative';
    objections?: string[];
    keywords_mentioned?: string[];
    engagement_level?: number; // 1-10
  };
}

class DispositionValidationService {
  private validationRules: Map<string, ValidationRule[]> = new Map();
  private customValidators: Map<string, Function> = new Map();

  constructor() {
    this.loadValidationRules();
    this.setupCustomValidators();
  }

  /**
   * Load validation rules from configuration
   */
  private async loadValidationRules(): Promise<void> {
    // In production, these would be loaded from database
    const defaultRules: ValidationRule[] = [
      {
        id: 'sale_amount_required',
        name: 'Sale Amount Required for Sales',
        dispositionId: 'sale_closed',
        field: 'saleAmount',
        validationType: 'required',
        criteria: {},
        errorMessage: 'Sale amount is required when disposition is set to Sale Closed',
        isActive: true,
        priority: 1,
      },
      {
        id: 'sale_amount_minimum',
        name: 'Sale Amount Minimum Value',
        dispositionId: 'sale_closed',
        field: 'saleAmount',
        validationType: 'range',
        criteria: { minValue: 0.01 },
        errorMessage: 'Sale amount must be greater than £0.00',
        isActive: true,
        priority: 1,
      },
      {
        id: 'followup_date_future',
        name: 'Follow-up Date Must Be Future',
        dispositionId: 'callback_requested',
        field: 'followUpDate',
        validationType: 'custom',
        criteria: { customValidator: 'isFutureDate' },
        errorMessage: 'Follow-up date must be in the future',
        isActive: true,
        priority: 1,
      },
      {
        id: 'notes_minimum_length',
        name: 'Minimum Notes Length for Qualified Leads',
        dispositionId: 'qualified_lead',
        field: 'notes',
        validationType: 'length',
        criteria: { minLength: 20 },
        errorMessage: 'Notes must be at least 20 characters for qualified leads',
        isActive: true,
        priority: 2,
      },
      {
        id: 'lead_score_range',
        name: 'Lead Score Valid Range',
        dispositionId: 'qualified_lead',
        field: 'leadScore',
        validationType: 'range',
        criteria: { minValue: 1, maxValue: 10 },
        errorMessage: 'Lead score must be between 1 and 10',
        isActive: true,
        priority: 1,
      },
      {
        id: 'dnc_consent_confirmation',
        name: 'DNC Request Confirmation Required',
        dispositionId: 'do_not_call',
        field: 'compliance.dnc_requested',
        validationType: 'required',
        criteria: {},
        errorMessage: 'DNC request confirmation must be recorded',
        isActive: true,
        priority: 1,
      },
      {
        id: 'phone_format_validation',
        name: 'Phone Number Format Validation',
        dispositionId: 'wrong_number',
        field: 'customFields.correct_number',
        validationType: 'format',
        criteria: { pattern: '^(\\+44|0)[1-9]\\d{8,9}$' },
        errorMessage: 'Correct phone number must be in valid UK format',
        isActive: true,
        priority: 2,
      },
    ];

    // Group rules by disposition
    for (const rule of defaultRules) {
      const dispositionRules = this.validationRules.get(rule.dispositionId) || [];
      dispositionRules.push(rule);
      this.validationRules.set(rule.dispositionId, dispositionRules);
    }

    console.log(`📋 Loaded ${defaultRules.length} validation rules across ${this.validationRules.size} dispositions`);
  }

  /**
   * Setup custom validation functions
   */
  private setupCustomValidators(): void {
    this.customValidators.set('isFutureDate', (value: any) => {
      if (!value) return false;
      const date = new Date(value);
      return date > new Date();
    });

    this.customValidators.set('isValidPhoneNumber', (value: string) => {
      if (!value) return false;
      const phoneRegex = /^(\+44|0)[1-9]\d{8,9}$/;
      return phoneRegex.test(value.replace(/\s+/g, ''));
    });

    this.customValidators.set('isValidEmail', (value: string) => {
      if (!value) return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    });

    this.customValidators.set('isValidCurrency', (value: any) => {
      if (value === null || value === undefined) return false;
      const num = parseFloat(value);
      return !isNaN(num) && num >= 0 && num <= 1000000; // Max £1M
    });

    console.log(`🛠️  Registered ${this.customValidators.size} custom validators`);
  }

  /**
   * Validate disposition data with enhanced rules
   */
  async validateDisposition(
    callId: string,
    data: EnhancedDispositionData
  ): Promise<DispositionValidationResult> {
    try {
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      const suggestions: string[] = [];

      // Get disposition rules
      const dispositionRules = this.validationRules.get(data.dispositionId) || [];
      const sortedRules = dispositionRules.sort((a, b) => a.priority - b.priority);

      // Get campaign-specific configuration
      const call = await prisma.call.findUnique({
        where: { id: callId },
        include: { campaign: true },
      });

      if (!call) {
        errors.push({
          field: 'callId',
          rule: 'call_exists',
          message: 'Call not found',
          severity: 'high',
        });
        return { isValid: false, errors, warnings, suggestions, score: 0 };
      }

      const campaignConfig = automatedDispositionService.getCampaignDispositionConfig(call.campaignId);

      // Run validation rules
      for (const rule of sortedRules) {
        const fieldValue = this.getNestedValue(data, rule.field);
        const validation = await this.validateField(rule, fieldValue, data);

        if (!validation.isValid) {
          errors.push({
            field: rule.field,
            rule: rule.id,
            message: rule.errorMessage,
            severity: rule.priority === 1 ? 'high' : rule.priority === 2 ? 'medium' : 'low',
          });
        }
      }

      // Campaign-specific validation
      if (campaignConfig) {
        const campaignValidation = await this.validateCampaignRequirements(
          call.campaignId,
          data.dispositionId,
          data,
          campaignConfig
        );
        errors.push(...campaignValidation.errors);
        warnings.push(...campaignValidation.warnings);
      }

      // Generate quality suggestions
      this.generateQualitySuggestions(data, suggestions);

      // Calculate quality score
      const score = this.calculateQualityScore(data, errors, warnings);

      const result: DispositionValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions,
        score,
      };

      // Emit validation event
      await eventManager.emitEvent({
        type: 'disposition.validated',
        callId,
        dispositionId: data.dispositionId,
        agentId: 'current_agent', // Would be passed in real implementation
        validationErrors: errors.map(e => e.message),
        metadata: {
          score,
          warningCount: warnings.length,
          suggestionCount: suggestions.length,
        },
      } as any, `agent:current_agent`, EventPriority.HIGH);

      return result;

    } catch (error) {
      console.error('Error validating disposition:', error);
      return {
        isValid: false,
        errors: [{
          field: 'general',
          rule: 'validation_error',
          message: 'Validation system error occurred',
          severity: 'high',
        }],
        warnings: [],
        suggestions: [],
        score: 0,
      };
    }
  }

  /**
   * Validate a single field against a rule
   */
  private async validateField(rule: ValidationRule, value: any, data: EnhancedDispositionData): Promise<{ isValid: boolean; message?: string }> {
    switch (rule.validationType) {
      case 'required':
        return {
          isValid: value !== null && value !== undefined && value !== '',
          message: value ? undefined : 'Field is required',
        };

      case 'length':
        if (typeof value !== 'string') {
          return { isValid: false, message: 'Field must be a string' };
        }
        const { minLength, maxLength } = rule.criteria;
        const isValid = (!minLength || value.length >= minLength) && (!maxLength || value.length <= maxLength);
        return {
          isValid,
          message: isValid ? undefined : `Length must be between ${minLength || 0} and ${maxLength || 'unlimited'} characters`,
        };

      case 'format':
        if (typeof value !== 'string') {
          return { isValid: false, message: 'Field must be a string' };
        }
        const pattern = new RegExp(rule.criteria.pattern!);
        return {
          isValid: pattern.test(value),
          message: pattern.test(value) ? undefined : 'Invalid format',
        };

      case 'range':
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          return { isValid: false, message: 'Field must be a number' };
        }
        const { minValue, maxValue } = rule.criteria;
        const inRange = (!minValue || numValue >= minValue) && (!maxValue || numValue <= maxValue);
        return {
          isValid: inRange,
          message: inRange ? undefined : `Value must be between ${minValue || 'unlimited'} and ${maxValue || 'unlimited'}`,
        };

      case 'custom':
        const validatorName = rule.criteria.customValidator!;
        const validator = this.customValidators.get(validatorName);
        if (!validator) {
          return { isValid: false, message: 'Custom validator not found' };
        }
        return {
          isValid: validator(value),
          message: validator(value) ? undefined : 'Custom validation failed',
        };

      default:
        return { isValid: true };
    }
  }

  /**
   * Validate campaign-specific requirements
   */
  private async validateCampaignRequirements(
    campaignId: string,
    dispositionId: string,
    data: EnhancedDispositionData,
    config: any
  ): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const requirements = config.mandatoryFields?.[dispositionId];
    if (!requirements) {
      return { errors, warnings };
    }

    // Check mandatory fields
    if (requirements.notes && (!data.notes || data.notes.trim() === '')) {
      errors.push({
        field: 'notes',
        rule: 'campaign_required_notes',
        message: 'Notes are mandatory for this disposition in this campaign',
        severity: 'high',
      });
    }

    if (requirements.leadScore && (!data.leadScore || data.leadScore < 1 || data.leadScore > 10)) {
      errors.push({
        field: 'leadScore',
        rule: 'campaign_required_lead_score',
        message: 'Lead score (1-10) is mandatory for this disposition in this campaign',
        severity: 'high',
      });
    }

    if (requirements.saleAmount && (!data.saleAmount || data.saleAmount <= 0)) {
      errors.push({
        field: 'saleAmount',
        rule: 'campaign_required_sale_amount',
        message: 'Sale amount is mandatory for this disposition in this campaign',
        severity: 'high',
      });
    }

    if (requirements.followUpDate && !data.followUpDate) {
      errors.push({
        field: 'followUpDate',
        rule: 'campaign_required_followup',
        message: 'Follow-up date is mandatory for this disposition in this campaign',
        severity: 'high',
      });
    }

    // Check custom fields
    for (const customField of requirements.customFields || []) {
      if (!data.customFields[customField]) {
        errors.push({
          field: `customFields.${customField}`,
          rule: 'campaign_required_custom_field',
          message: `${customField} is mandatory for this disposition in this campaign`,
          severity: 'medium',
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Generate quality improvement suggestions
   */
  private generateQualitySuggestions(data: EnhancedDispositionData, suggestions: string[]): void {
    // Notes quality suggestions
    if (data.notes && data.notes.length < 50) {
      suggestions.push('Consider adding more detailed notes to improve call record quality');
    }

    // Analytics suggestions
    if (!data.analytics?.sentiment) {
      suggestions.push('Add sentiment analysis to track contact engagement');
    }

    if (!data.analytics?.objections || data.analytics.objections.length === 0) {
      suggestions.push('Record any objections raised during the call for better follow-up');
    }

    // Compliance suggestions
    if (data.dispositionId === 'qualified_lead' && !data.compliance?.consent_recorded) {
      suggestions.push('Ensure marketing consent is recorded for qualified leads');
    }

    // Outcome suggestions
    if (data.dispositionId === 'interested' && !data.outcomes?.appointment_set && !data.followUpDate) {
      suggestions.push('Consider scheduling follow-up appointment for interested contacts');
    }
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(data: EnhancedDispositionData, errors: ValidationError[], warnings: ValidationWarning[]): number {
    let score = 100;

    // Deduct for validation errors
    score -= errors.filter(e => e.severity === 'high').length * 20;
    score -= errors.filter(e => e.severity === 'medium').length * 10;
    score -= errors.filter(e => e.severity === 'low').length * 5;

    // Deduct for warnings
    score -= warnings.length * 3;

    // Add for completeness
    if (data.notes && data.notes.length > 50) score += 5;
    if (data.analytics?.sentiment) score += 3;
    if (data.compliance?.consent_recorded) score += 5;
    if (Object.keys(data.customFields).length > 0) score += 2;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get nested object value by path
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Validate disposition in real-time as data is entered
   */
  async validateFieldRealTime(
    callId: string,
    dispositionId: string,
    field: string,
    value: any
  ): Promise<{ isValid: boolean; message?: string; suggestions?: string[] }> {
    try {
      const rules = this.validationRules.get(dispositionId)?.filter(rule => rule.field === field) || [];
      
      for (const rule of rules) {
        const validation = await this.validateField(rule, value, {} as any);
        if (!validation.isValid) {
          return {
            isValid: false,
            message: validation.message || rule.errorMessage,
          };
        }
      }

      // Generate suggestions for this field
      const suggestions: string[] = [];
      if (field === 'saleAmount' && value && value > 10000) {
        suggestions.push('High value sale - supervisor notification will be triggered');
      }

      return { isValid: true, suggestions };

    } catch (error) {
      console.error('Error in real-time validation:', error);
      return { isValid: true }; // Don't block user input on validation errors
    }
  }

  /**
   * Get validation rules for a disposition
   */
  getValidationRules(dispositionId: string): ValidationRule[] {
    return this.validationRules.get(dispositionId) || [];
  }

  /**
   * Add or update validation rule
   */
  async updateValidationRule(rule: ValidationRule): Promise<void> {
    const rules = this.validationRules.get(rule.dispositionId) || [];
    const existingIndex = rules.findIndex(r => r.id === rule.id);
    
    if (existingIndex >= 0) {
      rules[existingIndex] = rule;
    } else {
      rules.push(rule);
    }
    
    this.validationRules.set(rule.dispositionId, rules);
    console.log(`📝 Updated validation rule ${rule.id} for disposition ${rule.dispositionId}`);
  }
}

// Create and export singleton instance
export const dispositionValidationService = new DispositionValidationService();
export default dispositionValidationService;

// Export types for use in other modules
export type {
  ValidationRule,
  DispositionValidationResult,
  ValidationError,
  ValidationWarning,
  EnhancedDispositionData,
};