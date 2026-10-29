import type {
  AtlasData,
  CapitalEntry,
  ContinentInfo,
  Country,
  OceanInfo,
  SearchResult,
} from '../types';
import { compactSearch, normalizeSearch } from '../utils/text';

interface IndexedTerm {
  value: string;
  compact: string;
  weight: number;
}

interface BaseDocument {
  id: string;
  terms: IndexedTerm[];
}

interface CountryDocument extends BaseDocument {
  kind: 'country';
  country: Country;
}

interface CapitalDocument extends BaseDocument {
  kind: 'capital';
  capital: CapitalEntry;
}

interface ContinentDocument extends BaseDocument {
  kind: 'continent';
  continent: ContinentInfo;
}

interface OceanDocument extends BaseDocument {
  kind: 'ocean';
  ocean: OceanInfo;
}

type SearchDocument = CountryDocument | CapitalDocument | ContinentDocument | OceanDocument;

const term = (value: string | null | undefined, weight: number): IndexedTerm | null => {
  if (!value) return null;
  const normalized = normalizeSearch(value);
  if (!normalized) return null;
  return { value: normalized, compact: compactSearch(value), weight };
};

function addTerms(target: IndexedTerm[], values: Array<string | null | undefined>, weight: number) {
  for (const value of values) {
    const indexed = term(value, weight);
    if (indexed) target.push(indexed);
  }
}

function scoreTerm(termValue: IndexedTerm, query: string, compactQuery: string): number {
  let score = 0;
  if (termValue.value === query || termValue.compact === compactQuery) {
    score = 120;
  } else if (termValue.value.startsWith(query) || termValue.compact.startsWith(compactQuery)) {
    score = 92;
  } else if (termValue.value.split(' ').some((word) => word.startsWith(query))) {
    score = 76;
  } else if (termValue.value.includes(query)) {
    score = 56;
  } else if (compactQuery.length > 2 && termValue.compact.includes(compactQuery)) {
    score = 40;
  }
  return score > 0 ? score + termValue.weight : 0;
}

function scoreDocument(document: SearchDocument, query: string, compactQuery: string): number {
  let best = 0;
  for (const indexedTerm of document.terms) {
    const score = scoreTerm(indexedTerm, query, compactQuery);
    if (score > best) best = score;
  }
  return best;
}

function buildDocuments(data: AtlasData): SearchDocument[] {
  const documents: SearchDocument[] = [];

  for (const country of data.countries) {
    const terms: IndexedTerm[] = [];
    addTerms(terms, [country.commonName], 24);
    addTerms(terms, [country.officialName, country.nativeName], 14);
    addTerms(terms, country.searchAliases, 10);
    addTerms(terms, [country.cca2, country.cca3, country.ccn3], 18);
    addTerms(terms, country.capitalNames, 6);
    addTerms(terms, [country.region, country.subregion, country.continent], 2);
    documents.push({ kind: 'country', id: `country:${country.cca3}`, terms, country });
  }

  for (const capital of data.capitals) {
    const terms: IndexedTerm[] = [];
    addTerms(terms, [capital.name], 24);
    addTerms(terms, [capital.countryName], 5);
    documents.push({ kind: 'capital', id: `capital:${capital.id}`, terms, capital });
  }

  for (const continent of data.continents) {
    const terms: IndexedTerm[] = [];
    addTerms(terms, [continent.name, `${continent.name} continent`], 24);
    documents.push({
      kind: 'continent',
      id: `continent:${continent.name}`,
      terms,
      continent,
    });
  }

  for (const ocean of data.oceans) {
    const terms: IndexedTerm[] = [];
    addTerms(terms, [ocean.name, ocean.id], 24);
    documents.push({ kind: 'ocean', id: `ocean:${ocean.id}`, terms, ocean });
  }

  return documents;
}

export class SearchIndex {
  private documents: SearchDocument[];

  constructor(data: AtlasData) {
    this.documents = buildDocuments(data);
  }

  search(query: string, limit = 14): SearchResult[] {
    const normalized = normalizeSearch(query);
    if (!normalized) return [];
    const compact = compactSearch(query);
    const scored: Array<{ document: SearchDocument; score: number }> = [];

    for (const document of this.documents) {
      const score = scoreDocument(document, normalized, compact);
      if (score > 0) scored.push({ document, score });
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return labelForDocument(a.document).localeCompare(labelForDocument(b.document), 'en');
    });

    return scored.slice(0, limit).map(({ document, score }) => {
      if (document.kind === 'country') {
        return { kind: 'country', id: document.id, score, country: document.country };
      }
      if (document.kind === 'capital') {
        return { kind: 'capital', id: document.id, score, capital: document.capital };
      }
      if (document.kind === 'continent') {
        return { kind: 'continent', id: document.id, score, continent: document.continent };
      }
      return { kind: 'ocean', id: document.id, score, ocean: document.ocean };
    });
  }
}

function labelForDocument(document: SearchDocument): string {
  if (document.kind === 'country') return document.country.commonName;
  if (document.kind === 'capital') return `${document.capital.name} ${document.capital.countryName}`;
  if (document.kind === 'continent') return document.continent.name;
  return document.ocean.name;
}
