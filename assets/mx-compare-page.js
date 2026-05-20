import { MxCompare } from '@theme/mx-compare';

function getConfig() {
  try {
    return JSON.parse(document.getElementById('mx-compare-config')?.textContent || '{}');
  } catch {
    return {};
  }
}

async function fetchProduct(handle) {
  const res = await fetch(`/products/${handle}.js`);
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function formatMoney(cents) {
  return (cents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: window.Shopify?.currency?.active || 'USD',
  });
}

function sanitizeDescription(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html || '';
  tpl.content.querySelectorAll('script, iframe, object, embed, form').forEach((el) => el.remove());
  tpl.content.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach((attr) => {
      if (/^on/i.test(attr.name)) { el.removeAttribute(attr.name); return; }
      if (/^(href|src|action|xlink:href)$/i.test(attr.name) && /^\s*(javascript|data):/i.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return tpl.innerHTML;
}

function getCellContent(product, key, T) {
  switch (key) {
    case 'image': return '';
    case 'title': {
      const a = document.createElement('a');
      a.href = product.url;
      a.className = 'mx-compare__product-title';
      a.textContent = product.title;
      return a.outerHTML;
    }
    case 'price':
      return `<span class="mx-compare__price">${formatMoney(product.price)}</span>`;
    case 'vendor': {
      const span = document.createElement('span');
      span.textContent = product.vendor || '—';
      return span.outerHTML;
    }
    case 'availability': {
      const available = product.available;
      const span = document.createElement('span');
      span.className = `mx-compare__availability mx-compare__availability--${available ? 'available' : 'unavailable'}`;
      span.textContent = available ? T.available : T.unavailable;
      return span.outerHTML;
    }
    case 'description': {
      const clean = sanitizeDescription(product.description);
      return `<div class="mx-compare__description">${clean || '—'}</div>`;
    }
    default:
      return '—';
  }
}

function buildHeaderCell(product, T) {
  const th = document.createElement('th');
  th.className = 'mx-compare__product-header';

  const removeBtn = document.createElement('button');
  removeBtn.className = 'mx-compare__product-remove';
  removeBtn.setAttribute('aria-label', T.remove);
  removeBtn.textContent = '\xd7';
  removeBtn.addEventListener('click', () => {
    MxCompare.removeProduct(product.handle);
    renderComparePage();
  });
  th.appendChild(removeBtn);

  if (product.featured_image) {
    const img = document.createElement('img');
    img.src = product.featured_image;
    img.alt = product.title;
    img.className = 'mx-compare__product-image';
    img.loading = 'lazy';
    th.appendChild(img);
  }

  const titleLink = document.createElement('a');
  titleLink.href = product.url;
  titleLink.className = 'mx-compare__product-title';
  titleLink.textContent = product.title;
  th.appendChild(titleLink);

  return th;
}

function buildCard(product, rows, T) {
  const card = document.createElement('div');
  card.className = 'mx-compare__card';

  const header = document.createElement('div');
  header.className = 'mx-compare__card-header';

  const removeBtn = document.createElement('button');
  removeBtn.className = 'mx-compare__card-remove';
  removeBtn.setAttribute('aria-label', T.remove);
  removeBtn.textContent = '\xd7';
  removeBtn.addEventListener('click', () => {
    MxCompare.removeProduct(product.handle);
    renderComparePage();
  });
  header.appendChild(removeBtn);

  if (product.featured_image) {
    const img = document.createElement('img');
    img.src = product.featured_image;
    img.alt = product.title;
    img.className = 'mx-compare__product-image';
    img.loading = 'lazy';
    header.appendChild(img);
  }

  const titleLink = document.createElement('a');
  titleLink.href = product.url;
  titleLink.className = 'mx-compare__product-title';
  titleLink.textContent = product.title;
  header.appendChild(titleLink);
  card.appendChild(header);

  const body = document.createElement('div');
  body.className = 'mx-compare__card-body';

  for (const row of rows) {
    if (!row.showInCard) continue;
    const rowEl = document.createElement('div');
    rowEl.className = 'mx-compare__card-row';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'mx-compare__card-label';
    labelSpan.textContent = row.label;
    rowEl.appendChild(labelSpan);

    const valueSpan = document.createElement('span');
    valueSpan.className = 'mx-compare__card-value';
    valueSpan.innerHTML = getCellContent(product, row.key, T);
    rowEl.appendChild(valueSpan);

    body.appendChild(rowEl);
  }
  card.appendChild(body);
  return card;
}

let _renderVersion = 0;

export async function renderComparePage() {
  const { rows = [], translations: T = {} } = getConfig();
  const version = ++_renderVersion;

  const loadingEl = document.getElementById('mx-compare-loading');
  const emptyEl = document.getElementById('mx-compare-empty');
  const tableWrapper = document.getElementById('mx-compare-table-wrapper');
  const headerRow = document.getElementById('mx-compare-header-row');
  const tbody = document.getElementById('mx-compare-body');
  const cardsEl = document.getElementById('mx-compare-cards');

  let handles = MxCompare.getProducts();

  const designMode = window.Shopify?.designMode;
  if (designMode && handles.length === 0) {
    handles = ['__preview__'];
  }

  if (handles.length === 0) {
    loadingEl.hidden = true;
    emptyEl.hidden = false;
    tableWrapper.hidden = true;
    cardsEl.hidden = true;
    return;
  }

  loadingEl.hidden = false;
  emptyEl.hidden = true;
  tableWrapper.hidden = true;
  cardsEl.hidden = true;

  const products = await Promise.all(handles.map((h) => (h === '__preview__' ? null : fetchProduct(h))));
  if (version !== _renderVersion) return;
  const validProducts = products.filter(Boolean);

  loadingEl.hidden = true;

  if (validProducts.length === 0) {
    emptyEl.hidden = false;
    return;
  }

  headerRow.innerHTML = '<th></th>';
  validProducts.forEach((p) => headerRow.appendChild(buildHeaderCell(p, T)));

  tbody.innerHTML = '';
  for (const row of rows) {
    if (row.key === 'image') continue;
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = row.label;
    tr.appendChild(th);
    validProducts.forEach((p) => {
      const td = document.createElement('td');
      td.innerHTML = getCellContent(p, row.key, T);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
  tableWrapper.hidden = false;

  cardsEl.innerHTML = '';
  validProducts.forEach((p) => cardsEl.appendChild(buildCard(p, rows, T)));
  cardsEl.hidden = false;
}
