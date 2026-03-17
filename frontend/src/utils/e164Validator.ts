/**
 * E.164 Phone Number Validator for Twilio
 * Ensures uploaded contact data matches Twilio requirements
 */

export interface E164ValidationResult {
  isValid: boolean;
  formatted: string | null;
  error: string | null;
  country?: string;
}

export class E164PhoneValidator {
  
  /**
   * Validate and format phone number to E.164
   */
  static validateAndFormat(phoneNumber: string, defaultCountryCode: string = '44'): E164ValidationResult {
    if (!phoneNumber || phoneNumber.trim() === '') {
      return {
        isValid: false,
        formatted: null,
        error: 'Phone number is required'
      };
    }

    let cleaned = phoneNumber.replace(/[\s\-\(\)\.]/g, ''); // Remove common formatting
    
    // If already in E.164 format
    if (cleaned.startsWith('+')) {
      const e164Regex = /^\+[1-9]\d{1,14}$/;
      if (e164Regex.test(cleaned)) {
        return {
          isValid: true,
          formatted: cleaned,
          error: null
        };
      } else {
        return {
          isValid: false,
          formatted: null,
          error: 'Invalid E.164 format. Must be +[country code][number] (1-15 digits total)'
        };
      }
    }

    // Remove leading zeros
    cleaned = cleaned.replace(/^0+/, '');

    // If it doesn't start with country code, add default
    if (!cleaned.match(/^[1-9]/)) {
      return {
        isValid: false,
        formatted: null,
        error: 'Invalid phone number format'
      };
    }

    // Add default country code if not present
    let formatted: string;
    if (this.isValidCountryCode(cleaned.substring(0, 3))) {
      formatted = `+${cleaned}`;
    } else if (this.isValidCountryCode(cleaned.substring(0, 2))) {
      formatted = `+${cleaned}`;
    } else if (this.isValidCountryCode(cleaned.substring(0, 1))) {
      formatted = `+${cleaned}`;
    } else {
      // Add default country code
      formatted = `+${defaultCountryCode}${cleaned}`;
    }

    // Final E.164 validation
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (e164Regex.test(formatted)) {
      return {
        isValid: true,
        formatted: formatted,
        error: null,
        country: this.getCountryFromE164(formatted)
      };
    } else {
      return {
        isValid: false,
        formatted: null,
        error: `Cannot format to valid E.164: ${formatted}`
      };
    }
  }

  /**
   * Check if a prefix is a valid country code
   */
  private static isValidCountryCode(prefix: string): boolean {
    const commonCountryCodes = [
      '1',    // US/Canada
      '44',   // UK
      '33',   // France
      '49',   // Germany
      '39',   // Italy
      '34',   // Spain
      '61',   // Australia
      '81',   // Japan
      '86',   // China
      '91',   // India
      '7',    // Russia/Kazakhstan
      '55',   // Brazil
      '52',   // Mexico
      '27',   // South Africa
      '971',  // UAE
      '966',  // Saudi Arabia
      '65',   // Singapore
      '852',  // Hong Kong
      '41',   // Switzerland
      '31',   // Netherlands
      '46',   // Sweden
      '47',   // Norway
      '45',   // Denmark
      '358',  // Finland
      '43',   // Austria
      '32',   // Belgium
      '351',  // Portugal
      '30',   // Greece
      '48',   // Poland
      '420',  // Czech Republic
      '36',   // Hungary
      '40',   // Romania
      '385',  // Croatia
      '386',  // Slovenia
      '421',  // Slovakia
      '372',  // Estonia
      '371',  // Latvia
      '370',  // Lithuania
      '353',  // Ireland
      '354',  // Iceland
      '377',  // Monaco
      '376',  // Andorra
      '378',  // San Marino
      '39',   // Vatican
      '356',  // Malta
      '357',  // Cyprus
      '350',  // Gibraltar
      '389',  // Macedonia
      '381',  // Serbia
      '382',  // Montenegro
      '387',  // Bosnia
      '383',  // Kosovo
      '355',  // Albania
      '359',  // Bulgaria
      '90',   // Turkey
    ];

    return commonCountryCodes.includes(prefix);
  }

  /**
   * Get country name from E.164 number (basic implementation)
   */
  private static getCountryFromE164(e164: string): string {
    const number = e164.substring(1); // Remove +

    if (number.startsWith('1')) return 'US/Canada';
    if (number.startsWith('44')) return 'United Kingdom';
    if (number.startsWith('33')) return 'France';
    if (number.startsWith('49')) return 'Germany';
    if (number.startsWith('39')) return 'Italy';
    if (number.startsWith('34')) return 'Spain';
    if (number.startsWith('61')) return 'Australia';
    if (number.startsWith('81')) return 'Japan';
    if (number.startsWith('86')) return 'China';
    if (number.startsWith('91')) return 'India';
    if (number.startsWith('7')) return 'Russia/Kazakhstan';
    if (number.startsWith('55')) return 'Brazil';
    if (number.startsWith('52')) return 'Mexico';
    if (number.startsWith('971')) return 'UAE';
    if (number.startsWith('966')) return 'Saudi Arabia';
    
    return 'Unknown';
  }

  /**
   * Batch validate array of phone numbers
   */
  static validateBatch(phoneNumbers: string[], defaultCountryCode: string = '44'): {
    valid: string[];
    invalid: { original: string; error: string }[];
  } {
    const valid: string[] = [];
    const invalid: { original: string; error: string }[] = [];

    phoneNumbers.forEach(phone => {
      const result = this.validateAndFormat(phone, defaultCountryCode);
      if (result.isValid && result.formatted) {
        valid.push(result.formatted);
      } else {
        invalid.push({
          original: phone,
          error: result.error || 'Unknown error'
        });
      }
    });

    return { valid, invalid };
  }

  /**
   * Common phone number formats for testing
   */
  static getTestNumbers(): { description: string; number: string; expectedE164: string }[] {
    return [
      {
        description: 'UK mobile (07 format)',
        number: '07700900123',
        expectedE164: '+447700900123'
      },
      {
        description: 'UK landline (020 format)',  
        number: '02071234567',
        expectedE164: '+442071234567'
      },
      {
        description: 'US number',
        number: '(555) 123-4567',
        expectedE164: '+15551234567'
      },
      {
        description: 'Already E.164',
        number: '+447700900123',
        expectedE164: '+447700900123'
      },
      {
        description: 'International format',
        number: '+33123456789',
        expectedE164: '+33123456789'
      }
    ];
  }
}

/**
 * React Hook for E.164 validation
 */
export function useE164Validation(defaultCountryCode: string = '44') {
  const validatePhoneNumber = (phoneNumber: string): E164ValidationResult => {
    return E164PhoneValidator.validateAndFormat(phoneNumber, defaultCountryCode);
  };

  const validateBatch = (phoneNumbers: string[]): {
    valid: string[];
    invalid: { original: string; error: string }[];
  } => {
    return E164PhoneValidator.validateBatch(phoneNumbers, defaultCountryCode);
  };

  return {
    validatePhoneNumber,
    validateBatch,
    testNumbers: E164PhoneValidator.getTestNumbers()
  };
}