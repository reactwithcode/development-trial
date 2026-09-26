{
  // Gift details use visible property names ("To", "From", "Gift message") so they show at checkout,
  // on the order and in notifications. Only _parent_key stays private (underscore = hidden by Shopify).
  // Empty To/From are left out rather than shown blank.
  const buildGiftProperties = ({ propertyTo, propertyFrom, propertyMessage }, { to, from, message, parentKey }) => {
    const properties = {};
    if (to) properties[propertyTo] = to;
    if (from) properties[propertyFrom] = from;
    if (message) properties[propertyMessage] = message;
    properties._parent_key = parentKey;
    return properties;
  };

  // Shared by both components: updates the live "count / limit" next to a gift wrap field.
  const updateGiftWrapCounter = (input) => {
    const counter = input.closest('[data-gift-wrap-field]')?.querySelector('[data-gift-wrap-counter]');
    if (!counter) return;

    const count = input.value.length;
    const atLimit = count >= parseInt(input.getAttribute('maxlength'), 10);
    counter.querySelector('[data-gift-wrap-count]').textContent = count;
    counter.classList.toggle('tw-text-red-600', atLimit);
    counter.classList.toggle('tw-text-figma-muted', !atLimit);
  };

  if (!customElements.get('gift-wrap-pdp')) {
    customElements.define(
      'gift-wrap-pdp',
      class GiftWrapPdp extends HTMLElement {
        connectedCallback() {
          this.checkbox = this.querySelector('#gift-wrap-toggle');
          this.form = this.querySelector('#gift-wrap-form');
          this.toInput = this.querySelector('#gift-wrap-to');
          this.fromInput = this.querySelector('#gift-wrap-from');
          this.messageInput = this.querySelector('#gift-wrap-message');
          this.errorEl = this.querySelector('[data-gift-wrap-error]');
          this.giftWrapVariantId = null;
          this.isCleaningUp = false;

          this.handleCheckboxChange = this.handleCheckboxChange.bind(this);
          this.handleInput = this.handleInput.bind(this);
          this.handleFormSubmit = this.handleFormSubmit.bind(this);
          this.handleCartUpdate = this.handleCartUpdate.bind(this);

          this.checkbox.addEventListener('change', this.handleCheckboxChange);
          [this.toInput, this.fromInput, this.messageInput].forEach((el) => {
            el.addEventListener('input', this.handleInput);
          });

          this.productForm = document.querySelector('form[data-type="add-to-cart-form"]');
          if (this.productForm) {
            this.productForm.addEventListener('submit', this.handleFormSubmit);
          }

          this.unsubscribeCart = subscribe(PUB_SUB_EVENTS.cartUpdate, this.handleCartUpdate);

          if (this.dataset.productHandle) {
            this.fetchGiftWrapVariantId();
          }

          if (this.dataset.preChecked === 'true') {
            this.checkbox.checked = true;
            this.showForm(false);
          }
        }

        disconnectedCallback() {
          this.checkbox?.removeEventListener('change', this.handleCheckboxChange);
          [this.toInput, this.fromInput, this.messageInput].forEach((el) => {
            el?.removeEventListener('input', this.handleInput);
          });
          this.productForm?.removeEventListener('submit', this.handleFormSubmit);
          this.unsubscribeCart?.();
        }

        async fetchGiftWrapVariantId() {
          this.checkbox.disabled = true;
          try {
            const res = await fetch(`/products/${this.dataset.productHandle}.js`);
            if (!res.ok) throw new Error('Gift wrap product not found');
            const data = await res.json();
            this.giftWrapVariantId = data.variants[0].id;
            this.checkbox.disabled = false;
          } catch (e) {
            console.warn('[Gift Wrap] Could not load gift wrap product:', e.message);
            this.checkbox.disabled = true;
            const label = this.querySelector('[data-gift-wrap-toggle-label]');
            label.classList.add('tw-opacity-50', 'tw-cursor-not-allowed');
            label.classList.remove('tw-cursor-pointer');
            label.title = this.dataset.unavailableMessage;
          }
        }

        handleCheckboxChange() {
          if (this.checkbox.checked) {
            this.showForm(true);
          } else {
            this.hideForm();
          }
        }

        showForm(focusFirst = true) {
          this.form.removeAttribute('hidden');
          this.form.removeAttribute('aria-hidden');
          this.checkbox.setAttribute('aria-expanded', 'true');
          if (focusFirst) {
            setTimeout(() => this.toInput?.focus(), 50);
          }
        }

        hideForm() {
          this.form.setAttribute('hidden', '');
          this.form.setAttribute('aria-hidden', 'true');
          this.checkbox.setAttribute('aria-expanded', 'false');
        }

        handleInput(event) {
          updateGiftWrapCounter(event.target);
        }

        async handleFormSubmit(event) {
          if (!this.checkbox.checked) return;

          event.preventDefault();

          const message = this.messageInput.value.trim();
          if (!message) {
            this.errorEl.removeAttribute('hidden');
            this.messageInput.focus();
            return;
          }
          this.errorEl.setAttribute('hidden', '');

          const variantId = this.productForm.querySelector('[name="id"]')?.value;
          const qtyInput = this.productForm.querySelector('[name="quantity"]');
          const qty = qtyInput ? parseInt(qtyInput.value, 10) : 1;

          if (!variantId || !this.giftWrapVariantId) return;

          const submitBtn = this.productForm.querySelector('[type="submit"]');
          submitBtn?.setAttribute('disabled', '');

          try {
            const res1 = await fetch('/cart/add.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: [{ id: parseInt(variantId, 10), quantity: qty }] }),
            });

            if (!res1.ok) throw new Error('Failed to add product to cart');
            const data1 = await res1.json();
            const parentKey = data1.items[0].key;

            const res2 = await fetch('/cart/add.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: [
                  {
                    id: this.giftWrapVariantId,
                    quantity: 1,
                    properties: buildGiftProperties(this.dataset, {
                      to: this.toInput.value.trim(),
                      from: this.fromInput.value.trim(),
                      message,
                      parentKey,
                    }),
                  },
                ],
              }),
            });

            if (!res2.ok) throw new Error('Failed to add gift wrap to cart');

            const cartData = await fetch('/cart.js').then((r) => r.json());
            publish(PUB_SUB_EVENTS.cartUpdate, { source: 'gift-wrap', cartData });

            const cartDrawer = document.querySelector('cart-drawer');
            if (cartDrawer) cartDrawer.open();
          } catch (e) {
            console.error('[Gift Wrap]', e.message);
            this.showCartError(e.message);
          } finally {
            submitBtn?.removeAttribute('disabled');
          }
        }

        showCartError(message) {
          const errorWrapper = document.querySelector('.product-form__error-message-wrapper');
          const errorMsg = document.querySelector('.product-form__error-message');
          if (errorWrapper && errorMsg) {
            errorMsg.textContent = message || 'Something went wrong. Please try again.';
            errorWrapper.removeAttribute('hidden');
          }
        }

        async handleCartUpdate({ cartData }) {
          if (this.isCleaningUp) return;

          // product-form publishes the /cart/add.js response (the added line, not the cart), so only
          // trust cartData when it is a full cart.
          const cart = cartData?.items ? cartData : await fetch('/cart.js').then((r) => r.json());
          const isGiftWrapItem = (item) =>
            item.properties && '_parent_key' in item.properties;

          const mainItemKeys = new Set(
            cart.items.filter((item) => !isGiftWrapItem(item)).map((item) => item.key)
          );

          const orphans = cart.items.filter(
            (item) =>
              isGiftWrapItem(item) && !mainItemKeys.has(item.properties._parent_key)
          );

          if (!orphans.length) return;

          this.isCleaningUp = true;
          try {
            for (const orphan of orphans) {
              await fetch('/cart/change.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: orphan.key, quantity: 0 }),
              });
            }
            const updatedCart = await fetch('/cart.js').then((r) => r.json());
            publish(PUB_SUB_EVENTS.cartUpdate, {
              source: 'gift-wrap-cleanup',
              cartData: updatedCart,
            });
          } finally {
            this.isCleaningUp = false;
          }
        }
      }
    );
  }

  if (!customElements.get('gift-wrap-cart-item')) {
    customElements.define(
      'gift-wrap-cart-item',
      class GiftWrapCartItem extends HTMLElement {
        connectedCallback() {
          this.editBtn = this.querySelector('.gift-wrap-cart-item__edit-btn');
          this.cancelBtn = this.querySelector('.gift-wrap-cart-item__cancel-btn');
          this.updateBtn = this.querySelector('.gift-wrap-cart-item__update-btn');
          this.editForm = this.querySelector('.gift-wrap-cart-item__edit-form');
          this.summaryEl = this.querySelector('.gift-wrap-cart-item__summary');
          this.errorEl = this.querySelector('.gift-wrap-cart-item__error');
          this.toInput = this.querySelector('.gift-wrap-cart-item__to');
          this.fromInput = this.querySelector('.gift-wrap-cart-item__from');
          this.messageInput = this.querySelector('.gift-wrap-cart-item__message');

          this.handleEdit = this.handleEdit.bind(this);
          this.handleCancel = this.handleCancel.bind(this);
          this.handleUpdate = this.handleUpdate.bind(this);
          this.handleInput = this.handleInput.bind(this);
          this.handleChange = this.handleChange.bind(this);

          // Keep gift field edits away from the cart's quantity handler (see handleChange)
          this.addEventListener('change', this.handleChange);
          this.editBtn?.addEventListener('click', this.handleEdit);
          this.cancelBtn?.addEventListener('click', this.handleCancel);
          this.updateBtn?.addEventListener('click', this.handleUpdate);
          [this.toInput, this.fromInput, this.messageInput].forEach((el) => {
            el?.addEventListener('input', this.handleInput);
          });

          if (this.hasAttribute('data-legacy-properties')) this.migrateLegacyProperties();
        }

        // Carts from before the checkout fix hold _gift_* keys, which Shopify hides at checkout.
        // Re-save them once under the visible names; the refreshed drawer no longer carries the flag.
        async migrateLegacyProperties() {
          try {
            const res = await fetch('/cart/change.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: this.dataset.giftWrapKey,
                properties: buildGiftProperties(this.dataset, {
                  to: this.dataset.giftTo,
                  from: this.dataset.giftFrom,
                  message: this.dataset.giftMessage,
                  parentKey: this.dataset.parentKey,
                }),
              }),
            });
            if (!res.ok) throw new Error('Failed to migrate gift wrap properties');

            const cartData = await fetch('/cart.js').then((r) => r.json());
            publish(PUB_SUB_EVENTS.cartUpdate, { source: 'gift-wrap-migrate', cartData });
          } catch (e) {
            console.error('[Gift Wrap]', e.message);
          }
        }

        disconnectedCallback() {
          this.removeEventListener('change', this.handleChange);
          this.editBtn?.removeEventListener('click', this.handleEdit);
          this.cancelBtn?.removeEventListener('click', this.handleCancel);
          this.updateBtn?.removeEventListener('click', this.handleUpdate);
          [this.toInput, this.fromInput, this.messageInput].forEach((el) => {
            el?.removeEventListener('input', this.handleInput);
          });
        }

        handleEdit() {
          this.toggleEditing(true);
          this.toInput?.focus();
        }

        handleCancel() {
          this.resetFields();
          this.toggleEditing(false);
          this.editBtn.focus();
        }

        toggleEditing(isEditing) {
          this.editForm.toggleAttribute('hidden', !isEditing);
          this.editForm.setAttribute('aria-hidden', String(!isEditing));
          this.summaryEl.toggleAttribute('hidden', isEditing);
          this.editBtn.toggleAttribute('hidden', isEditing);
          this.cancelBtn.toggleAttribute('hidden', !isEditing);
          this.editBtn.setAttribute('aria-expanded', String(isEditing));
          this.errorEl?.setAttribute('hidden', '');
        }

        // Cancel discards edits, so restore the saved values and their counters.
        resetFields() {
          [
            [this.toInput, this.dataset.giftTo],
            [this.fromInput, this.dataset.giftFrom],
            [this.messageInput, this.dataset.giftMessage],
          ].forEach(([input, value]) => {
            if (!input) return;
            input.value = value || '';
            updateGiftWrapCounter(input);
          });
        }

        handleInput(event) {
          updateGiftWrapCounter(event.target);
        }

        // <cart-items> (cart.js) treats every bubbling `change` inside it as a quantity edit and
        // validates it — on a text field that yields "increments of undefined" and blocks input.
        // Gift details are saved via the Update button, so the cart never needs these events.
        handleChange(event) {
          event.stopPropagation();
        }

        async handleUpdate() {
          this.errorEl?.setAttribute('hidden', '');
          this.updateBtn.disabled = true;

          try {
            const res = await fetch('/cart/change.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: this.dataset.giftWrapKey,
                properties: buildGiftProperties(this.dataset, {
                  to: this.toInput?.value.trim(),
                  from: this.fromInput?.value.trim(),
                  message: this.messageInput?.value.trim(),
                  parentKey: this.dataset.parentKey,
                }),
              }),
            });

            if (!res.ok) throw new Error('Failed to update gift wrap');

            const cartData = await fetch('/cart.js').then((r) => r.json());
            publish(PUB_SUB_EVENTS.cartUpdate, { source: 'gift-wrap-update', cartData });
          } catch (e) {
            console.error('[Gift Wrap]', e.message);
            this.errorEl?.removeAttribute('hidden');
          } finally {
            this.updateBtn.disabled = false;
          }
        }
      }
    );
  }

  // Rendered by gift-wrap-orphan-cleanup.liquid only when a Gift Wrap line has lost its parent product,
  // so the customer is never charged for wrapping nothing. Works on the cart page and in the drawer.
  // Each key is tried once per page load: if Shopify refuses the removal, the re-rendered element must not retry forever.
  const attemptedOrphanKeys = new Set();

  if (!customElements.get('gift-wrap-orphan-cleanup')) {
    customElements.define(
      'gift-wrap-orphan-cleanup',
      class GiftWrapOrphanCleanup extends HTMLElement {
        connectedCallback() {
          const keys = (this.dataset.keys?.split(',') ?? []).filter((key) => key && !attemptedOrphanKeys.has(key));
          keys.forEach((key) => attemptedOrphanKeys.add(key));
          if (keys.length) this.removeOrphans(keys);
        }

        async removeOrphans(keys) {
          for (const key of keys) {
            try {
              // Another cleanup (e.g. the PDP's) may already have removed this line; a failed request is fine.
              await fetch('/cart/change.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: key, quantity: 0 }),
              });
            } catch (e) {
              console.warn('[Gift Wrap] Could not remove orphaned gift wrap:', e.message);
            }
          }

          try {
            const cartData = await fetch('/cart.js').then((r) => r.json());
            publish(PUB_SUB_EVENTS.cartUpdate, { source: 'gift-wrap-cleanup', cartData });
          } catch (e) {
            console.error('[Gift Wrap]', e.message);
          }
        }
      }
    );
  }
}
