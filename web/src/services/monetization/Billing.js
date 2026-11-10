import { CONFIG } from '../../config/remote.js';
/**
 * Credit packs sold through Google Play (in the Android app only). The products are created
 * in Play Console with these ids as one-time "consumable" products; their price is set there
 * (the listed TL prices are only shown until Play answers with the real, local price).
 */
export const PACKS = [
  { id: 'credits_50', credits: 50, price: '6,99 TL' },
  { id: 'credits_100', credits: 100, price: '10,99 TL' },
  { id: 'credits_200', credits: 200, price: '19,99 TL' },
];

/**
 * Credit packs for sale (config.json "sellPacks", turned on from the server once the Play Console
 * products — credits_50, credits_100, credits_200 — are live; off: no packs in the shop).
 */
export const SELL_PACKS = CONFIG.sellPacks;

/** On the website: packs can't be bought here. */
export class NoBilling {
  get available() { return false; }
  async prices() { return {}; }
  async buy() { return false; }
}

/** Google Play Billing through @capgo/native-purchases. */
export class PlayBilling {
  constructor(NativePurchases, PURCHASE_TYPE) { Object.assign(this, { NativePurchases, PURCHASE_TYPE }); }
  get available() { return true; }
  /** Set by main.js: told about every completed purchase (the server mails the operator). */
  onPurchase = null;

  /** Local prices from Play: { id: '₺14,99' }. */
  async prices() {
    try {
      const { products } = await this.NativePurchases.getProducts({ productIdentifiers: PACKS.map((p) => p.id), productType: this.PURCHASE_TYPE.INAPP });
      return Object.fromEntries(products.map((p) => [p.identifier, p.priceString]));
    } catch (e) { console.warn('[billing] products', e); return {}; }
  }

  /** Buy a pack; resolves true once Play has charged it (the purchase is consumed, so it can be bought again). */
  async buy(pack) {
    try {
      const t = await this.NativePurchases.purchaseProduct({ productIdentifier: pack.id, productType: this.PURCHASE_TYPE.INAPP, quantity: 1, isConsumable: true });
      const ok = !!t?.transactionId || !!t?.purchaseToken;
      if (ok) try { this.onPurchase?.(pack, t.transactionId ?? ''); } catch { /* only a notice */ }
      return ok;
    } catch (e) { console.warn('[billing] purchase', e); return false; }
  }
}
