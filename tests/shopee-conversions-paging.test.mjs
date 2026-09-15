import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchRecentConversions } from '../server/services/shopee/reports.mjs';

const node = (id) => ({ conversionId: id, purchaseTime: 1, conversionStatus: 'PENDING', orders: [] });

test('busca todas as páginas do relatório usando scrollId', async () => {
  const queries = [];
  const pages = [
    { nodes: [node('a'), node('b')], pageInfo: { hasNextPage: true, scrollId: 's1' } },
    { nodes: [node('c')], pageInfo: { hasNextPage: true, scrollId: 's2' } },
    { nodes: [node('d')], pageInfo: { hasNextPage: false, scrollId: '' } },
  ];
  const request = async ({ query }) => { queries.push(query); return { conversionReport: pages[queries.length - 1] }; };
  const { nodes, pageInfo } = await fetchRecentConversions({ config: {}, sinceSeconds: 0, request });
  assert.deepEqual(nodes.map((n) => n.conversionId), ['a', 'b', 'c', 'd']);
  assert.equal(pageInfo.hasNextPage, false);
  assert.ok(!queries[0].includes('scrollId:'));
  assert.ok(queries[1].includes('scrollId: "s1"'));
  assert.ok(queries[2].includes('scrollId: "s2"'));
});

test('para no limite de páginas e avisa que ficou incompleto', async () => {
  let calls = 0;
  const request = async () => { calls += 1; return { conversionReport: { nodes: [node(`n${calls}`)], pageInfo: { hasNextPage: true, scrollId: `s${calls}` } } }; };
  const { nodes, pageInfo } = await fetchRecentConversions({ config: {}, sinceSeconds: 0, request, maxPages: 3 });
  assert.equal(calls, 3);
  assert.equal(nodes.length, 3);
  assert.equal(pageInfo.hasNextPage, true);
});

test('não repete conversão que vier em duas páginas', async () => {
  const pages = [
    { nodes: [node('a')], pageInfo: { hasNextPage: true, scrollId: 's1' } },
    { nodes: [node('a'), node('b')], pageInfo: { hasNextPage: false } },
  ];
  let i = 0;
  const request = async () => ({ conversionReport: pages[i++] });
  const { nodes } = await fetchRecentConversions({ config: {}, sinceSeconds: 0, request });
  assert.deepEqual(nodes.map((n) => n.conversionId), ['a', 'b']);
});

test('se a Shopee recusar scrollId, volta a buscar uma página do jeito antigo', async () => {
  const queries = [];
  const request = async ({ query }) => {
    queries.push(query);
    if (query.includes('scrollId }')) throw new Error('Cannot query field scrollId');
    return { conversionReport: { nodes: [node('a')], pageInfo: { hasNextPage: false } } };
  };
  const { nodes } = await fetchRecentConversions({ config: {}, sinceSeconds: 0, request });
  assert.equal(queries.length, 2);
  assert.deepEqual(nodes.map((n) => n.conversionId), ['a']);
});
