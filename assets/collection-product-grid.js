if (!customElements.get('collection-product-grid')) {
  customElements.define('collection-product-grid', class CollectionProductGrid extends HTMLElement {
    #drawer = null;
    #overlay = null;
    #form = null;
    #abortController = null;
    #boundClick = null;
    #boundChange = null;
    #boundSubmit = null;
    #boundKeyDown = null;
    #boundPopState = null;

    connectedCallback() {
      // The drawer, overlay and form persist across updates — only their
      // [data-cpg-region] children are swapped, so these references stay valid.
      this.#drawer = this.querySelector('[data-cpg-drawer]');
      this.#overlay = this.querySelector('[data-cpg-overlay]');
      this.#form = this.querySelector('[data-cpg-form]');

      this.#boundClick = this.#onClick.bind(this);
      this.#boundChange = this.#onChange.bind(this);
      this.#boundSubmit = this.#onSubmit.bind(this);
      this.#boundKeyDown = this.#onKeyDown.bind(this);
      this.#boundPopState = this.#onPopState.bind(this);

      // Delegated listeners keep working after regions are re-rendered
      this.addEventListener('click', this.#boundClick);
      this.addEventListener('change', this.#boundChange);
      this.#form?.addEventListener('submit', this.#boundSubmit);
      window.addEventListener('popstate', this.#boundPopState);
    }

    disconnectedCallback() {
      this.removeEventListener('click', this.#boundClick);
      this.removeEventListener('change', this.#boundChange);
      this.#form?.removeEventListener('submit', this.#boundSubmit);
      window.removeEventListener('popstate', this.#boundPopState);
      document.removeEventListener('keydown', this.#boundKeyDown);
      this.#abortController?.abort();
      document.body.style.overflow = '';
    }

    get #filterBtn() {
      return this.querySelector('[data-cpg-filter-btn]');
    }

    // ── Drawer ──

    #openDrawer() {
      this.#drawer?.setAttribute('aria-hidden', 'false');
      this.#overlay?.setAttribute('aria-hidden', 'false');
      this.#filterBtn?.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', this.#boundKeyDown);
      this.querySelector('[data-cpg-close]')?.focus();
    }

    #closeDrawer() {
      this.#drawer?.setAttribute('aria-hidden', 'true');
      this.#overlay?.setAttribute('aria-hidden', 'true');
      this.#filterBtn?.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      document.removeEventListener('keydown', this.#boundKeyDown);
      this.#filterBtn?.focus();
    }

    #isDrawerOpen() {
      return this.#drawer?.getAttribute('aria-hidden') === 'false';
    }

    #onKeyDown(e) {
      if (e.key === 'Escape') this.#closeDrawer();
    }

    // ── Events ──

    #onClick(e) {
      if (e.target.closest('[data-cpg-filter-btn]')) {
        this.#openDrawer();
        return;
      }
      if (e.target.closest('[data-cpg-close]') || e.target.closest('[data-cpg-overlay]')) {
        this.#closeDrawer();
        return;
      }

      const trigger = e.target.closest('[data-cpg-accordion-trigger]');
      if (trigger) {
        const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
        trigger.setAttribute('aria-expanded', String(!isExpanded));
        return;
      }

      // Filter chips, "Clear all" and Reset update in place instead of navigating
      const link = e.target.closest('a[data-cpg-link]');
      if (link) {
        e.preventDefault();
        this.#renderUrl(new URL(link.href, window.location.origin));
      }
    }

    #onChange(e) {
      // Apply as soon as an option is picked. Price fields wait for Enter /
      // the "View products" button so tabbing between them doesn't re-render.
      if (e.target.matches('.cpg__filter-input')) {
        this.#renderUrl(this.#urlFromForm());
        return;
      }

      if (e.target.matches('[data-cpg-sort]')) {
        const sortInput = this.querySelector('[data-cpg-sort-input]');
        if (sortInput) sortInput.value = e.target.value;
        this.#renderUrl(this.#urlFromForm());
      }
    }

    // "View products" button or Enter in a price field: apply, then show results
    async #onSubmit(e) {
      e.preventDefault();
      await this.#renderUrl(this.#urlFromForm());
      this.#closeDrawer();
    }

    #onPopState() {
      this.#renderUrl(new URL(window.location.href), { updateHistory: false });
    }

    // ── Rendering ──

    #urlFromForm() {
      const url = new URL(this.#form.action, window.location.origin);
      const formData = new FormData(this.#form);
      for (const [key, value] of formData.entries()) {
        // Skip empty fields (e.g. unused price inputs) to keep the URL clean
        if (value !== '') url.searchParams.append(key, value);
      }
      return url;
    }

    async #renderUrl(url, { updateHistory = true } = {}) {
      this.#abortController?.abort();
      this.#abortController = new AbortController();

      const fetchUrl = new URL(url);
      fetchUrl.searchParams.set('section_id', this.dataset.sectionId);

      this.classList.add('is-loading');
      this.setAttribute('aria-busy', 'true');

      try {
        const response = await fetch(fetchUrl, { signal: this.#abortController.signal });
        if (!response.ok) throw new Error(`Section render failed: ${response.status}`);

        const html = await response.text();
        const newDoc = new DOMParser().parseFromString(html, 'text/html');
        // A redirect (e.g. storefront password page) returns HTML without our regions
        if (!newDoc.querySelector('[data-cpg-region="results"]')) {
          throw new Error('Section render returned unexpected markup');
        }
        this.#swapRegions(newDoc);

        if (updateHistory) window.history.pushState({}, '', url);
        document.dispatchEvent(new CustomEvent('collection:filters-updated', { detail: { url: url.toString() } }));
      } catch (err) {
        if (err.name === 'AbortError') return;
        // Fall back to a normal page load so the shopper still gets their results
        window.location.href = url.toString();
      } finally {
        this.classList.remove('is-loading');
        this.removeAttribute('aria-busy');
      }
    }

    #swapRegions(newDoc) {
      const drawerWasOpen = this.#isDrawerOpen();
      const expandedPanels = new Map(
        [...this.querySelectorAll('[data-cpg-accordion-trigger]')].map((btn) => [
          btn.getAttribute('aria-controls'),
          btn.getAttribute('aria-expanded'),
        ])
      );
      const focused = document.activeElement;
      const focusedInput = this.contains(focused) && focused.matches('input') ? focused : null;
      const bodyScroll = this.querySelector('[data-cpg-region="drawer-body"]')?.scrollTop ?? 0;

      this.querySelectorAll('[data-cpg-region]').forEach((region) => {
        const replacement = newDoc.querySelector(`[data-cpg-region="${region.dataset.cpgRegion}"]`);
        if (replacement) region.replaceWith(replacement);
      });

      // Keep the shopper's own open/closed choices for each filter group
      this.querySelectorAll('[data-cpg-accordion-trigger]').forEach((btn) => {
        const previous = expandedPanels.get(btn.getAttribute('aria-controls'));
        if (previous) btn.setAttribute('aria-expanded', previous);
      });

      const drawerBody = this.querySelector('[data-cpg-region="drawer-body"]');
      if (drawerBody) drawerBody.scrollTop = bodyScroll;

      if (drawerWasOpen) this.#filterBtn?.setAttribute('aria-expanded', 'true');

      // The hidden sort field lives outside the swapped regions — keep it in step
      const sortSelect = this.querySelector('[data-cpg-sort]');
      const sortInput = this.querySelector('[data-cpg-sort-input]');
      if (sortSelect && sortInput) sortInput.value = sortSelect.value;

      // Return focus to the option the shopper just used
      if (focusedInput) {
        const selector = `input[name="${CSS.escape(focusedInput.name)}"]${
          focusedInput.value ? `[value="${CSS.escape(focusedInput.value)}"]` : ''
        }`;
        this.querySelector(selector)?.focus();
      }
    }
  });
}
