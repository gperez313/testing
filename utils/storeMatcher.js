import Store from '../models/Store.js';
import levenshtein from 'fast-levenshtein';

const normalizePhone = (phone = '') => phone.replace(/\D+/g, '');
const normalizeStoreNumber = (value = '') => String(value).replace(/\D+/g, '');
const normalizeZip = (zip = '') => {
  const match = String(zip).match(/\d{5}/);
  return match ? match[0] : '';
};
const normalizeStr = (str = '') => str.trim().toLowerCase();

const inferStoreType = name => {
  const normalized = normalizeStr(name);
  if (!normalized) return null;
  if (normalized.includes('walmart')) return 'walmart';
  if (normalized.includes('kroger')) return 'kroger';
  if (normalized.includes('aldi')) return 'aldi';
  if (normalized.includes('target')) return 'target';
  if (normalized.includes('meijer')) return 'meijer';
  return null;
};

const addressKey = (addr = {}) => {
  const street = normalizeStr(addr.street || addr.address || '');
  const city = normalizeStr(addr.city || '');
  const state = normalizeStr(addr.state || '');
  const zip = normalizeZip(addr.zip || '');
  return [street, city, state, zip].filter(Boolean).join('|');
};

const fuzzyMatch = (a, b) => {
  const aNorm = normalizeStr(a);
  const bNorm = normalizeStr(b);
  if (!aNorm || !bNorm) return 1;
  const dist = levenshtein.get(aNorm, bNorm);
  const maxLen = Math.max(aNorm.length, bNorm.length) || 1;
  return dist / maxLen;
};

const buildCandidateScore = (input, store) => {
  const reasons = [];
  let score = 0;

  const inputPhone = normalizePhone(input.phoneNormalized || input.phone);
  const inputStoreNumber = normalizeStoreNumber(input.storeNumber);
  const inputZip = normalizeZip(input.address?.zip || '');
  const inputName = normalizeStr(input.name || '');
  const inputAddrKey = addressKey(input.address || {});

  const storePhone = normalizePhone(store.phoneNormalized || store.phone);
  const storeNumber = normalizeStoreNumber(store.storeNumber);
  const storeZip = normalizeZip(store.address?.zip || '');

  if (inputPhone && storePhone && inputPhone === storePhone) {
    score += 0.4;
    reasons.push({ code: 'PHONE_MATCH', message: 'Phone matches exactly.', weight: 0.4 });
  }

  if (inputStoreNumber && storeNumber && inputStoreNumber === storeNumber) {
    score += 0.3;
    reasons.push({ code: 'STORE_NUMBER_MATCH', message: 'Store number matches exactly.', weight: 0.3 });
  }

  if (inputAddrKey && inputAddrKey === addressKey(store.address || {})) {
    score += 0.3;
    reasons.push({ code: 'ADDRESS_MATCH', message: 'Full address matches.', weight: 0.3 });
  }

  if (inputZip && storeZip && inputZip === storeZip) {
    score += 0.1;
    reasons.push({ code: 'ZIP_MATCH', message: 'ZIP code matches.', weight: 0.1 });
  }

  if (inputName) {
    const distance = fuzzyMatch(inputName, store.name || '');
    if (distance <= 0.1) {
      score += 0.1;
      reasons.push({ code: 'NAME_CLOSE', message: 'Store name is a close fuzzy match.', weight: 0.1 });
    }
  }

  return {
    store,
    score,
    confidence: Math.max(0, Math.min(1, Number(score.toFixed(4)))),
    reasons
  };
};

const buildPriceSimilarityScore = async (inputItems = [], storeId) => {
  if (!storeId || !inputItems.length) return 0;
  
  try {
    const upcs = inputItems.map(it => it.upc).filter(Boolean);
    const names = inputItems.map(it => it.receiptName).filter(Boolean);
    
    if (!upcs.length && !names.length) return 0;

    // Find inventory for this store that matches receipt items
    const StoreInventory = (await import('../models/StoreInventory.js')).default;
    const inventory = await StoreInventory.find({ storeId })
      .populate('productId')
      .lean();

    if (!inventory.length) return 0;

    let matches = 0;
    let priceMatches = 0;

    for (const item of inputItems) {
      const inv = inventory.find(i => 
        (item.upc && i.productId?.upc === item.upc) || 
        (item.receiptName && i.productId?.name === item.receiptName)
      );

      if (inv) {
        matches++;
        const receiptUnitPrice = item.totalPrice / (item.quantity || 1);
        const invPrice = inv.observedPrice || inv.retailPrice;
        
        if (invPrice && Math.abs(invPrice - receiptUnitPrice) < 0.01) {
          priceMatches++;
        }
      }
    }

    if (matches === 0) return 0;
    // Return a score based on how many prices matched existing inventory
    return (priceMatches / matches) * 0.2; // Max 0.2 bonus for price consistency
  } catch (err) {
    console.error('Error building price similarity score:', err);
    return 0;
  }
};

const isAmbiguousResult = (topCandidates = [], minConfidence = 0.6, ambiguityDelta = 0.1) => {
  if (topCandidates.length < 2) return false;
  const [first, second] = topCandidates;
  if (!first || !second) return false;
  if (first.confidence < minConfidence || second.confidence < minConfidence) return false;
  return Math.abs(first.confidence - second.confidence) <= ambiguityDelta;
};

export async function matchStoreCandidate(
  candidate,
  { minConfidence = 0.7, maxCandidates = 5, ambiguityDelta = 0.1, items = [] } = {}
) {
  if (!candidate) {
    return { match: null, confidence: 0, reason: 'no candidate', matchReason: 'no_candidate', topCandidates: [] };
  }

  if (candidate.storeId) {
    const store = await Store.findById(candidate.storeId).lean();
    if (store) {
      const explicitCandidate = {
        storeId: store._id.toString(),
        name: store.name,
        confidence: 1,
        score: 1,
        reasonCodes: ['EXPLICIT_STORE_ID'],
        reasons: [{ code: 'EXPLICIT_STORE_ID', message: 'Explicit storeId provided.', weight: 1 }],
        address: store.address || {},
        phone: store.phone || ''
      };
      return {
        match: store,
        confidence: 1,
        reason: 'explicit storeId',
        matchReason: 'explicit_store_id',
        ambiguous: false,
        topCandidates: [explicitCandidate]
      };
    }
  }

  const stores = await Store.find({}).lean();
  const rankedCandidates = [];

  for (const store of stores) {
    const baseResult = buildCandidateScore(candidate, store);
    
    // Add price similarity bonus if items are provided
    if (items.length > 0 && baseResult.confidence > 0.1) {
      const priceBonus = await buildPriceSimilarityScore(items, store._id);
      if (priceBonus > 0) {
        baseResult.score += priceBonus;
        baseResult.confidence = Math.max(0, Math.min(1, Number(baseResult.score.toFixed(4))));
        baseResult.reasons.push({ 
          code: 'PRICE_SIMILARITY', 
          message: 'Prices on receipt match existing store inventory.', 
          weight: priceBonus 
        });
      }
    }
    
    rankedCandidates.push({
      storeId: store._id.toString(),
      name: store.name,
      confidence: baseResult.confidence,
      score: baseResult.score,
      reasonCodes: baseResult.reasons.map(reason => reason.code),
      reasons: baseResult.reasons,
      address: store.address || {},
      phone: store.phone || ''
    });
  }

  rankedCandidates.sort((a, b) => b.confidence - a.confidence);
  const finalCandidates = rankedCandidates.slice(0, maxCandidates);

  if (finalCandidates.length === 0 || finalCandidates[0].confidence === 0) {
    return {
      match: null,
      confidence: candidate.confidence || 0,
      reason: 'no match',
      matchReason: 'no_match',
      ambiguous: false,
      topCandidates: []
    };
  }

  const topCandidate = finalCandidates[0];
  const ambiguous = isAmbiguousResult(finalCandidates, minConfidence, ambiguityDelta);
  if (topCandidate.confidence >= minConfidence && !ambiguous) {
    const match = stores.find(store => store._id.toString() === topCandidate.storeId) || null;
    return {
      match,
      confidence: topCandidate.confidence,
      reason: 'weighted match',
      matchReason: 'weighted_match',
      ambiguous: false,
      topCandidates: finalCandidates
    };
  }

  return {
    match: null,
    confidence: topCandidate.confidence,
    reason: ambiguous ? 'ambiguous weighted match' : 'low confidence weighted match',
    matchReason: ambiguous ? 'ambiguous_candidates' : 'low_confidence',
    ambiguous,
    topCandidates: finalCandidates
  };
}

export function shouldAutoCreateStore(candidate, { threshold = 0.85 } = {}) {
  if (!candidate) return false;
  const phoneNorm = normalizePhone(candidate.phoneNormalized || candidate.phone);
  const storeNumberNorm = normalizeStoreNumber(candidate.storeNumber);
  const zip = normalizeZip(candidate.address?.zip || '');
  const hasStreet = Boolean(normalizeStr(candidate.address?.street || candidate.address?.address || ''));
  if (storeNumberNorm || phoneNorm || (hasStreet && zip)) {
    return true;
  }
  const confidence = typeof candidate === 'number' ? candidate : candidate.confidence;
  return typeof confidence === 'number' ? confidence >= threshold : false;
}

export { inferStoreType, normalizePhone, normalizeStoreNumber, normalizeZip };
