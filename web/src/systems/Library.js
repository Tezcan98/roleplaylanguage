import * as THREE from 'three';

/**
 * The open library: take a book from Aslan Bey's shelf (one at a time), carry it — it is in
 * your hand — and read it wherever you sit (a bench, a tea-garden chair, the library's own
 * seats). Put it back on the shelf when you are done. Finishing a book the first time earns
 * a credit and its words go into the notebook. Interaction provider + effect `library`.
 */
export class Library {
  #mesh = null;

  constructor({ books, state, player, choice, reader, toasts, vocab, wallet, world }) {
    Object.assign(this, { books, state, player, choice, reader, toasts, vocab, wallet, world });
    this.#show();
  }

  get held() { return this.books.find((b) => b.id === this.state.heldBook) ?? null; }

  /** At the shelf: take a book, or put the one you have back. */
  async atShelf() {
    const held = this.held;
    if (held) {
      this.state.heldBook = null;
      this.#show();
      this.toasts.show(`“${held.title}” rafa geri kondu`, 'Book returned to the shelf');
      return;
    }
    const id = await this.choice.pick({
      title: 'Hangi kitabı alayım?', en: 'Which book shall I take? Then sit on a bench and read.',
      options: this.books.map((b) => ({ value: b.id, label: `${this.state.flags?.[`read-${b.id}`] ? '✓ ' : ''}${b.title} · ${b.author}`, en: b.en })),
    });
    if (!id) return;
    this.state.heldBook = id;
    this.#show();
    this.toasts.show(`“${this.held.title}” elinde. Bir banka otur ve oku!`, 'The book is in your hand. Sit on a bench and read!');
  }

  /** Interaction provider: sitting with a book in hand → read it. */
  find() {
    const b = this.held;
    if (!b || !this.player.seated || this.reader.isOpen) return null;
    return { label: `📖 ${b.title} oku`, dist: 0, priority: 4, run: () => this.reader.open(b, this.state.bookPage?.[b.id] ?? 0) };
  }

  /** Where you stopped (opened there next time). */
  closed(book, page) { this.state.bookPage = { ...(this.state.bookPage ?? {}), [book.id]: page }; }

  finished(book) {
    this.state.bookPage = { ...(this.state.bookPage ?? {}), [book.id]: 0 };
    book.words.forEach(([tr, en]) => this.vocab.learn(tr, en));
    const flags = (this.state.flags ??= {});
    if (flags[`read-${book.id}`]) { this.toasts.show(`“${book.title}” bitti`, 'You finished the book'); return; }
    flags[`read-${book.id}`] = true;
    this.wallet?.add(1, 'reward');
    this.toasts.show(`“${book.title}” bitti! +1 kredi`, 'You finished the book! +1 credit');
  }

  /** The book in the player's hand (a small coloured block). */
  #show() {
    const b = this.held;
    if (this.#mesh) { this.#mesh.removeFromParent(); this.#mesh = null; }
    if (!b) return;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.06), new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.8 }));
    m.position.set(0.24, 0.85, 0.18);
    m.rotation.set(-0.3, 0, 0.15);
    this.player.group.add(m);
    this.#mesh = m;
  }
}
