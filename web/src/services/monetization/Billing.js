/**
 * Credit packs sold through Google Play (in the Android app only). The products are created
 * in Play Console with these ids as one-time "consumable" products; their price is set there
 * (the listed TL prices are only shown until Play answers with the real, local price).
 */
export const PACKS = [
  { id: 'credits_50', credits: 50, price: '14,90 TL' },
  { id: 'credits_200', credits: 200, price: '24,90 TL' },
  { id: 'credits_500', credits: 500, price: '48,90 TL' },
];

/**
 * TEST: every pack "bought" at once, without Google Play (web and app alike), until the Play
 * Console products are live. Set to false before the release.
 */
export const TEST_PURCHASES = true;

/** Test payments: always succeed (see TEST_PURCHASES). */
export class TestBilling {
  get available() { return true; }
  async prices() { return {}; }
  async buy() { await new Promise((r) => setTimeout(r, 500)); return true; }
}

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
      return !!t?.transactionId || !!t?.purchaseToken;
    } catch (e) { console.warn('[billing] purchase', e); return false; }
  }
}
