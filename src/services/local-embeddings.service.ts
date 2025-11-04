import { Embeddings, EmbeddingsParams } from '@langchain/core/embeddings';

/**
 * Simple local embeddings using TF-IDF (Term Frequency-Inverse Document Frequency)
 *
 * **Advantages:**
 * - 100% FREE - no API key needed
 * - Works OFFLINE - no internet required
 * - Fast - no network latency
 * - Privacy - data stays local
 *
 * **Limitations:**
 * - Lower accuracy than neural embeddings (OpenAI/Google)
 * - No semantic understanding (can't understand synonyms/context)
 * - Best for keyword-based similarity, not concept matching
 *
 * **Use Cases:**
 * - Default option for users without API keys
 * - Privacy-sensitive projects
 * - Offline development
 * - Quick prototyping
 */
export class LocalEmbeddings extends Embeddings {
  private vocabulary: Map<string, number> = new Map();
  private idf: Map<string, number> = new Map();
  private dimensions: number;

  constructor(params?: EmbeddingsParams & { dimensions?: number }) {
    super(params || {});
    this.dimensions = params?.dimensions || 128; // Smaller vector size for local embeddings
  }

  /**
   * Tokenize text into words (simple whitespace + lowercase)
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter((word) => word.length > 2); // Remove short words
  }

  /**
   * Build vocabulary and calculate IDF scores from all documents
   */
  public buildVocabulary(documents: string[]): void {
    // Count document frequency for each term
    const docFreq = new Map<string, number>();
    const totalDocs = documents.length;

    for (const doc of documents) {
      const tokens = new Set(this.tokenize(doc)); // Unique tokens per doc
      for (const token of tokens) {
        docFreq.set(token, (docFreq.get(token) || 0) + 1);
      }
    }

    // Build vocabulary (top N most common terms)
    const sortedTerms = Array.from(docFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.dimensions);

    sortedTerms.forEach(([term, _], index) => {
      this.vocabulary.set(term, index);
    });

    // Calculate IDF for each term: log(totalDocs / docFreq)
    for (const [term, freq] of docFreq.entries()) {
      this.idf.set(term, Math.log(totalDocs / freq));
    }
  }

  /**
   * Convert text to TF-IDF vector
   */
  private textToVector(text: string): number[] {
    const tokens = this.tokenize(text);
    const tf = new Map<string, number>();

    // Calculate term frequency
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }

    // Normalize by document length
    const totalTokens = tokens.length;
    for (const [token, count] of tf.entries()) {
      tf.set(token, count / totalTokens);
    }

    // Build TF-IDF vector
    const vector = new Array(this.dimensions).fill(0);

    for (const [token, tfValue] of tf.entries()) {
      const index = this.vocabulary.get(token);
      if (index !== undefined) {
        const idfValue = this.idf.get(token) || 0;
        vector[index] = tfValue * idfValue;
      }
    }

    // Normalize vector to unit length
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      return vector.map((val) => val / magnitude);
    }

    return vector;
  }

  /**
   * Embed a single document
   */
  async embedQuery(text: string): Promise<number[]> {
    return this.textToVector(text);
  }

  /**
   * Embed multiple documents
   */
  async embedDocuments(documents: string[]): Promise<number[][]> {
    // Build vocabulary from documents if not already built
    if (this.vocabulary.size === 0) {
      this.buildVocabulary(documents);
    }

    return documents.map((doc) => this.textToVector(doc));
  }
}
