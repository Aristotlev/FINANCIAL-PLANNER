/**
 * Input Validation & Sanitization
 * 
 * Strict validation for all user inputs to prevent XSS, injection,
 * and ensure data integrity. Use these validators on both client and server.
 */

// ============================================================================
// VALIDATION RESULT TYPE
// ============================================================================

export interface ValidationResult<T> {
  valid: boolean;
  value: T | null;
  error?: string;
}

// ============================================================================
// STRING SANITIZATION
// ============================================================================

/**
 * Sanitize a string by escaping HTML entities.
 * Use this for any user input that will be rendered in the UI.
 */
export function sanitizeHtml(input: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };
  return input.replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char);
}

/**
 * Strip all HTML tags from a string.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Normalize whitespace: trim, collapse multiple spaces.
 */
export function normalizeWhitespace(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

// ============================================================================
// PORTFOLIO INPUT VALIDATORS
// ============================================================================

// Stock/crypto symbol pattern: 1-10 alphanumeric chars, may include dots/dashes for some symbols
const SYMBOL_PATTERN = /^[A-Z0-9.-]{1,10}$/i;

// Portfolio/account name: 1-50 chars, letters, numbers, spaces, basic punctuation
const NAME_PATTERN = /^[\p{L}\p{N}\s\-_.,'()]{1,50}$/u;

// Notes/tags: up to 500 chars, no script tags or suspicious patterns
const NOTES_MAX_LENGTH = 500;
const TAG_PATTERN = /^[\p{L}\p{N}\s\-_]{1,30}$/u;

// Numeric bounds
const MAX_QUANTITY = 1_000_000_000; // 1 billion units
const MAX_PRICE = 1_000_000_000; // $1 billion per unit
const MIN_QUANTITY = 0.00000001; // For fractional crypto
const MIN_PRICE = 0;

/**
 * Validate a stock/crypto symbol.
 */
export function validateSymbol(input: unknown): ValidationResult<string> {
  if (typeof input !== 'string') {
    return { valid: false, value: null, error: 'Symbol must be a string' };
  }

  const symbol = input.trim().toUpperCase();
  
  if (symbol.length === 0) {
    return { valid: false, value: null, error: 'Symbol cannot be empty' };
  }

  if (symbol.length > 10) {
    return { valid: false, value: null, error: 'Symbol too long (max 10 characters)' };
  }

  if (!SYMBOL_PATTERN.test(symbol)) {
    return { valid: false, value: null, error: 'Invalid symbol format' };
  }

  return { valid: true, value: symbol };
}

/**
 * Validate a quantity (number of shares/units).
 */
export function validateQuantity(input: unknown): ValidationResult<number> {
  const num = typeof input === 'string' ? parseFloat(input) : input;
  
  if (typeof num !== 'number' || isNaN(num)) {
    return { valid: false, value: null, error: 'Quantity must be a number' };
  }

  if (!isFinite(num)) {
    return { valid: false, value: null, error: 'Quantity must be finite' };
  }

  if (num < MIN_QUANTITY) {
    return { valid: false, value: null, error: `Quantity must be at least ${MIN_QUANTITY}` };
  }

  if (num > MAX_QUANTITY) {
    return { valid: false, value: null, error: `Quantity cannot exceed ${MAX_QUANTITY.toLocaleString()}` };
  }

  return { valid: true, value: num };
}

/**
 * Validate a price (per-unit cost).
 */
export function validatePrice(input: unknown): ValidationResult<number> {
  const num = typeof input === 'string' ? parseFloat(input) : input;
  
  if (typeof num !== 'number' || isNaN(num)) {
    return { valid: false, value: null, error: 'Price must be a number' };
  }

  if (!isFinite(num)) {
    return { valid: false, value: null, error: 'Price must be finite' };
  }

  if (num < MIN_PRICE) {
    return { valid: false, value: null, error: 'Price cannot be negative' };
  }

  if (num > MAX_PRICE) {
    return { valid: false, value: null, error: `Price cannot exceed ${MAX_PRICE.toLocaleString()}` };
  }

  return { valid: true, value: num };
}

/**
 * Validate a portfolio or account name.
 */
export function validatePortfolioName(input: unknown): ValidationResult<string> {
  if (typeof input !== 'string') {
    return { valid: false, value: null, error: 'Name must be a string' };
  }

  const name = normalizeWhitespace(input);
  
  if (name.length === 0) {
    return { valid: false, value: null, error: 'Name cannot be empty' };
  }

  if (name.length > 50) {
    return { valid: false, value: null, error: 'Name too long (max 50 characters)' };
  }

  if (!NAME_PATTERN.test(name)) {
    return { valid: false, value: null, error: 'Name contains invalid characters' };
  }

  // Sanitize and return
  return { valid: true, value: sanitizeHtml(name) };
}

/**
 * Validate notes or description text.
 */
export function validateNotes(input: unknown): ValidationResult<string> {
  if (input === null || input === undefined) {
    return { valid: true, value: '' };
  }

  if (typeof input !== 'string') {
    return { valid: false, value: null, error: 'Notes must be a string' };
  }

  const notes = input.trim();
  
  if (notes.length > NOTES_MAX_LENGTH) {
    return { valid: false, value: null, error: `Notes too long (max ${NOTES_MAX_LENGTH} characters)` };
  }

  // Check for suspicious patterns (script tags, event handlers, etc.)
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /data:/i,
    /vbscript:/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(notes)) {
      return { valid: false, value: null, error: 'Notes contain invalid content' };
    }
  }

  // Strip HTML and return
  return { valid: true, value: stripHtml(notes).trim() };
}

/**
 * Validate a tag.
 */
export function validateTag(input: unknown): ValidationResult<string> {
  if (typeof input !== 'string') {
    return { valid: false, value: null, error: 'Tag must be a string' };
  }

  const tag = normalizeWhitespace(input);
  
  if (tag.length === 0) {
    return { valid: false, value: null, error: 'Tag cannot be empty' };
  }

  if (!TAG_PATTERN.test(tag)) {
    return { valid: false, value: null, error: 'Tag contains invalid characters (max 30 chars, letters/numbers/dashes only)' };
  }

  return { valid: true, value: tag };
}

/**
 * Validate an array of tags.
 */
export function validateTags(input: unknown): ValidationResult<string[]> {
  if (!Array.isArray(input)) {
    return { valid: false, value: null, error: 'Tags must be an array' };
  }

  if (input.length > 10) {
    return { valid: false, value: null, error: 'Too many tags (max 10)' };
  }

  const validTags: string[] = [];
  for (const tag of input) {
    const result = validateTag(tag);
    if (!result.valid) {
      return { valid: false, value: null, error: result.error };
    }
    if (result.value) {
      validTags.push(result.value);
    }
  }

  return { valid: true, value: validTags };
}

// ============================================================================
// WALLET ADDRESS VALIDATORS
// ============================================================================

// Ethereum/EVM address pattern
const ETH_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

// Bitcoin address patterns (multiple formats)
const BTC_ADDRESS_PATTERNS = [
  /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/, // Legacy P2PKH or P2SH
  /^bc1[a-zA-HJ-NP-Z0-9]{39,59}$/i,    // Bech32/Bech32m
];

// Solana address pattern
const SOL_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Validate an Ethereum/EVM wallet address.
 */
export function validateEthAddress(input: unknown): ValidationResult<string> {
  if (typeof input !== 'string') {
    return { valid: false, value: null, error: 'Address must be a string' };
  }

  const address = input.trim();

  if (!ETH_ADDRESS_PATTERN.test(address)) {
    return { valid: false, value: null, error: 'Invalid Ethereum address format' };
  }

  return { valid: true, value: address };
}

/**
 * Validate a Bitcoin wallet address.
 */
export function validateBtcAddress(input: unknown): ValidationResult<string> {
  if (typeof input !== 'string') {
    return { valid: false, value: null, error: 'Address must be a string' };
  }

  const address = input.trim();

  const isValid = BTC_ADDRESS_PATTERNS.some(pattern => pattern.test(address));
  if (!isValid) {
    return { valid: false, value: null, error: 'Invalid Bitcoin address format' };
  }

  return { valid: true, value: address };
}

/**
 * Validate a Solana wallet address.
 */
export function validateSolAddress(input: unknown): ValidationResult<string> {
  if (typeof input !== 'string') {
    return { valid: false, value: null, error: 'Address must be a string' };
  }

  const address = input.trim();

  if (!SOL_ADDRESS_PATTERN.test(address)) {
    return { valid: false, value: null, error: 'Invalid Solana address format' };
  }

  return { valid: true, value: address };
}

// ============================================================================
// GENERIC VALIDATORS
// ============================================================================

/**
 * Validate a UUID.
 */
export function validateUUID(input: unknown): ValidationResult<string> {
  if (typeof input !== 'string') {
    return { valid: false, value: null, error: 'UUID must be a string' };
  }

  const uuid = input.trim().toLowerCase();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  if (!uuidPattern.test(uuid)) {
    return { valid: false, value: null, error: 'Invalid UUID format' };
  }

  return { valid: true, value: uuid };
}

/**
 * Validate a URL.
 */
export function validateUrl(input: unknown, allowedProtocols: string[] = ['https:']): ValidationResult<string> {
  if (typeof input !== 'string') {
    return { valid: false, value: null, error: 'URL must be a string' };
  }

  try {
    const url = new URL(input.trim());
    
    if (!allowedProtocols.includes(url.protocol)) {
      return { valid: false, value: null, error: `URL must use ${allowedProtocols.join(' or ')}` };
    }

    return { valid: true, value: url.href };
  } catch {
    return { valid: false, value: null, error: 'Invalid URL format' };
  }
}

/**
 * Validate a date string (ISO 8601).
 */
export function validateDate(input: unknown): ValidationResult<Date> {
  if (input instanceof Date) {
    if (isNaN(input.getTime())) {
      return { valid: false, value: null, error: 'Invalid date' };
    }
    return { valid: true, value: input };
  }

  if (typeof input !== 'string') {
    return { valid: false, value: null, error: 'Date must be a string or Date object' };
  }

  const date = new Date(input.trim());
  if (isNaN(date.getTime())) {
    return { valid: false, value: null, error: 'Invalid date format' };
  }

  return { valid: true, value: date };
}

// ============================================================================
// BATCH VALIDATION
// ============================================================================

export interface PortfolioEntryInput {
  symbol: unknown;
  quantity: unknown;
  avgPrice: unknown;
  notes?: unknown;
  tags?: unknown;
}

export interface ValidatedPortfolioEntry {
  symbol: string;
  quantity: number;
  avgPrice: number;
  notes: string;
  tags: string[];
}

/**
 * Validate a complete portfolio entry.
 */
export function validatePortfolioEntry(input: PortfolioEntryInput): ValidationResult<ValidatedPortfolioEntry> {
  const symbolResult = validateSymbol(input.symbol);
  if (!symbolResult.valid) {
    return { valid: false, value: null, error: `Symbol: ${symbolResult.error}` };
  }

  const quantityResult = validateQuantity(input.quantity);
  if (!quantityResult.valid) {
    return { valid: false, value: null, error: `Quantity: ${quantityResult.error}` };
  }

  const priceResult = validatePrice(input.avgPrice);
  if (!priceResult.valid) {
    return { valid: false, value: null, error: `Price: ${priceResult.error}` };
  }

  const notesResult = validateNotes(input.notes);
  if (!notesResult.valid) {
    return { valid: false, value: null, error: `Notes: ${notesResult.error}` };
  }

  const tagsResult = input.tags ? validateTags(input.tags) : { valid: true, value: [] as string[] };
  if (!tagsResult.valid) {
    return { valid: false, value: null, error: `Tags: ${tagsResult.error}` };
  }

  return {
    valid: true,
    value: {
      symbol: symbolResult.value!,
      quantity: quantityResult.value!,
      avgPrice: priceResult.value!,
      notes: notesResult.value!,
      tags: tagsResult.value!,
    },
  };
}
