import { Component } from '@theme/component';

const WISHLIST_STORAGE_KEY = 'wishlist';
const WISHLIST_UPDATE_EVENT = 'wishlist:update';

/**
 * A custom element that displays a wishlist icon with a count badge in the header.
 *
 * @typedef {object} Refs
 * @property {HTMLElement} wishlistBubble - The wishlist bubble container element.
 * @property {HTMLElement} wishlistBubbleCount - The wishlist bubble count text element.
 *
 * @extends {Component<Refs>}
 */
class WishlistIcon extends Component {
  requiredRefs = ['wishlistBubble', 'wishlistBubbleCount'];

  connectedCallback() {
    super.connectedCallback();

    this.#updateBadge(this.#readWishlistCount());
    document.addEventListener(WISHLIST_UPDATE_EVENT, this.#onWishlistUpdate);
    window.addEventListener('pageshow', this.#onPageShow);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    document.removeEventListener(WISHLIST_UPDATE_EVENT, this.#onWishlistUpdate);
    window.removeEventListener('pageshow', this.#onPageShow);
  }

  /**
   * Reads the wishlist count from localStorage.
   * @returns {number}
   */
  #readWishlistCount() {
    try {
      const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch (_) {
      return 0;
    }
  }

  /**
   * Updates the badge visibility and count.
   * @param {number} count
   */
  #updateBadge(count) {
    if (!this.refs.wishlistBubble || !this.refs.wishlistBubbleCount) return;

    this.refs.wishlistBubble.classList.toggle('visually-hidden', count === 0);
    this.refs.wishlistBubbleCount.classList.toggle('hidden', count === 0);
    this.refs.wishlistBubbleCount.textContent = count > 0 ? String(count) : '';
  }

  /**
   * Handles the pageshow event to re-sync badge on bfcache restore.
   * @param {PageTransitionEvent} event
   */
  #onPageShow = (event) => {
    if (event.persisted) {
      this.#updateBadge(this.#readWishlistCount());
    }
  };

  /**
   * Handles the wishlist:update event.
   * @param {CustomEvent} event
   */
  #onWishlistUpdate = (event) => {
    const count = event.detail?.count ?? this.#readWishlistCount();
    this.#updateBadge(count);
  };
}

if (!customElements.get('wishlist-icon')) {
  customElements.define('wishlist-icon', WishlistIcon);
}
