if (!customElements.get('collection-product-grid')) {
  customElements.define('collection-product-grid', class CollectionProductGrid extends HTMLElement {
    #filterBtn = null;
    #drawer = null;
    #overlay = null;
    #closeBtn = null;
    #sortSelect = null;
    #boundClose = null;
    #boundKeyDown = null;

    connectedCallback() {
      this.#filterBtn = this.querySelector('[data-cpg-filter-btn]');
      this.#drawer = this.querySelector('[data-cpg-drawer]');
      this.#overlay = this.querySelector('[data-cpg-overlay]');
      this.#closeBtn = this.querySelector('[data-cpg-close]');
      this.#sortSelect = this.querySelector('[data-cpg-sort]');

      this.#boundClose = this.#closeDrawer.bind(this);
      this.#boundKeyDown = this.#onKeyDown.bind(this);

      this.#filterBtn?.addEventListener('click', () => this.#openDrawer());
      this.#overlay?.addEventListener('click', this.#boundClose);
      this.#closeBtn?.addEventListener('click', this.#boundClose);
      this.#sortSelect?.addEventListener('change', this.#onSortChange.bind(this));

      this.querySelectorAll('[data-cpg-accordion-trigger]').forEach(btn => {
        btn.addEventListener('click', this.#onAccordionToggle.bind(this));
      });
    }

    disconnectedCallback() {
      this.#overlay?.removeEventListener('click', this.#boundClose);
      this.#closeBtn?.removeEventListener('click', this.#boundClose);
      document.removeEventListener('keydown', this.#boundKeyDown);
      document.body.style.overflow = '';
    }

    #openDrawer() {
      this.#drawer?.setAttribute('aria-hidden', 'false');
      this.#overlay?.setAttribute('aria-hidden', 'false');
      this.#filterBtn?.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', this.#boundKeyDown);
      this.#closeBtn?.focus();
    }

    #closeDrawer() {
      this.#drawer?.setAttribute('aria-hidden', 'true');
      this.#overlay?.setAttribute('aria-hidden', 'true');
      this.#filterBtn?.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      document.removeEventListener('keydown', this.#boundKeyDown);
      this.#filterBtn?.focus();
    }

    #onKeyDown(e) {
      if (e.key === 'Escape') this.#closeDrawer();
    }

    #onSortChange(e) {
      const url = new URL(window.location.href);
      url.searchParams.set('sort_by', e.target.value);
      window.location.href = url.toString();
    }

    #onAccordionToggle(e) {
      const btn = e.currentTarget;
      const isExpanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!isExpanded));
    }
  });
}
