const adoptedStyleSheets = new WeakMap<Document | ShadowRoot, CSSStyleSheet[]>();

function installAdoptedStyleSheets(
  prototype: typeof Document.prototype | typeof ShadowRoot.prototype,
): void {
  if ('adoptedStyleSheets' in prototype) {
    return;
  }

  Object.defineProperty(prototype, 'adoptedStyleSheets', {
    configurable: true,
    get(this: Document | ShadowRoot): CSSStyleSheet[] {
      let styles = adoptedStyleSheets.get(this);

      if (styles === undefined) {
        styles = [];
        adoptedStyleSheets.set(this, styles);
      }

      return styles;
    },
    set(this: Document | ShadowRoot, styles: CSSStyleSheet[]) {
      adoptedStyleSheets.set(this, [...styles]);
    },
  });
}

installAdoptedStyleSheets(Document.prototype);
installAdoptedStyleSheets(ShadowRoot.prototype);

if (!('replaceSync' in CSSStyleSheet.prototype)) {
  Object.defineProperty(CSSStyleSheet.prototype, 'replaceSync', {
    configurable: true,
    value: () => undefined,
  });
}
