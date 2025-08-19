/**
 * Phone number formatting utility
 * Formats phone numbers to (XXX) XXX-XXXX format
 */

export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Handle different phone number lengths
  if (digits.length === 10) {
    // Format as (XXX) XXX-XXXX
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // Handle numbers with country code 1
    const phoneDigits = digits.slice(1);
    return `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`;
  } else if (digits.length >= 10) {
    // For longer numbers, format the last 10 digits
    const phoneDigits = digits.slice(-10);
    return `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`;
  }
  
  // Return original if can't format
  return phone;
}

export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}