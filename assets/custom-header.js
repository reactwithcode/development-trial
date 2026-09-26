if (!customElements.get('custom-header')) {
  customElements.define('custom-header', class CustomHeader extends HTMLElement {
    #menuBtn = null;
    #drawer = null;
    #overlay = null;
    #closeBtn = null;
    #boundClose = null;
    #boundKeyDown = null;

    connectedCallback() {
      this.#menuBtn = this.querySelector('.custom-header__menu-btn');
      this.#drawer = this.querySelector('.custom-header__mobile-drawer');
      this.#overlay = this.querySelector('.custom-header__overlay');
      this.#closeBtn = this.querySelector('.custom-header__drawer-close');

      this.#boundClose = this.closeDrawer.bind(this);
      this.#boundKeyDown = this.#onKeyDown.bind(this);

      this.#menuBtn?.addEventListener('click', () => this.openDrawer());
      this.#overlay?.addEventListener('click', this.#boundClose);
      this.#closeBtn?.addEventListener('click', this.#boundClose);
    }

    disconnectedCallback() {
      this.#overlay?.removeEventListener('click', this.#boundClose);
      this.#closeBtn?.removeEventListener('click', this.#boundClose);
      document.removeEventListener('keydown', this.#boundKeyDown);
      document.body.style.overflow = '';
    }

    openDrawer() {
      this.#drawer?.setAttribute('aria-hidden', 'false');
      this.#overlay?.setAttribute('aria-hidden', 'false');
      this.#menuBtn?.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', this.#boundKeyDown);
      this.#closeBtn?.focus();
    }

    closeDrawer() {
      this.#drawer?.setAttribute('aria-hidden', 'true');
      this.#overlay?.setAttribute('aria-hidden', 'true');
      this.#menuBtn?.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      document.removeEventListener('keydown', this.#boundKeyDown);
      this.#menuBtn?.focus();
    }

    #onKeyDown(e) {
      if (e.key === 'Escape') this.closeDrawer();
    }
  });
}
