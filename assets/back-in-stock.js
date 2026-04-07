/**
 * Back in Stock notification signup Web Component.
 *
 * Renders a "Notify Me" button when a variant is sold out.
 * Opens a modal to collect the customer's email address.
 * POSTs to the Shopify App Proxy at /apps/notify/back-in-stock.
 */

const VARIANT_UPDATE_EVENT = 'variant:update';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOAST_DISPLAY_DURATION = 4000;
const TOAST_FADE_DURATION = 300;

class BackInStockSignup extends HTMLElement {
  /** @type {HTMLDialogElement | null} */
  #dialog = null;

  /** @type {HTMLFormElement | null} */
  #form = null;

  /** @type {HTMLInputElement | null} */
  #emailInput = null;

  /** @type {HTMLElement | null} */
  #errorEl = null;

  /** @type {HTMLButtonElement | null} */
  #submitBtn = null;

  connectedCallback() {
    const dialogId = this.dataset.dialogId;
    if (dialogId) {
      this.#dialog = document.getElementById(dialogId);
    }

    if (this.#dialog) {
      this.#form = this.#dialog.querySelector('[data-back-in-stock-form]');
      this.#emailInput = this.#dialog.querySelector('input[name="email"]');
      this.#errorEl = this.#dialog.querySelector('[data-back-in-stock-error]');
      this.#submitBtn = this.#dialog.querySelector('[data-back-in-stock-submit]');

      this.#dialog
        .querySelector('[data-back-in-stock-close]')
        ?.addEventListener('click', this.#closeModal);

      this.#dialog.addEventListener('keydown', this.#onDialogKeyDown);
      this.#dialog.addEventListener('click', this.#onDialogBackdropClick);
      this.#form?.addEventListener('submit', this.#onFormSubmit);
    }

    this.querySelector('[data-back-in-stock-trigger]')?.addEventListener('click', this.#openModal);
    document.addEventListener(VARIANT_UPDATE_EVENT, this.#onVariantUpdate);
  }

  disconnectedCallback() {
    document.removeEventListener(VARIANT_UPDATE_EVENT, this.#onVariantUpdate);
    this.#dialog?.removeEventListener('keydown', this.#onDialogKeyDown);
    this.#dialog?.removeEventListener('click', this.#onDialogBackdropClick);
    this.#form?.removeEventListener('submit', this.#onFormSubmit);
  }

  /** @param {CustomEvent} event */
  #onVariantUpdate = (event) => {
    const myProductId = this.dataset.productId;
    const eventProductId = event.detail?.data?.productId;
    const newProduct = event.detail?.data?.newProduct;

    if (!newProduct && eventProductId !== myProductId) return;

    const variant = event.detail?.resource;
    const addToCartArea = this.#getAddToCartArea();

    if (variant && variant.available === false) {
      this.removeAttribute('hidden');
      this.dataset.variantSku = variant.sku || String(variant.id);
      this.dataset.variantId = String(variant.id);
      addToCartArea?.setAttribute('hidden', '');
    } else {
      this.setAttribute('hidden', '');
      addToCartArea?.removeAttribute('hidden');
    }
  };

  /** @returns {Element | null} */
  #getAddToCartArea() {
    const form = this.closest('product-form-component');
    return form?.querySelector('[data-add-to-cart-wrapper]') ?? null;
  }

  #openModal = () => {
    if (!this.#dialog) return;
    this.#clearError();
    if (this.#emailInput) this.#emailInput.value = '';
    this.#dialog.showModal();
    this.#emailInput?.focus();
  };

  #closeModal = () => {
    this.#dialog?.close();
  };

  /** @param {KeyboardEvent} event */
  #onDialogKeyDown = (event) => {
    if (event.key === 'Escape') {
      this.#closeModal();
      return;
    }
    if (event.key === 'Tab') {
      this.#trapFocus(event);
    }
  };

  /** @param {MouseEvent} event */
  #onDialogBackdropClick = (event) => {
    if (event.target === this.#dialog) {
      this.#closeModal();
    }
  };

  /** @param {KeyboardEvent} event */
  #trapFocus(event) {
    if (!this.#dialog) return;

    const focusable = /** @type {NodeListOf<HTMLElement>} */ (
      this.#dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /** @param {SubmitEvent} event */
  #onFormSubmit = async (event) => {
    event.preventDefault();
    this.#clearError();

    const email = this.#emailInput?.value.trim() ?? '';

    if (!email) {
      this.#showError(this.#t('notify_me_invalid_email') || 'Please enter a valid email address.');
      this.#emailInput?.focus();
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      this.#showError(this.#t('notify_me_invalid_email') || 'Please enter a valid email address.');
      this.#emailInput?.focus();
      return;
    }

    if (this.#submitBtn) {
      this.#submitBtn.disabled = true;
    }

    const sku = this.dataset.variantSku || this.dataset.variantId || '';
    const shop = window.Shopify?.shop ?? '';

    try {
      const response = await fetch('/apps/notify/back-in-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, email, shop }),
      });

      if (response.ok || response.status === 409) {
        this.#closeModal();
        this.#showToast(this.#t('notify_me_success') || 'You will be notified when this item is back in stock!');
      } else {
        const message = this.#t('notify_me_error') || 'Something went wrong. Please try again.';
        this.#showError(message);
      }
    } catch (_err) {
      this.#showError(this.#t('notify_me_error') || 'Something went wrong. Please try again.');
    } finally {
      if (this.#submitBtn) {
        this.#submitBtn.disabled = false;
      }
    }
  };

  /** @param {string} message */
  #showError(message) {
    if (!this.#errorEl) return;
    this.#errorEl.textContent = message;
    this.#errorEl.classList.remove('hidden');
  }

  #clearError() {
    if (!this.#errorEl) return;
    this.#errorEl.textContent = '';
    this.#errorEl.classList.add('hidden');
  }

  /** @param {string} message */
  #showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'back-in-stock-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('back-in-stock-toast--fading');
      setTimeout(() => toast.remove(), TOAST_FADE_DURATION);
    }, TOAST_DISPLAY_DURATION - TOAST_FADE_DURATION);
  }

  /**
   * Resolves a translation key from the component's data attributes.
   * Translations are embedded as data-i18n-* attributes on the element.
   * @param {string} key
   * @returns {string | null}
   */
  #t(key) {
    return this.dataset[`i18n${key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`] ?? null;
  }
}

if (!customElements.get('back-in-stock-signup')) {
  customElements.define('back-in-stock-signup', BackInStockSignup);
}
