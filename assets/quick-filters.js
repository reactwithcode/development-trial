if (!customElements.get('quick-filters')) {
  customElements.define('quick-filters', class QuickFilters extends HTMLElement {
    #filterParam = '';
    #list = null;
    #wrapper = null;
    #scrollBtn = null;
    #boundOnScroll = null;

    connectedCallback() {
      this.#filterParam = this.dataset.filterParam || 'filter.p.product_type';
      this.#list = this.querySelector('.quick-filters__list');
      this.#wrapper = this.querySelector('.quick-filters__track-wrapper');
      this.#scrollBtn = this.querySelector('.quick-filters__scroll-btn');

      this.#boundOnScroll = this.#onScroll.bind(this);

      this.#list?.addEventListener('click', this.#onBtnClick.bind(this));
      this.#scrollBtn?.addEventListener('click', this.#onScrollBtnClick.bind(this));
      this.#list?.addEventListener('scroll', this.#boundOnScroll, { passive: true });
      this.#onScroll();
    }

    disconnectedCallback() {
      this.#list?.removeEventListener('scroll', this.#boundOnScroll);
    }

    #onBtnClick(e) {
      const btn = e.target.closest('[data-filter-value]');
      if (!btn) return;
      const value = btn.dataset.filterValue;
      const isActive = btn.dataset.active === 'true';
      const url = new URL(window.location.href);
      url.searchParams.delete(this.#filterParam);
      if (value !== '' && !isActive) url.searchParams.set(this.#filterParam, value);
      window.location.href = url.toString();
    }

    #onScrollBtnClick() {
      this.#list?.scrollBy({ left: 200, behavior: 'smooth' });
    }

    #onScroll() {
      if (!this.#list || !this.#wrapper) return;
      const { scrollLeft, scrollWidth, clientWidth } = this.#list;
      this.#wrapper.classList.toggle('is-at-end', scrollLeft + clientWidth >= scrollWidth - 4);
    }
  });
}
