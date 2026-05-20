import { Component } from '@theme/component';

const STORAGE_KEY = 'mx-wishlist';
const MAX_ITEMS = 50;
const WISHLIST_UPDATE_EVENT = 'wishlist:update';

export class MxWishlist {
  static #getData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || { id: null, items: [] };
    } catch {
      return { id: null, items: [] };
    }
  }

  static #saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  static #ensureId(data) {
    if (!data.id) {
      data.id = crypto.randomUUID();
    }
    return data;
  }

  static getItems() {
    return this.#getData().items;
  }

  static hasItem(handle) {
    return this.#getData().items.includes(handle);
  }

  static addItem(handle) {
    const data = this.#ensureId(this.#getData());
    if (!data.items.includes(handle)) {
      data.items.unshift(handle);
      if (data.items.length > MAX_ITEMS) {
        data.items = data.items.slice(0, MAX_ITEMS);
      }
      this.#saveData(data);
    }
  }

  static removeItem(handle) {
    const data = this.#getData();
    data.items = data.items.filter((h) => h !== handle);
    this.#saveData(data);
  }

  static toggleItem(handle) {
    if (this.hasItem(handle)) {
      this.removeItem(handle);
      return false;
    } else {
      this.addItem(handle);
      return true;
    }
  }

  static getShareUrl() {
    const items = this.getItems();
    const encoded = btoa(JSON.stringify(items));
    return `${window.location.origin}/pages/wishlist?list=${encodeURIComponent(encoded)}`;
  }

  static decodeShareParam(param) {
    try {
      const decoded = JSON.parse(atob(decodeURIComponent(param)));
      return Array.isArray(decoded) ? decoded : [];
    } catch {
      return [];
    }
  }
}

class MxWishlistButton extends Component {
  connectedCallback() {
    super.connectedCallback();
    this.#syncState();
    document.addEventListener(WISHLIST_UPDATE_EVENT, () => this.#syncState());
  }

  handleToggle() {
    const handle = this.getAttribute('data-product-handle');
    if (!handle) return;
    MxWishlist.toggleItem(handle);
    this.#syncState();
    document.dispatchEvent(new CustomEvent(WISHLIST_UPDATE_EVENT, { bubbles: true }));
  }

  #syncState() {
    const handle = this.getAttribute('data-product-handle');
    if (!handle) return;
    const active = MxWishlist.hasItem(handle);
    this.setAttribute('data-active', String(active));
    const btn = this.querySelector('.mx-wishlist-btn');
    if (btn) {
      btn.setAttribute('aria-pressed', String(active));
      const label = this.getAttribute(active ? 'data-label-remove' : 'data-label-add');
      if (label) btn.setAttribute('aria-label', label);
    }
  }
}

if (!customElements.get('mx-wishlist-button')) {
  customElements.define('mx-wishlist-button', MxWishlistButton);
}

class MxWishlistPage extends Component {
  connectedCallback() {
    super.connectedCallback();
    this.#init();
    document.addEventListener(WISHLIST_UPDATE_EVENT, () => this.#init());
  }

  async #init() {
    const listParam = new URLSearchParams(window.location.search).get('list');
    const isShared = listParam !== null;
    const handles = isShared ? MxWishlist.decodeShareParam(listParam) : MxWishlist.getItems();

    const grid = this.querySelector('[data-wishlist-grid]');
    const empty = this.querySelector('[data-wishlist-empty]');
    const shareSection = this.querySelector('[data-wishlist-share]');
    const sharedBanner = this.querySelector('[data-wishlist-shared-banner]');
    const countEl = this.querySelector('[data-wishlist-count]');

    if (!grid) return;

    if (sharedBanner) {
      sharedBanner.hidden = !isShared;
    }
    if (shareSection) {
      shareSection.hidden = isShared;
    }

    if (handles.length === 0) {
      grid.innerHTML = '';
      grid.hidden = true;
      if (empty) empty.hidden = false;
      if (countEl) countEl.textContent = '0';
      return;
    }

    if (empty) empty.hidden = true;
    grid.hidden = false;
    if (countEl) countEl.textContent = String(handles.length);

    grid.innerHTML = '<div class="mx-wishlist-page__loading" aria-live="polite"></div>';

    const products = await Promise.all(handles.map((h) => this.#fetchProduct(h)));

    grid.innerHTML = '';
    products.forEach((product, i) => {
      if (!product) return;
      const handle = handles[i];
      const card = this.#buildCard(product, handle, isShared);
      grid.appendChild(card);
    });
  }

  async #fetchProduct(handle) {
    try {
      const res = await fetch(`/products/${handle}.js`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  #buildCard(product, handle, isShared) {
    const item = document.createElement('div');
    item.className = 'mx-wishlist-card';
    item.dataset.handle = handle;

    const imageUrl = product.featured_image
      ? `${product.featured_image}&width=400`
      : null;

    const price = this.#formatMoney(product.price);

    item.innerHTML = `
      <a class="mx-wishlist-card__image-link" href="/products/${handle}" aria-label="${this.#escape(product.title)}">
        ${imageUrl ? `<img class="mx-wishlist-card__image" src="${imageUrl}" alt="${this.#escape(product.title)}" loading="lazy" width="200" height="200">` : '<div class="mx-wishlist-card__image-placeholder"></div>'}
      </a>
      <div class="mx-wishlist-card__info">
        <a class="mx-wishlist-card__title" href="/products/${handle}">${this.#escape(product.title)}</a>
        <span class="mx-wishlist-card__price">${price}</span>
      </div>
      ${!isShared ? `<button class="mx-wishlist-card__remove button-unstyled" data-remove="${this.#escape(handle)}" aria-label="${this.#escape(this.getAttribute('data-label-remove') || 'Remove')}">
        <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20"><path d="M4 4L16 16M16 4L4 16" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
      </button>` : ''}
    `;

    if (!isShared) {
      const removeBtn = item.querySelector('[data-remove]');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          MxWishlist.removeItem(handle);
          document.dispatchEvent(new CustomEvent(WISHLIST_UPDATE_EVENT, { bubbles: true }));
        });
      }
    }

    return item;
  }

  #formatMoney(cents) {
    if (typeof cents !== 'number') return '';
    return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: window.Shopify?.currency?.active || 'USD' });
  }

  #escape(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  handleCopyLink() {
    const url = MxWishlist.getShareUrl();
    navigator.clipboard.writeText(url).then(() => {
      const msg = this.querySelector('[data-copy-success]');
      if (msg) {
        msg.hidden = false;
        setTimeout(() => { msg.hidden = true; }, 3000);
      }
    });
  }
}

if (!customElements.get('mx-wishlist-page')) {
  customElements.define('mx-wishlist-page', MxWishlistPage);
}
