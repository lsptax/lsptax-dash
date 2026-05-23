/**
 * Format a number as US currency with commas as thousand separators
 * @param value - The number to format
 * @param includeDecimals - Whether to include decimal places (default: false)
 * @returns Formatted string (e.g., "1,234,567" or "1,234,567.89")
 */
export function formatCurrency(value: number | string | null | undefined, includeDecimals: boolean = false): string {
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  // Convert to number
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0';
  }

  // Format with commas as thousand separators
  if (includeDecimals) {
    return numValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  } else {
    return numValue.toLocaleString('en-US');
  }
}

/**
 * Format a number as US currency with dollar sign
 * @param value - The number to format
 * @param includeDecimals - Whether to include decimal places (default: true)
 * @returns Formatted string (e.g., "$1,234,567" or "$1,234,567.89")
 */
export function formatUSD(value: number | string | null | undefined, includeDecimals: boolean = true): string {
  if (value === null || value === undefined || value === '') {
    return '$0';
  }

  // Convert to number with better precision
  let numValue: number;
  if (typeof value === 'string') {
    // Handle potential decimal precision issues
    numValue = Number(value);
    if (isNaN(numValue)) {
      return '$0';
    }
  } else {
    numValue = value;
  }

  // Format with dollar sign and commas
  if (includeDecimals) {
    return numValue.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  } else {
    return '$' + numValue.toLocaleString('en-US');
  }
}

/**
 * Clean a string by removing commas and converting to a clean number string
 * @param value - The string to clean (e.g., "1,000,000" or "1,000,000.50")
 * @returns Clean number string without commas (e.g., "1000000" or "1000000.50")
 */
export function cleanNumberInput(value: string): string {
  if (!value) return '';
  
  // Remove all commas from the string
  return value.replace(/,/g, '');
}

/**
 * Parse a string to a number, handling comma-separated values
 * @param value - The string to parse (e.g., "1,000,000" or "1,000,000.50")
 * @returns Parsed number or 0 if invalid
 */
export function parseNumberInput(value: string): number {
  if (!value) return 0;
  
  // Clean the input and parse
  const cleanValue = cleanNumberInput(value);
  const parsed = parseFloat(cleanValue);
  
  return isNaN(parsed) ? 0 : parsed;
} 