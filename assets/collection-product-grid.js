if (!customElements.get('collection-product-grid')) {
  customElements.define('collection-product-grid', class CollectionProductGrid extends HTMLElement {
    #filterBtn = null;
    #drawer = null;
    #overlay = null;
    #closeBtn = null;
    #sortSelect = null;
    #form = null;
    #boundClose = null;
    #boundKeyDown = null;
    #boundFilterChange = null;
    #boundFormData = null;

    // Set before a filter reload so the drawer reopens on the next page load
    static REOPEN_KEY = 'cpg:reopen-drawer';

    connectedCallback() {
      this.#filterBtn = this.querySelector('[data-cpg-filter-btn]');
      this.#drawer = this.querySelector('[data-cpg-drawer]');
      this.#overlay = this.querySelector('[data-cpg-overlay]');
      this.#closeBtn = this.querySelector('[data-cpg-close]');
      this.#sortSelect = this.querySelector('[data-cpg-sort]');
      this.#form = this.querySelector('[data-cpg-form]');

      this.#boundClose = this.#closeDrawer.bind(this);
      this.#boundKeyDown = this.#onKeyDown.bind(this);
      this.#boundFilterChange = this.#onFilterChange.bind(this);
      this.#boundFormData = this.#onFormData.bind(this);

      this.#filterBtn?.addEventListener('click', () => this.#openDrawer());
      this.#overlay?.addEventListener('click', this.#boundClose);
      this.#closeBtn?.addEventListener('click', this.#boundClose);
      this.#sortSelect?.addEventListener('change', this.#onSortChange.bind(this));
      this.#form?.addEventListener('change', this.#boundFilterChange);
      this.#form?.addEventListener('formdata', this.#boundFormData);

      this.querySelectorAll('[data-cpg-accordion-trigger]').forEach(btn => {
        btn.addEventListener('click', this.#onAccordionToggle.bind(this));
      });

      this.#reopenAfterFilter();
    }

    disconnectedCallback() {
      this.#overlay?.removeEventListener('click', this.#boundClose);
      this.#closeBtn?.removeEventListener('click', this.#boundClose);
      this.#form?.removeEventListener('change', this.#boundFilterChange);
      this.#form?.removeEventListener('formdata', this.#boundFormData);
      document.removeEventListener('keydown', this.#boundKeyDown);
      document.body.style.overflow = '';
    }

    #openDrawer(focusTarget = this.#closeBtn) {
      this.#drawer?.setAttribute('aria-hidden', 'false');
      this.#overlay?.setAttribute('aria-hidden', 'false');
      this.#filterBtn?.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', this.#boundKeyDown);
      focusTarget?.focus();
    }

    #closeDrawer() {
      this.#drawer?.setAttribute('aria-hidden', 'true');
      this.#overlay?.setAttribute('aria-hidden', 'true');
      this.#filterBtn?.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      document.removeEventListener('keydown', this.#boundKeyDown);
      this.#filterBtn?.focus();
    }

    // Apply a filter as soon as an option is picked. Price fields are left to
    // Enter / the "View products" button so tabbing between them doesn't reload.
    #onFilterChange(e) {
      if (!e.target.matches('.cpg__filter-input')) return;
      try {
        sessionStorage.setItem(CollectionProductGrid.REOPEN_KEY, '1');
      } catch (err) {
        // Storage unavailable — the filter still applies, the drawer just stays closed
      }
      this.#form.requestSubmit();
    }

    // Drop empty fields (e.g. unused price inputs) to keep the filter URL clean
    #onFormData(e) {
      for (const [key, value] of [...e.formData.entries()]) {
        if (value === '') e.formData.delete(key);
      }
    }

    #reopenAfterFilter() {
      let shouldReopen = false;
      try {
        shouldReopen = sessionStorage.getItem(CollectionProductGrid.REOPEN_KEY) === '1';
        sessionStorage.removeItem(CollectionProductGrid.REOPEN_KEY);
      } catch (err) {
        return;
      }
      if (!shouldReopen || !this.#drawer) return;

      // Open without the slide-in so the reload feels like the drawer never closed
      this.#drawer.classList.add('cpg__drawer--instant');
      this.#overlay?.classList.add('cpg__overlay--instant');
      // Focus the dialog itself — focusing the close button here would show its focus ring
      this.#openDrawer(this.#drawer);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.#drawer?.classList.remove('cpg__drawer--instant');
          this.#overlay?.classList.remove('cpg__overlay--instant');
        });
      });
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
