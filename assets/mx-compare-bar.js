import { MxCompare } from '@theme/mx-compare';

class MxCompareBar extends HTMLElement {
  connectedCallback() {
    this.#update();
    document.addEventListener('mx:compare:update', this.#handleUpdate);
    this.querySelector('[data-compare-now]')?.addEventListener('click', this.#handleCompareNow);
    this.querySelector('[data-clear-all]')?.addEventListener('click', this.#handleClearAll);
  }

  disconnectedCallback() {
    document.removeEventListener('mx:compare:update', this.#handleUpdate);
  }

  #handleUpdate = () => {
    this.#update();
  };

  #handleCompareNow = () => {
    const url = this.dataset.compareUrl;
    if (url) window.location.href = url;
  };

  #handleClearAll = () => {
    MxCompare.clearProducts();
  };

  #update() {
    const products = MxCompare.getProducts();
    const count = products.length;
    const max = MxCompare.getMax();
    this.hidden = count === 0;
    const countEl = this.querySelector('[data-compare-count]');
    if (countEl) {
      const template = countEl.dataset.template || '';
      countEl.textContent = template
        .replace('{{ count }}', String(count))
        .replace('{{ max }}', String(max));
    }
    const compareBtn = this.querySelector('[data-compare-now]');
    if (compareBtn) compareBtn.disabled = count < 2;
  }
}

if (!customElements.get('mx-compare-bar')) {
  customElements.define('mx-compare-bar', MxCompareBar);
}
