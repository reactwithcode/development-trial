if (!customElements.get('cart-quantity-select')) {
  customElements.define(
    'cart-quantity-select',
    class CartQuantitySelect extends HTMLElement {
      connectedCallback() {
        this.select = this.querySelector('select');
        this.onChange = this.onChange.bind(this);
        this.select?.addEventListener('change', this.onChange);
      }

      disconnectedCallback() {
        this.select?.removeEventListener('change', this.onChange);
      }

      onChange(event) {
        // cart.js validates any bubbling change event against the target's min/max/step,
        // which a <select> doesn't have. Stop it here and hand the value to Dawn's input instead.
        event.stopPropagation();

        const input = document.getElementById(this.dataset.inputId);
        if (!input) return;

        input.value = this.select.value;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  );
}
