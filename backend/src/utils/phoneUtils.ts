/**
 * Enhanced phone number utilities for Omnivox AI
 * Handles UK phone number normalization and matching
 */

/**
 * Normalize phone number to standard format for database storage and comparison
 */
export function normalizePhoneNumber(phone: string): string | null {
  if (!phone) return null;
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length === 0) return null;
  
  // Handle UK numbers
  if (digitsOnly.startsWith('44')) {
    // Already in international format
    if (digitsOnly.length >= 12) {
      return '+' + digitsOnly;
    }
    return '+44' + digitsOnly.substring(2);
  }
  
  // Handle numbers starting with 0 (UK domestic format)
  if (digitsOnly.startsWith('0') && digitsOnly.length === 11) {
    return '+44' + digitsOnly.substring(1);
  }
  
  // Handle 10-digit mobile numbers (assume UK)
  if (digitsOnly.length === 10 && digitsOnly.startsWith('7')) {
    return '+44' + digitsOnly;
  }
  
  // Handle other lengths - assume UK if reasonable length
  if (digitsOnly.length >= 10 && digitsOnly.length <= 11) {
    if (digitsOnly.startsWith('0')) {
      return '+44' + digitsOnly.substring(1);
    } else {
      return '+44' + digitsOnly;
    }
  }
  
  // For other cases, just add + if not present
  return phone.startsWith('+') ? phone : '+' + digitsOnly;
}

/**
 * Check if two phone numbers are equivalent
 */
export function arePhoneNumbersEquivalent(phone1: string, phone2: string): boolean {
  const normalized1 = normalizePhoneNumber(phone1);
  const normalized2 = normalizePhoneNumber(phone2);
  
  return normalized1 === normalized2;
}

/**
 * Generate variations of a phone number for fuzzy matching
 */
export function generatePhoneVariations(phone: string): string[] {
  if (!phone) return [];
  
  const variations = new Set<string>();
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Add the original
  variations.add(phone);
  
  // Add digits only
  variations.add(digitsOnly);
  
  // Add with +44 prefix
  if (!digitsOnly.startsWith('44')) {
    if (digitsOnly.startsWith('0') && digitsOnly.length === 11) {
      variations.add('+44' + digitsOnly.substring(1));
      variations.add('44' + digitsOnly.substring(1));
    } else if (digitsOnly.length === 10) {
      variations.add('+44' + digitsOnly);
      variations.add('44' + digitsOnly);
    }
  } else {
    variations.add('+' + digitsOnly);
  }
  
  // Add with 0 prefix (UK domestic)
  if (digitsOnly.startsWith('44') && digitsOnly.length === 12) {
    variations.add('0' + digitsOnly.substring(2));
  }
  
  // Add with parentheses and spaces (common formats)
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    const areaCode = digitsOnly.substring(0, 5);
    const number = digitsOnly.substring(5);
    variations.add(`${areaCode} ${number}`);
    variations.add(`(${areaCode.substring(0, 4)}) ${areaCode.substring(4)} ${number}`);
  }
  
  return Array.from(variations);
}