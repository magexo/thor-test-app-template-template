import { Component } from '@theme/component';

const WISHLIST_STORAGE_KEY = 'wishlist';
const WISHLIST_UPDATE_EVENT = 'wishlist:update';

/**
 * A custom element that renders a wishlist toggle button on the product page.
 *
 * @typedef {object} Refs
 *
 * @extends {Component<Refs>}
 */
class WishlistButton extends Component {
  connectedCallback() {
    super.connectedCallback();

    this.#initState();
    document.addEventListener(WISHLIST_UPDATE_EVENT, this.#onWishlistUpdate);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    document.removeEventListener(WISHLIST_UPDATE_EVENT, this.#onWishlistUpdate);
  }

  /**
   * Returns the product ID from the data attribute as a string.
   * @returns {string}
   */
  get productId() {
    return String(this.dataset.productId ?? '');
  }

  /**
   * Reads the current wishlist from localStorage.
   * @returns {string[]}
   */
  #readWishlist() {
    try {
      const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (_) {
      return [];
    }
  }

  /**
   * Writes the wishlist array to localStorage.
   * @param {string[]} list
   */
  #writeWishlist(list) {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(list));
    } catch (_) {
      // localStorage unavailable (e.g. private browsing with storage blocked) — degrade gracefully
    }
  }

  /**
   * Initialises the in-wishlist state from localStorage.
   */
  #initState() {
    const list = this.#readWishlist();
    this.dataset.inWishlist = String(list.includes(this.productId));
    this.#updateAriaLabel(list.includes(this.productId));
  }

  /**
   * Updates the aria-label based on wishlist state.
   * @param {boolean} inWishlist
   */
  #updateAriaLabel(inWishlist) {
    // aria-label is set from Liquid; update dynamically when state changes
    if (inWishlist) {
      this.setAttribute('aria-label', this.dataset.labelRemove ?? 'Remove from wishlist');
    } else {
      this.setAttribute('aria-label', this.dataset.labelAdd ?? 'Add to wishlist');
    }
  }

  /**
   * Handles the wishlist:update event dispatched by other wishlist components.
   */
  #onWishlistUpdate = () => {
    this.#initState();
  };

  /**
   * Handles a click on the wishlist button — toggles the product in the wishlist.
   */
  handleClick = () => {
    const list = this.#readWishlist();
    const id = this.productId;
    const index = list.indexOf(id);
    let updatedList;

    if (index === -1) {
      updatedList = [...list, id];
    } else {
      updatedList = list.filter((item) => item !== id);
    }

    this.#writeWishlist(updatedList);
    this.dataset.inWishlist = String(updatedList.includes(id));
    this.#updateAriaLabel(updatedList.includes(id));

    document.dispatchEvent(
      new CustomEvent(WISHLIST_UPDATE_EVENT, {
        detail: { count: updatedList.length },
        bubbles: false,
      })
    );
  };
}

if (!customElements.get('wishlist-button')) {
  customElements.define('wishlist-button', WishlistButton);
}
