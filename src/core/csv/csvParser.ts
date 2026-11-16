/**
 * Recallia CSV Parsing & Validation Engine
 * Pure TypeScript, independent of UI.
 * Handles custom delimiters, column mapping, quote escaping,
 * validation, and duplicate detection.
 */

export interface ColumnMapping {
  front: string;
  back: string;
  tags?: string;
  difficulty?: string;
  subject?: string;
  topic?: string;
  answerKey?: string;
}

export interface ParsedCardPreview {
  rowIndex: number;
  front: string;
  back: string;
  tags: string[];
  difficulty: number;
  subject?: string;
  topic?: string;
  answerKey?: string;
  isValid: boolean;
  isDuplicate: boolean;
  validationError?: string;
}

export interface ImportPreviewResult {
  detectedDelimiter: string;
  headers: string[];
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  errorCount: number;
  cards: ParsedCardPreview[];
  errors: Array<{ row: number; error: string }>;
}

export class CSVParser {
  /**
   * Auto-detects delimiter from candidate characters
   */
  static detectDelimiter(firstFewLines: string): string {
    const lines = firstFewLines.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return ',';

    const candidates = [',', ';', '\t', '|'];
    const sample = lines.slice(0, 5);

    let bestDelimiter = ',';
    let maxConsistency = -1;

    for (const delim of candidates) {
      const counts = sample.map((line) => this.splitLine(line, delim).length);
      const firstCount = counts[0];
      const isConsistent = counts.every((c) => c === firstCount && c > 1);

      if (isConsistent && firstCount > maxConsistency) {
        maxConsistency = firstCount;
        bestDelimiter = delim;
      }
    }

    return bestDelimiter;
  }

  /**
   * Robust line parser handling quoted cells and escaped quotes
   */
  static splitLine(line: string, delimiter: string = ','): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          // Escaped quote: ""
          current += '"';
          i += 2;
          continue;
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
          i++;
          continue;
        }
      }

      if (char === delimiter && !inQuotes) {
        fields.push(current.trim());
        current = '';
        i++;
        continue;
      }

      current += char;
      i++;
    }

    fields.push(current.trim());
    return fields;
  }

  /**
   * Parses full raw CSV content into rows and handles multiline quoted values
   */
  static parseRawContent(rawContent: string, customDelimiter?: string): { headers: string[]; rows: string[][]; delimiter: string } {
    const delimiter = customDelimiter || this.detectDelimiter(rawContent.slice(0, 2000));
    
    // Parse records character-by-character to properly handle embedded newlines in quotes
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;

    const text = rawContent.replace(/^\uFEFF/, ''); // Strip UTF-8 BOM if present

    while (i < text.length) {
      const char = text[i];

      if (char === '"') {
        if (inQuotes && i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          inQuotes = !inQuotes;
          i++;
          continue;
        }
      }

      if (char === delimiter && !inQuotes) {
        currentRow.push(currentField);
        currentField = '';
        i++;
        continue;
      }

      if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
          i++; // Skip \n in \r\n
        }
        currentRow.push(currentField);
        currentField = '';
        
        // Add row if not empty
        if (currentRow.some((f) => f.trim().length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      }

      currentField += char;
      i++;
    }

    // Flush final field/row
    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField);
      if (currentRow.some((f) => f.trim().length > 0)) {
        rows.push(currentRow);
      }
    }

    if (rows.length === 0) {
      return { headers: [], rows: [], delimiter };
    }

    const headers = rows[0].map((h) => h.trim().replace(/^"|"$/g, ''));
    const dataRows = rows.slice(1);

    return { headers, rows: dataRows, delimiter };
  }

  /**
   * Suggests default column mappings based on headers
   */
  static suggestMapping(headers: string[]): ColumnMapping {
    const lowerHeaders = headers.map((h) => h.toLowerCase());

    const findMatch = (candidates: string[]): string => {
      for (const cand of candidates) {
        const idx = lowerHeaders.findIndex((h) => h === cand || h.includes(cand));
        if (idx !== -1) return headers[idx];
      }
      return '';
    };

    const front = findMatch(['front', 'question', 'prompt', 'q', 'term', 'concept']);
    const back = findMatch(['back', 'answer', 'solution', 'definition', 'response', 'a', 'explanation']);
    const tags = findMatch(['tags', 'tag', 'category', 'keywords']);
    const difficulty = findMatch(['difficulty', 'diff', 'level']);
    const subject = findMatch(['subject', 'course', 'discipline']);
    const topic = findMatch(['topic', 'unit', 'chapter', 'section']);
    const answerKey = findMatch(['answerkey', 'answer_key', 'key', 'correct']);

    return {
      front: front || (headers.length > 0 ? headers[0] : ''),
      back: back || (headers.length > 1 ? headers[1] : ''),
      tags: tags || undefined,
      difficulty: difficulty || undefined,
      subject: subject || undefined,
      topic: topic || undefined,
      answerKey: answerKey || undefined,
    };
  }

  /**
   * Generates a preview with validation and duplicate detection
   */
  static generatePreview(
    rawContent: string,
    mapping: ColumnMapping,
    existingFronts: Set<string> = new Set(),
    customDelimiter?: string
  ): ImportPreviewResult {
    const { headers, rows, delimiter } = this.parseRawContent(rawContent, customDelimiter);

    const frontIdx = headers.indexOf(mapping.front);
    const backIdx = headers.indexOf(mapping.back);
    const tagsIdx = mapping.tags ? headers.indexOf(mapping.tags) : -1;
    const diffIdx = mapping.difficulty ? headers.indexOf(mapping.difficulty) : -1;
    const subjIdx = mapping.subject ? headers.indexOf(mapping.subject) : -1;
    const topicIdx = mapping.topic ? headers.indexOf(mapping.topic) : -1;
    const keyIdx = mapping.answerKey ? headers.indexOf(mapping.answerKey) : -1;

    const cards: ParsedCardPreview[] = [];
    const errors: Array<{ row: number; error: string }> = [];
    const seenInImport = new Set<string>();

    let validCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const rowIndex = r + 2; // 1-indexed, +1 for header

      const front = frontIdx !== -1 && row[frontIdx] ? row[frontIdx].trim() : '';
      const back = backIdx !== -1 && row[backIdx] ? row[backIdx].trim() : '';

      let validationError: string | undefined;

      if (!front) {
        validationError = 'Front content is missing or empty.';
      } else if (!back) {
        validationError = 'Back content is missing or empty.';
      }

      // Tags parsing
      let tags: string[] = [];
      if (tagsIdx !== -1 && row[tagsIdx]) {
        tags = row[tagsIdx]
          .split(/[,;|]/)
          .map((t) => t.trim())
          .filter((t) => t.length > 0);
      }

      // Difficulty parsing (1 to 5)
      let difficulty = 2;
      if (diffIdx !== -1 && row[diffIdx]) {
        const parsedDiff = parseInt(row[diffIdx].trim(), 10);
        if (!isNaN(parsedDiff) && parsedDiff >= 1 && parsedDiff <= 5) {
          difficulty = parsedDiff;
        }
      }

      const subject = subjIdx !== -1 && row[subjIdx] ? row[subjIdx].trim() : undefined;
      const topic = topicIdx !== -1 && row[topicIdx] ? row[topicIdx].trim() : undefined;
      const answerKey = keyIdx !== -1 && row[keyIdx] ? row[keyIdx].trim() : undefined;

      // Duplicate check (normalized lowercase front)
      const normalizedFront = front.toLowerCase().replace(/\s+/g, ' ');
      const isDuplicate = existingFronts.has(normalizedFront) || seenInImport.has(normalizedFront);

      if (isDuplicate && !validationError) {
        duplicateCount++;
      } else if (!validationError) {
        validCount++;
        seenInImport.add(normalizedFront);
      } else {
        errorCount++;
        errors.push({ row: rowIndex, error: validationError });
      }

      cards.push({
        rowIndex,
        front,
        back,
        tags,
        difficulty,
        subject,
        topic,
        answerKey,
        isValid: !validationError,
        isDuplicate,
        validationError,
      });
    }

    return {
      detectedDelimiter: delimiter,
      headers,
      totalRows: rows.length,
      validCount,
      duplicateCount,
      errorCount,
      cards,
      errors,
    };
  }
}
