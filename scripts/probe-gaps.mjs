#!/usr/bin/env node
/*
 * Live verification of the four backend gap-fixes (docs/API-GAPS.md, 2026-08-06):
 *   1. BTS branch details on GET /delivery/orders/{id}
 *   2. CustomerOut.created_at
 *   3. Category create-500 regression + full PATCH round-trip
 *   4. requires_box writable + mandatory-box enforcement on orders
 *
 * Usage:
 *   ALMAZ_EMAIL=... ALMAZ_PASSWORD=... node scripts/probe-gaps.mjs
 *
 * Read-only except section 3/4, which create a throwaway category/product and
 * delete them afterwards (names prefixed PROBE- so strays are identifiable).
 */
const BASE = process.env.ALMAZ_BASE ?? 'https://almaz.api.cognilabs.org';
const EMAIL = process.env.ALMAZ_EMAIL;
const PASSWORD = process.env.ALMAZ_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error('Set ALMAZ_EMAIL and ALMAZ_PASSWORD.');
  process.exit(1);
}

let token = '';
async function req(method, path, body, raw = false) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* keep text */ }
  if (raw) return { status: res.status, json, text };
  return { status: res.status, json };
}
const items = (j) => (Array.isArray(j) ? j : j?.items ?? []);
const H = (s) => console.log(`\n\x1b[1m=== ${s} ===\x1b[0m`);

// ---- login ----
{
  const r = await req('POST', '/auth/login', { email: EMAIL, password: PASSWORD });
  if (r.status !== 200) { console.error('Login failed', r.status, r.json); process.exit(1); }
  token = r.json.access_token;
  console.log('login ok');
}

// ---- 1. BTS branch on delivery ----
H('1. BTS branch on GET /delivery/orders/{id}');
{
  const orders = items((await req('GET', '/orders?limit=200')).json);
  if (orders[0]) console.log('OrderOut keys:', Object.keys(orders[0]).join(', '));
  let shown = 0;
  for (const o of orders) {
    const d = await req('GET', `/delivery/orders/${o.id}`);
    if (d.status !== 200) continue;
    const keys = Object.keys(d.json);
    if (shown === 0) console.log('DeliveryOut keys:', keys.join(', '));
    const isBts = d.json.provider === 'bts' || d.json.zone === 'region';
    if (isBts || shown === 0) {
      console.log(`order ${o.order_no}: zone=${d.json.zone} provider=${d.json.provider}`,
        'bts_branch' in d.json ? `bts_branch=${JSON.stringify(d.json.bts_branch)}` : 'NO bts_branch field',
        'bts_branch_id' in d.json ? `bts_branch_id=${d.json.bts_branch_id}` : '');
      shown++;
    }
    if (shown >= 4) break;
  }
  if (shown === 0) console.log('no deliveries found to inspect');
}

// ---- 2. customer created_at ----
H('2. CustomerOut.created_at');
{
  const convs = items((await req('GET', '/inbox/conversations?limit=5')).json);
  const c = convs.find((x) => x.customer)?.customer;
  if (!c) console.log('no customer objects visible');
  else {
    console.log('customer keys:', Object.keys(c).join(', '));
    console.log('created_at' in c ? `created_at = ${c.created_at}` : 'NO created_at field');
  }
}

// ---- 3. category create/patch regression ----
H('3. Category create + PATCH round-trip');
let catId = null;
{
  const min = await req('POST', '/catalog/categories', { name_uz: 'PROBE-minimal' });
  console.log('create minimal:', min.status, min.status !== 200 && min.status !== 201 ? JSON.stringify(min.json) : 'ok');
  if (min.json?.id) await req('DELETE', `/catalog/categories/${min.json.id}`);

  const full = await req('POST', '/catalog/categories', {
    name_uz: 'PROBE-full', name_ru: 'ПРОБА', slug: 'probe-full', parent_id: null,
    requires_ring_size: true, available_sizes: ['16', '17.5'], requires_box: true,
  });
  console.log('create full:', full.status);
  if (full.json?.id) {
    catId = full.json.id;
    const echo = full.json;
    for (const k of ['name_ru', 'slug', 'requires_ring_size', 'available_sizes', 'requires_box'])
      console.log(`  round-trip ${k}:`, JSON.stringify(echo[k]));
    const p1 = await req('PATCH', `/catalog/categories/${catId}`, { name_ru: 'ПРОБА-2', requires_box: false });
    console.log('PATCH name_ru+requires_box=false:', p1.status, `-> requires_box=${p1.json?.requires_box}, name_ru=${p1.json?.name_ru}`);
    const p2 = await req('PATCH', `/catalog/categories/${catId}`, { available_sizes: null, requires_box: true });
    console.log('PATCH available_sizes=null (+box back on):', p2.status, `-> sizes=${JSON.stringify(p2.json?.available_sizes)}, requires_box=${p2.json?.requires_box}`);
  }
}

// ---- 4. requires_box end-to-end ----
H('4. requires_box propagation + order enforcement');
let prodId = null;
{
  if (!catId) console.log('skipped (category create failed)');
  else {
    const prod = await req('POST', '/catalog/products', {
      name_uz: 'PROBE-box-product', price: 10000,
      category_id: catId, variants: [{ fulfillment_type: 'stocked', stock_qty: 5, is_active: true }],
    });
    console.log('create product:', prod.status);
    if (prod.json?.id) {
      prodId = prod.json.id;
      console.log('ProductOut.requires_box =', JSON.stringify(prod.json.requires_box),
        '| requires_ring_size =', JSON.stringify(prod.json.requires_ring_size));
      const variantId = prod.json.variants?.[0]?.id;
      const convs = items((await req('GET', '/inbox/conversations?limit=5')).json);
      const customerId = convs.find((x) => x.customer)?.customer?.id;
      if (variantId && customerId) {
        const order = await req('POST', '/orders', {
          customer_id: customerId,
          items: [{ variant_id: variantId, quantity: 1, ring_size: '17' }], // no box_id on purpose
        });
        if (order.status >= 400) {
          console.log(`box-less order REJECTED (${order.status}):`, JSON.stringify(order.json?.detail ?? order.json));
        } else {
          console.log(`⚠ box-less order ACCEPTED (${order.status}) — server-side enforcement gap; order ${order.json?.order_no}`);
          await req('POST', `/orders/${order.json.id}/cancel`, { reason: 'PROBE cleanup' });
          console.log('  (probe order cancelled)');
        }
      } else console.log('no variant/customer available to attempt the order');
    }
  }
  // cleanup
  if (prodId) console.log('delete product:', (await req('DELETE', `/catalog/products/${prodId}`)).status);
  if (catId) console.log('delete category:', (await req('DELETE', `/catalog/categories/${catId}`)).status);
}

console.log('\ndone.');
