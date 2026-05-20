import { MxCompare } from '@theme/mx-compare';

class MxCompareButton extends HTMLElement {
  connectedCallback() {
    this.#update();
    document.addEventListener('mx:compare:update', this.#handleUpdate);
    this.addEventListener('click', this.#handleClick);
  }

  disconnectedCallback() {
    document.removeEventListener('mx:compare:update', this.#handleUpdate);
  }

  get #handle() {
    return this.dataset.productHandle;
  }

  #handleUpdate = () => {
    this.#update();
  };

  #handleClick = () => {
    const handle = this.#handle;
    if (!handle) return;
    if (MxCompare.hasProduct(handle)) {
      MxCompare.removeProduct(handle);
    } else {
      MxCompare.addProduct(handle);
    }
  };

  #update() {
    const handle = this.#handle;
    const active = handle ? MxCompare.hasProduct(handle) : false;
    const full = MxCompare.isFull();
    this.classList.toggle('mx-compare-button--active', active);
    this.disabled = !active && full;
    const label = this.querySelector('[data-compare-label]');
    if (label) {
      label.textContent = active
        ? this.dataset.labelAdded || label.textContent
        : this.dataset.labelAdd || label.textContent;
    }
    const icon = this.querySelector('[data-compare-icon]');
    if (icon) {
      icon.hidden = !active;
    }
  }
}

if (!customElements.get('mx-compare-button')) {
  customElements.define('mx-compare-button', MxCompareButton);
}
