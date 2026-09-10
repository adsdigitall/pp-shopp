import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAutomationOffer, scoreAutomationOffer, validateAutomationOfferForDispatch } from '../server/services/automation/scoring.mjs';

test('scores strong offers and classifies them as approved', () => {
  const offer = { salesCount: 5000, rating: 4.8, reviewsCount: 1200, discountPercentage: 35, currentPrice: 39.9, commissionRate: 12, stock: 100 };
  const result = evaluateAutomationOffer(offer);
  assert.equal(result.approved, true);
  assert.ok(result.score >= 70);
  assert.ok(scoreAutomationOffer(offer) <= 100);
});

test('rejects automatic offers with zero or few sales', () => {
  const result = evaluateAutomationOffer({ salesCount: 0, rating: 5, currentPrice: 29.9, discountPercentage: 50 });
  assert.equal(result.approved, false);
  assert.ok(result.reasons.includes('0 vendas'));
});

test('rejects low rating and unavailable stock', () => {
  const result = evaluateAutomationOffer({ salesCount: 800, rating: 4.1, reviewsCount: 20, currentPrice: 29.9, stock: 0 });
  assert.equal(result.approved, false);
  assert.ok(result.reasons.includes('Avaliação baixa'));
  assert.ok(result.reasons.includes('Produto sem estoque'));
});

test('validates required dispatch fields without inventing data', () => {
  const invalid = validateAutomationOfferForDispatch({ currentPrice: 19.9, affiliateUrl: 'not-a-url' });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.includes('nome ausente'));
  assert.ok(invalid.errors.includes('link de afiliado ausente'));

  const valid = validateAutomationOfferForDispatch({ name: 'Produto real', currentPrice: 19.9, affiliateUrl: 'https://s.shopee.com.br/teste', stock: null });
  assert.equal(valid.valid, true);
});
