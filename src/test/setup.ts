import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// ResizeObserver polyfill — jsdom ne implementira ga, a Radix primitives
// (Dialog, Sheet, Slider) ga koriste preko @radix-ui/react-use-size za layout
// measurements. Bez ovog polyfill-a, RTL render Radix-based komponenti baca
// "ResizeObserver is not defined".
if (typeof window !== "undefined" && typeof window.ResizeObserver === "undefined") {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).ResizeObserver = ResizeObserverMock;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).ResizeObserver = ResizeObserverMock;
}

// PointerEvent polyfill — jsdom delimično implementira PointerEvent ali
// Radix Slider koristi hasPointerCapture koji nije u jsdom-u. Dodaj stub
// kako bi test-ovi koji renderuju Slider prošli bez pucanja.
if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proto = (window as any).Element?.prototype;
  if (proto && !proto.hasPointerCapture) {
    proto.hasPointerCapture = () => false;
  }
  if (proto && !proto.setPointerCapture) {
    proto.setPointerCapture = () => {};
  }
  if (proto && !proto.releasePointerCapture) {
    proto.releasePointerCapture = () => {};
  }
  if (proto && !proto.scrollIntoView) {
    proto.scrollIntoView = () => {};
  }
}
