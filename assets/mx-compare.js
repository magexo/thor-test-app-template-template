const STORAGE_KEY = 'mx-compare-products';
const EVENT_UPDATE = 'mx:compare:update';

export class MxCompare {
  static #maxProducts = 4;

  static setMax(n) {
    MxCompare.#maxProducts = Math.max(2, Math.min(4, n));
  }

  static getMax() {
    return MxCompare.#maxProducts;
  }

  static getProducts() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  static hasProduct(handle) {
    return MxCompare.getProducts().includes(handle);
  }

  static isFull() {
    return MxCompare.getProducts().length >= MxCompare.#maxProducts;
  }

  static addProduct(handle) {
    if (MxCompare.hasProduct(handle) || MxCompare.isFull()) return false;
    const products = MxCompare.getProducts();
    products.push(handle);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    MxCompare.#dispatch();
    return true;
  }

  static removeProduct(handle) {
    const products = MxCompare.getProducts().filter((h) => h !== handle);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    MxCompare.#dispatch();
  }

  static clearProducts() {
    sessionStorage.removeItem(STORAGE_KEY);
    MxCompare.#dispatch();
  }

  static #dispatch() {
    document.dispatchEvent(
      new CustomEvent(EVENT_UPDATE, { detail: { products: MxCompare.getProducts() } })
    );
  }
}
