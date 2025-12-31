/**
 * SEC Filing Text Extractor
 * Extracts and analyzes unstructured text from SEC filings
 * 
 * Features:
 * - Section segmentation (Risk Factors, MD&A, etc.)
 * - Text comparison and diff
 * - Keyword extraction
 * - Optional sentiment analysis
 * - HTML to plain text conversion
 */

import { SECEdgarAPI, SECFiling, FilingTextSection, createSECEdgarClient } from '../api/sec-edgar-api';

// ==================== TYPES ====================

export interface ExtractedSection {
  name: string;
  number: string;
  title: string;
  content: string;
  plainText: string;
  wordCount: number;
  characterCount: number;
  sentences: string[];
  paragraphs: string[];
  keywords: KeywordResult[];
  sentiment?: SentimentResult;
}

export interface KeywordResult {
  word: string;
  count: number;
  tfidf?: number;
  category?: 'risk' | 'growth' | 'financial' | 'legal' | 'operational' | 'other';
}

export interface SentimentResult {
  score: number; // -1 to 1
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
  positiveWords: string[];
  negativeWords: string[];
}

export interface TextDiff {
  added: string[];
  removed: string[];
  modified: DiffChange[];
  similarity: number;
  summary: string;
}

export interface DiffChange {
  type: 'addition' | 'deletion' | 'modification';
  location: string;
  oldText?: string;
  newText?: string;
  significance: 'high' | 'medium' | 'low';
}

export interface FilingComparison {
  currentFiling: SECFiling;
  previousFiling: SECFiling;
  sections: Record<string, TextDiff>;
  overallSimilarity: number;
  significantChanges: DiffChange[];
  newRisks: string[];
  removedRisks: string[];
}

// ==================== KEYWORD CATEGORIES ====================

const RISK_KEYWORDS = new Set([
  'risk', 'risks', 'uncertain', 'uncertainty', 'volatility', 'volatile',
  'adverse', 'adversely', 'litigation', 'lawsuit', 'regulatory', 'compliance',
  'liability', 'liabilities', 'threat', 'threatening', 'vulnerability',
  'exposure', 'cybersecurity', 'breach', 'failure', 'failed', 'decline',
  'decrease', 'downturn', 'recession', 'pandemic', 'disruption', 'shortage',
  'inflation', 'default', 'bankruptcy', 'insolvency', 'impairment',
]);

const GROWTH_KEYWORDS = new Set([
  'growth', 'growing', 'expand', 'expansion', 'increase', 'increasing',
  'opportunity', 'opportunities', 'innovation', 'innovative', 'develop',
  'development', 'acquire', 'acquisition', 'merger', 'partnership',
  'invest', 'investment', 'launch', 'launching', 'new', 'strategic',
  'market', 'revenue', 'profit', 'profitability', 'momentum', 'progress',
]);

const FINANCIAL_KEYWORDS = new Set([
  'revenue', 'income', 'profit', 'loss', 'margin', 'earnings', 'eps',
  'cash', 'debt', 'equity', 'assets', 'liabilities', 'capital',
  'dividend', 'shareholder', 'stock', 'share', 'valuation', 'budget',
  'cost', 'expense', 'depreciation', 'amortization', 'ebitda', 'gaap',
]);

const LEGAL_KEYWORDS = new Set([
  'lawsuit', 'litigation', 'court', 'legal', 'settlement', 'judgment',
  'plaintiff', 'defendant', 'claim', 'claims', 'arbitration', 'dispute',
  'investigation', 'subpoena', 'sec', 'ftc', 'antitrust', 'patent',
  'intellectual', 'property', 'trademark', 'copyright', 'compliance',
]);

// ==================== SENTIMENT WORD LISTS ====================

const POSITIVE_WORDS = new Set([
  'strong', 'growth', 'increase', 'improved', 'positive', 'success',
  'successful', 'exceed', 'exceeded', 'record', 'achievement', 'benefit',
  'beneficial', 'efficient', 'efficiency', 'opportunity', 'favorable',
  'gain', 'gains', 'profit', 'profitable', 'enhance', 'enhanced',
  'innovative', 'leading', 'leader', 'best', 'excellent', 'outstanding',
  'robust', 'momentum', 'confident', 'confidence', 'optimistic',
]);

const NEGATIVE_WORDS = new Set([
  'decline', 'decrease', 'loss', 'losses', 'adverse', 'adversely',
  'negative', 'weak', 'weakness', 'risk', 'risks', 'concern', 'concerns',
  'uncertain', 'uncertainty', 'challenge', 'challenges', 'difficult',
  'difficulty', 'fail', 'failed', 'failure', 'impair', 'impaired',
  'impairment', 'litigation', 'lawsuit', 'default', 'bankruptcy',
  'restructuring', 'layoff', 'layoffs', 'downturn', 'recession',
]);

// ==================== TEXT EXTRACTOR CLASS ====================

export class SECTextExtractor {
  private readonly secApi: SECEdgarAPI;

  constructor() {
    this.secApi = createSECEdgarClient();
  }

  /**
   * Extract all sections from a filing
   */
  async extractAllSections(filing: SECFiling): Promise<ExtractedSection[]> {
    try {
      const html = await this.fetchFilingHtml(filing);
      return this.parseSections(html, filing.form);
    } catch (error) {
      console.error('[Text Extractor] Failed to extract sections:', error);
      return [];
    }
  }

  /**
   * Extract a specific section by name
   */
  async extractSection(filing: SECFiling, sectionName: string): Promise<ExtractedSection | null> {
    const sections = await this.extractAllSections(filing);
    return sections.find(s => 
      s.name.toLowerCase().includes(sectionName.toLowerCase()) ||
      s.title.toLowerCase().includes(sectionName.toLowerCase())
    ) || null;
  }

  /**
   * Fetch filing HTML content
   */
  private async fetchFilingHtml(filing: SECFiling): Promise<string> {
    const response = await fetch(filing.primaryDocumentUrl, {
      headers: {
        'User-Agent': 'MoneyHub admin@moneyhub.app',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch filing: ${response.status}`);
    }
    
    return response.text();
  }

  /**
   * Parse HTML into sections
   */
  private parseSections(html: string, formType: string): ExtractedSection[] {
    const sections: ExtractedSection[] = [];
    
    // Clean HTML
    let cleanedHtml = this.cleanHtml(html);
    
    // Get section patterns based on form type
    const patterns = this.getSectionPatterns(formType);
    
    for (const pattern of patterns) {
      const section = this.extractSectionByPattern(cleanedHtml, pattern);
      if (section) {
        sections.push(section);
      }
    }
    
    return sections;
  }

  /**
   * Clean HTML content
   */
  private cleanHtml(html: string): string {
    return html
      // Remove scripts
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove styles
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // Remove comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove XBRL tags
      .replace(/<ix:[^>]*>/gi, '')
      .replace(/<\/ix:[^>]*>/gi, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ');
  }

  /**
   * Get section patterns for form type
   */
  private getSectionPatterns(formType: string): Array<{
    name: string;
    number: string;
    title: string;
    startPattern: RegExp;
    endPatterns: RegExp[];
  }> {
    if (formType === '10-K') {
      return [
        {
          name: 'business',
          number: 'Item 1',
          title: 'Business',
          startPattern: /Item\s*1[.\s]+Business/i,
          endPatterns: [/Item\s*1A/i, /Item\s*2/i],
        },
        {
          name: 'risk_factors',
          number: 'Item 1A',
          title: 'Risk Factors',
          startPattern: /Item\s*1A[.\s]+Risk\s*Factors/i,
          endPatterns: [/Item\s*1B/i, /Item\s*2/i],
        },
        {
          name: 'properties',
          number: 'Item 2',
          title: 'Properties',
          startPattern: /Item\s*2[.\s]+Properties/i,
          endPatterns: [/Item\s*3/i],
        },
        {
          name: 'legal_proceedings',
          number: 'Item 3',
          title: 'Legal Proceedings',
          startPattern: /Item\s*3[.\s]+Legal\s*Proceedings/i,
          endPatterns: [/Item\s*4/i],
        },
        {
          name: 'mda',
          number: 'Item 7',
          title: "Management's Discussion and Analysis",
          startPattern: /Item\s*7[.\s]+Management.*Discussion/i,
          endPatterns: [/Item\s*7A/i, /Item\s*8/i],
        },
        {
          name: 'market_risk',
          number: 'Item 7A',
          title: 'Quantitative and Qualitative Disclosures About Market Risk',
          startPattern: /Item\s*7A[.\s]+Quantitative/i,
          endPatterns: [/Item\s*8/i],
        },
        {
          name: 'financial_statements',
          number: 'Item 8',
          title: 'Financial Statements',
          startPattern: /Item\s*8[.\s]+Financial\s*Statements/i,
          endPatterns: [/Item\s*9/i],
        },
      ];
    }
    
    if (formType === '10-Q') {
      return [
        {
          name: 'financial_statements',
          number: 'Item 1',
          title: 'Financial Statements',
          startPattern: /Item\s*1[.\s]+Financial\s*Statements/i,
          endPatterns: [/Item\s*2/i],
        },
        {
          name: 'mda',
          number: 'Item 2',
          title: "Management's Discussion and Analysis",
          startPattern: /Item\s*2[.\s]+Management.*Discussion/i,
          endPatterns: [/Item\s*3/i],
        },
        {
          name: 'market_risk',
          number: 'Item 3',
          title: 'Quantitative and Qualitative Disclosures About Market Risk',
          startPattern: /Item\s*3[.\s]+Quantitative/i,
          endPatterns: [/Item\s*4/i, /Part\s*II/i],
        },
        {
          name: 'risk_factors',
          number: 'Part II Item 1A',
          title: 'Risk Factors',
          startPattern: /Item\s*1A[.\s]+Risk\s*Factors/i,
          endPatterns: [/Item\s*2/i, /Item\s*3/i],
        },
        {
          name: 'legal_proceedings',
          number: 'Part II Item 1',
          title: 'Legal Proceedings',
          startPattern: /Part\s*II.*Item\s*1[.\s]+Legal/i,
          endPatterns: [/Item\s*1A/i, /Item\s*2/i],
        },
      ];
    }
    
    if (formType === '8-K') {
      return [
        {
          name: 'item_1_01',
          number: 'Item 1.01',
          title: 'Entry into Material Agreement',
          startPattern: /Item\s*1\.01/i,
          endPatterns: [/Item\s*\d+\.\d+/i, /SIGNATURE/i],
        },
        {
          name: 'item_2_01',
          number: 'Item 2.01',
          title: 'Completion of Acquisition or Disposition',
          startPattern: /Item\s*2\.01/i,
          endPatterns: [/Item\s*\d+\.\d+/i, /SIGNATURE/i],
        },
        {
          name: 'item_5_02',
          number: 'Item 5.02',
          title: 'Departure/Appointment of Officers/Directors',
          startPattern: /Item\s*5\.02/i,
          endPatterns: [/Item\s*\d+\.\d+/i, /SIGNATURE/i],
        },
        {
          name: 'item_7_01',
          number: 'Item 7.01',
          title: 'Regulation FD Disclosure',
          startPattern: /Item\s*7\.01/i,
          endPatterns: [/Item\s*\d+\.\d+/i, /SIGNATURE/i],
        },
        {
          name: 'item_8_01',
          number: 'Item 8.01',
          title: 'Other Events',
          startPattern: /Item\s*8\.01/i,
          endPatterns: [/Item\s*\d+\.\d+/i, /SIGNATURE/i],
        },
      ];
    }
    
    return [];
  }

  /**
   * Extract a section using pattern matching
   */
  private extractSectionByPattern(
    html: string,
    pattern: {
      name: string;
      number: string;
      title: string;
      startPattern: RegExp;
      endPatterns: RegExp[];
    }
  ): ExtractedSection | null {
    const startMatch = html.match(pattern.startPattern);
    if (!startMatch || startMatch.index === undefined) {
      return null;
    }
    
    const startIndex = startMatch.index;
    let endIndex = html.length;
    
    // Find the end of the section
    for (const endPattern of pattern.endPatterns) {
      const endMatch = html.substring(startIndex + startMatch[0].length).match(endPattern);
      if (endMatch && endMatch.index !== undefined) {
        const potentialEnd = startIndex + startMatch[0].length + endMatch.index;
        if (potentialEnd < endIndex) {
          endIndex = potentialEnd;
        }
      }
    }
    
    const htmlContent = html.substring(startIndex, endIndex);
    const plainText = this.htmlToPlainText(htmlContent);
    const sentences = this.extractSentences(plainText);
    const paragraphs = this.extractParagraphs(plainText);
    const keywords = this.extractKeywords(plainText);
    const sentiment = this.analyzeSentiment(plainText);
    
    return {
      name: pattern.name,
      number: pattern.number,
      title: pattern.title,
      content: htmlContent,
      plainText,
      wordCount: plainText.split(/\s+/).filter(w => w.length > 0).length,
      characterCount: plainText.length,
      sentences,
      paragraphs,
      keywords,
      sentiment,
    };
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToPlainText(html: string): string {
    return html
      // Replace block elements with newlines
      .replace(/<\/?(p|div|br|h[1-6]|li|tr)[^>]*>/gi, '\n')
      // Remove all remaining HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract sentences from text
   */
  private extractSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);
  }

  /**
   * Extract paragraphs from text
   */
  private extractParagraphs(text: string): string[] {
    return text
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 50);
  }

  /**
   * Extract and categorize keywords
   */
  private extractKeywords(text: string): KeywordResult[] {
    const words = text.toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);
    
    const wordCounts = new Map<string, number>();
    
    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
    
    const results: KeywordResult[] = [];
    
    for (const [word, count] of wordCounts.entries()) {
      if (count < 2) continue; // Skip words appearing only once
      
      let category: KeywordResult['category'] = 'other';
      
      if (RISK_KEYWORDS.has(word)) category = 'risk';
      else if (GROWTH_KEYWORDS.has(word)) category = 'growth';
      else if (FINANCIAL_KEYWORDS.has(word)) category = 'financial';
      else if (LEGAL_KEYWORDS.has(word)) category = 'legal';
      
      results.push({ word, count, category });
    }
    
    // Sort by count descending
    return results.sort((a, b) => b.count - a.count).slice(0, 50);
  }

  /**
   * Analyze sentiment of text
   */
  private analyzeSentiment(text: string): SentimentResult {
    const words = text.toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/);
    
    const positiveMatches: string[] = [];
    const negativeMatches: string[] = [];
    
    for (const word of words) {
      if (POSITIVE_WORDS.has(word)) positiveMatches.push(word);
      if (NEGATIVE_WORDS.has(word)) negativeMatches.push(word);
    }
    
    const positiveCount = positiveMatches.length;
    const negativeCount = negativeMatches.length;
    const total = positiveCount + negativeCount;
    
    let score = 0;
    let confidence = 0;
    
    if (total > 0) {
      score = (positiveCount - negativeCount) / total;
      confidence = Math.min(total / 100, 1); // More words = higher confidence
    }
    
    let label: SentimentResult['label'] = 'neutral';
    if (score > 0.1) label = 'positive';
    else if (score < -0.1) label = 'negative';
    
    return {
      score,
      label,
      confidence,
      positiveWords: [...new Set(positiveMatches)],
      negativeWords: [...new Set(negativeMatches)],
    };
  }

  /**
   * Compare two filings and generate diff
   */
  async compareFilings(
    currentFiling: SECFiling,
    previousFiling: SECFiling
  ): Promise<FilingComparison> {
    const [currentSections, previousSections] = await Promise.all([
      this.extractAllSections(currentFiling),
      this.extractAllSections(previousFiling),
    ]);
    
    const sectionDiffs: Record<string, TextDiff> = {};
    const significantChanges: DiffChange[] = [];
    let totalSimilarity = 0;
    let sectionCount = 0;
    
    // Compare matching sections
    for (const currentSection of currentSections) {
      const previousSection = previousSections.find(s => s.name === currentSection.name);
      
      if (previousSection) {
        const diff = this.diffTexts(currentSection.plainText, previousSection.plainText);
        sectionDiffs[currentSection.name] = diff;
        totalSimilarity += diff.similarity;
        sectionCount++;
        
        // Track significant changes
        for (const change of diff.modified) {
          if (change.significance === 'high') {
            significantChanges.push({
              ...change,
              location: `${currentSection.title} - ${change.location}`,
            });
          }
        }
      }
    }
    
    // Identify new and removed risk factors
    const currentRisks = currentSections.find(s => s.name === 'risk_factors');
    const previousRisks = previousSections.find(s => s.name === 'risk_factors');
    
    const newRisks: string[] = [];
    const removedRisks: string[] = [];
    
    if (currentRisks && previousRisks) {
      const currentRiskParagraphs = new Set(currentRisks.paragraphs);
      const previousRiskParagraphs = new Set(previousRisks.paragraphs);
      
      for (const para of currentRisks.paragraphs) {
        if (!this.hasSimilarParagraph(para, previousRisks.paragraphs)) {
          newRisks.push(para.substring(0, 200) + '...');
        }
      }
      
      for (const para of previousRisks.paragraphs) {
        if (!this.hasSimilarParagraph(para, currentRisks.paragraphs)) {
          removedRisks.push(para.substring(0, 200) + '...');
        }
      }
    }
    
    return {
      currentFiling,
      previousFiling,
      sections: sectionDiffs,
      overallSimilarity: sectionCount > 0 ? totalSimilarity / sectionCount : 0,
      significantChanges,
      newRisks: newRisks.slice(0, 10),
      removedRisks: removedRisks.slice(0, 10),
    };
  }

  /**
   * Diff two text strings
   */
  private diffTexts(current: string, previous: string): TextDiff {
    const currentWords = new Set(current.toLowerCase().split(/\s+/));
    const previousWords = new Set(previous.toLowerCase().split(/\s+/));
    
    const added: string[] = [];
    const removed: string[] = [];
    
    for (const word of currentWords) {
      if (!previousWords.has(word) && word.length > 4) {
        added.push(word);
      }
    }
    
    for (const word of previousWords) {
      if (!currentWords.has(word) && word.length > 4) {
        removed.push(word);
      }
    }
    
    // Calculate Jaccard similarity
    const intersection = [...currentWords].filter(w => previousWords.has(w)).length;
    const union = new Set([...currentWords, ...previousWords]).size;
    const similarity = union > 0 ? intersection / union : 0;
    
    // Generate summary
    const changePercent = ((1 - similarity) * 100).toFixed(1);
    const summary = `${changePercent}% changed. ${added.length} new terms, ${removed.length} removed terms.`;
    
    return {
      added: added.slice(0, 50),
      removed: removed.slice(0, 50),
      modified: [],
      similarity,
      summary,
    };
  }

  /**
   * Check if a paragraph has a similar version in another list
   */
  private hasSimilarParagraph(paragraph: string, paragraphs: string[]): boolean {
    const threshold = 0.7;
    const words1 = new Set(paragraph.toLowerCase().split(/\s+/));
    
    for (const other of paragraphs) {
      const words2 = new Set(other.toLowerCase().split(/\s+/));
      const intersection = [...words1].filter(w => words2.has(w)).length;
      const union = new Set([...words1, ...words2]).size;
      const similarity = union > 0 ? intersection / union : 0;
      
      if (similarity >= threshold) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Search for specific terms in filings
   */
  async searchInFiling(
    filing: SECFiling,
    searchTerms: string[]
  ): Promise<Array<{ term: string; count: number; contexts: string[] }>> {
    const sections = await this.extractAllSections(filing);
    const fullText = sections.map(s => s.plainText).join(' ').toLowerCase();
    const results: Array<{ term: string; count: number; contexts: string[] }> = [];
    
    for (const term of searchTerms) {
      const termLower = term.toLowerCase();
      const regex = new RegExp(`[^.]*${termLower}[^.]*\\.`, 'gi');
      const matches = fullText.match(regex) || [];
      
      results.push({
        term,
        count: matches.length,
        contexts: matches.slice(0, 5).map(m => m.trim()),
      });
    }
    
    return results;
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Create SEC Text Extractor instance
 */
export function createSECTextExtractor(): SECTextExtractor {
  return new SECTextExtractor();
}

export default SECTextExtractor;
