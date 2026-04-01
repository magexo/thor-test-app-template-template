import { Component } from '@theme/component';
import { throttle, prefersReducedMotion } from '@theme/utilities';

/**
 * A floating back-to-top button that appears after scrolling 500px.
 * Uses a throttled scroll event, fades in/out via CSS transition,
 * and smooth-scrolls to the top on click.
 *
 * @extends {Component}
 */
class BackToTopComponent extends Component {
  /** @type {AbortController} */
  #abortController = new AbortController();

  /** @type {ReturnType<typeof throttle> | null} */
  #throttledScroll = null;

  connectedCallback() {
    super.connectedCallback();

    const { signal } = this.#abortController;

    this.#throttledScroll = throttle(this.#onScroll.bind(this), 100);
    window.addEventListener('scroll', this.#throttledScroll, { signal, passive: true });

    this.refs.button?.addEventListener(
      'click',
      () => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'instant' : 'smooth' }),
      { signal }
    );

    // Set initial state without waiting for first scroll
    this.#onScroll();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#abortController.abort();
    this.#throttledScroll?.cancel();
  }

  #onScroll() {
    const isVisible = (window.scrollY || document.documentElement.scrollTop) > 500;
    this.toggleAttribute('visible', isVisible);
    this.setAttribute('aria-hidden', String(!isVisible));
  }
}

if (!customElements.get('back-to-top-component')) {
  customElements.define('back-to-top-component', BackToTopComponent);
}
