{
  // Survives the drawer re-rendering its whole .drawer__inner on every quantity change,
  // so recommendations don't flicker or refetch. Keyed by product id.
  const cache = new Map();

  if (!customElements.get('cart-recommendations')) {
    customElements.define(
      'cart-recommendations',
      class CartRecommendations extends HTMLElement {
        connectedCallback() {
          this.list = this.querySelector('[data-cart-recommendations-list]');
          this.previousButton = this.querySelector('[data-direction="previous"]');
          this.nextButton = this.querySelector('[data-direction="next"]');

          this.onArrowClick = this.onArrowClick.bind(this);
          this.onAddClick = this.onAddClick.bind(this);
          this.updateArrows = this.updateArrows.bind(this);

          this.previousButton?.addEventListener('click', this.onArrowClick);
          this.nextButton?.addEventListener('click', this.onArrowClick);
          this.list?.addEventListener('click', this.onAddClick);

          this.load();
        }

        disconnectedCallback() {
          this.previousButton?.removeEventListener('click', this.onArrowClick);
          this.nextButton?.removeEventListener('click', this.onArrowClick);
          this.list?.removeEventListener('click', this.onAddClick);
          this.track?.removeEventListener('scroll', this.updateArrows);
        }

        async load() {
          const { productId } = this.dataset;
          if (!productId || !this.list) return;

          try {
            if (!cache.has(productId)) {
              let html = await this.fetchRecommendations('complementary');
              if (!this.countIn(html)) html = await this.fetchRecommendations('related');
              cache.set(productId, html);
            }
            this.render(cache.get(productId));
          } catch (error) {
            console.error('[Cart recommendations]', error);
            this.hidden = true;
          }
        }

        async fetchRecommendations(intent) {
          const url = `${this.dataset.url}?product_id=${this.dataset.productId}&limit=6&intent=${intent}&section_id=${this.dataset.sectionId}`;
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Recommendations request failed (${response.status})`);
          return response.text();
        }

        countIn(html) {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          return Number(doc.querySelector('[data-cart-recommendations-count]')?.dataset.cartRecommendationsCount ?? 0);
        }

        render(html) {
          if (!this.countIn(html)) {
            this.hidden = true;
            return;
          }

          const doc = new DOMParser().parseFromString(html, 'text/html');
          const track = doc.querySelector('[data-cart-recommendations-track]');
          this.list.replaceChildren(track);
          this.track = this.list.querySelector('[data-cart-recommendations-track]');
          this.track.addEventListener('scroll', this.updateArrows, { passive: true });
          this.hidden = false;
          this.updateArrows();
        }

        onArrowClick(event) {
          if (!this.track) return;
          const direction = event.currentTarget.dataset.direction === 'next' ? 1 : -1;
          this.track.scrollBy({ left: direction * this.track.clientWidth });
        }

        updateArrows() {
          if (!this.track) return;
          const { scrollLeft, scrollWidth, clientWidth } = this.track;
          if (this.previousButton) this.previousButton.disabled = scrollLeft <= 1;
          if (this.nextButton) this.nextButton.disabled = scrollLeft + clientWidth >= scrollWidth - 1;
        }

        async onAddClick(event) {
          const button = event.target.closest('button[data-variant-id]');
          if (!button) return;

          const cartDrawer = this.closest('cart-drawer');
          button.disabled = true;

          try {
            const response = await fetch(`${routes.cart_add_url}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify({
                items: [{ id: Number(button.dataset.variantId), quantity: 1 }],
                sections: cartDrawer?.getSectionsToRender().map((section) => section.id),
                sections_url: window.location.pathname,
              }),
            });
            const state = await response.json();
            if (!response.ok || state.status) throw new Error(state.description || state.message);

            // The newly added product changes what "You may also like" should show.
            cache.clear();
            cartDrawer?.renderContents(state);
            publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-recommendations', cartData: state });
          } catch (error) {
            console.error('[Cart recommendations]', error);
            button.disabled = false;
          }
        }
      }
    );
  }
}
