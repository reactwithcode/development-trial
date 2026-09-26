if (!customElements.get('free-shipping-bar')) {
  customElements.define(
    'free-shipping-bar',
    class FreeShippingBar extends HTMLElement {
      connectedCallback() {
        // Liquid renders everything in the store currency. Only rescale when the customer shops in another one.
        const activeCurrency = window.Shopify?.currency?.active;
        const rate = Number(window.Shopify?.currency?.rate ?? 1);
        if (!activeCurrency || activeCurrency === this.dataset.shopCurrency || rate === 1) return;

        const threshold = Math.round(Number(this.dataset.threshold) * rate);
        const total = Number(this.dataset.total);
        const remaining = Math.max(threshold - total, 0);
        const progress = threshold > 0 ? Math.min(Math.round((total / threshold) * 100), 100) : 100;

        const format = (cents) =>
          new Intl.NumberFormat(document.documentElement.lang || undefined, {
            style: 'currency',
            currency: activeCurrency,
          }).format(cents / 100);

        const template = remaining === 0 ? this.dataset.messageSuccess : this.dataset.messageRemaining;
        const message = this.querySelector('[data-free-shipping-message]');
        if (message && template) {
          message.textContent = template.replace('[amount]', format(remaining)).replace('[threshold]', format(threshold));
        }

        this.querySelector('[role="progressbar"]')?.setAttribute('aria-valuenow', progress);
        this.querySelector('.free-shipping-bar__fill')?.style.setProperty('--progress', `${progress}%`);
      }
    }
  );
}
