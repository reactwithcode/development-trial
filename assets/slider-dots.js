{
  const DOT_CLASS =
    'tw-relative tw-m-0 tw-h-1.5 tw-w-1.5 tw-cursor-pointer tw-rounded-full tw-border-0 tw-p-0 after:tw-absolute after:-tw-inset-2';
  const ACTIVE_CLASS = 'tw-bg-figma-ink';
  const INACTIVE_CLASS = 'tw-bg-figma-dot';

  if (!customElements.get('slider-dots')) {
    customElements.define(
      'slider-dots',
      class SliderDots extends HTMLElement {
        connectedCallback() {
          this.sliderComponent = this.closest('slider-component');
          this.slider = this.sliderComponent?.querySelector('[id^="Slider-"]');
          if (!this.slider) return;

          this.onSlideChanged = this.onSlideChanged.bind(this);
          this.onClick = this.onClick.bind(this);

          this.sliderComponent.addEventListener('slideChanged', this.onSlideChanged);
          this.addEventListener('click', this.onClick);

          // Visible slide count changes with viewport width and variant filtering, so rebuild on resize.
          this.resizeObserver = new ResizeObserver(() => this.render());
          this.resizeObserver.observe(this.slider);
        }

        disconnectedCallback() {
          this.sliderComponent?.removeEventListener('slideChanged', this.onSlideChanged);
          this.removeEventListener('click', this.onClick);
          this.resizeObserver?.disconnect();
        }

        get visibleSlides() {
          return [...this.slider.querySelectorAll('[id^="Slide-"]')].filter((slide) => slide.clientWidth > 0);
        }

        render() {
          const slides = this.visibleSlides;
          if (slides.length === this.children.length) return;

          const template = this.dataset.label ?? 'Slide [index]';
          this.replaceChildren(
            ...slides.map((slide, index) => {
              const dot = document.createElement('button');
              dot.type = 'button';
              dot.className = DOT_CLASS;
              dot.setAttribute('aria-label', template.replace('[index]', index + 1));
              dot.dataset.index = index;
              return dot;
            })
          );
          this.setActive(this.sliderComponent.currentPage ?? 1);
        }

        setActive(page) {
          [...this.children].forEach((dot, index) => {
            const isActive = index === page - 1;
            if (isActive) {
              dot.setAttribute('aria-current', 'true');
            } else {
              dot.removeAttribute('aria-current');
            }
            dot.classList.toggle(ACTIVE_CLASS, isActive);
            dot.classList.toggle(INACTIVE_CLASS, !isActive);
          });
        }

        onSlideChanged({ detail }) {
          this.setActive(detail.currentPage);
        }

        onClick(event) {
          const dot = event.target.closest('button[data-index]');
          if (!dot) return;
          const slide = this.visibleSlides[Number(dot.dataset.index)];
          if (slide) this.slider.scrollTo({ left: slide.offsetLeft - this.visibleSlides[0].offsetLeft });
        }
      }
    );
  }
}
