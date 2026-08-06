import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { mock } from "node:test";

// 1. Setup Mock React Hooks
let refIndex = 0;
const refStore = [];
let registeredEffects = [];

function mockUseRef(initialValue) {
  const index = refIndex++;
  if (refStore[index] === undefined) {
    refStore[index] = { current: initialValue };
  }
  return refStore[index];
}

function mockUseCallback(fn) {
  return fn;
}

function mockUseEffect(fn, deps) {
  registeredEffects.push({ fn, deps });
}

// Intercept 'react' import before importing the hook
mock.module("react", {
  namedExports: {
    useRef: mockUseRef,
    useCallback: mockUseCallback,
    useEffect: mockUseEffect,
  },
});

// Import the hook to test
const { usePortfolioNavigation } = await import("../components/usePortfolioNavigation.ts");

// 2. Setup Mock DOM Classes & globals
class MockElement {
  constructor(tagName = "div", attrs = {}) {
    this.tagName = tagName;
    this.attrs = { ...attrs };
    this.listeners = {};
    this.style = {
      properties: {},
      setProperty(key, val) {
        this.properties[key] = val;
      }
    };
    this.children = [];
    this.parentElement = null;
    this.textContent = "";
    this.hidden = false;
    this.inert = false;
    this.classList = {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      toggle(c, force) {
        if (force === undefined) {
          if (this.classes.has(c)) this.classes.delete(c);
          else this.classes.add(c);
        } else if (force) {
          this.classes.add(c);
        } else {
          this.classes.delete(c);
        }
      },
      contains(c) {
        return this.classes.has(c);
      }
    };
  }

  get dataset() {
    return this.attrs;
  }

  get clientHeight() {
    return 1000;
  }

  get offsetHeight() {
    return 100;
  }

  setAttribute(name, val) {
    this.attrs[name] = String(val);
  }

  removeAttribute(name) {
    delete this.attrs[name];
  }

  getAttribute(name) {
    return this.attrs[name];
  }

  addEventListener(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  removeEventListener(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  dispatchEvent(event) {
    const eventType = event.type || event;
    const callbacks = this.listeners[eventType] || [];
    for (const cb of callbacks) {
      cb(event);
    }
  }

  querySelector(selector) {
    if (selector === "[data-progress-bar]") {
      const el = new MockElement("div");
      const parent = new MockElement("div");
      el.parentElement = parent;
      return el;
    }
    if (selector === "[data-active-label]" ||
        selector === "[data-live-scene-label]" ||
        selector === "[data-scene-counter]" ||
        selector === "[data-scroll-cue]" ||
        selector === "[data-media-marquee]") {
      return new MockElement("div");
    }
    return null;
  }

  querySelectorAll(selector) {
    if (selector === "[data-scene]") {
      return [
        new MockElement("div", { label: "Home" }),
        new MockElement("div", { label: "Projectes" }),
        new MockElement("div", { label: "Túnel" }),
        new MockElement("div", { label: "Contacte" }),
      ];
    }
    if (selector === "[data-go]") {
      return [
        new MockElement("button", { go: "0" }),
        new MockElement("button", { go: "1" }),
        new MockElement("button", { go: "2" }),
        new MockElement("button", { go: "3" }),
      ];
    }
    return [];
  }
}

// Set up globals
let timers = [];
globalThis.window = {
  listeners: {},
  addEventListener(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  },
  removeEventListener(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  },
  dispatchEvent(event) {
    const callbacks = this.listeners[event.type || event] || [];
    for (const cb of callbacks) cb(event);
  },
  setTimeout(fn, ms) {
    const timer = { fn, ms, active: true };
    timers.push(timer);
    return timer;
  },
  clearTimeout(timer) {
    if (timer) timer.active = false;
  }
};

let isModalOpenValue = false;
globalThis.document = {
  body: {
    classList: {
      contains(name) {
        if (name === "modal-open") return isModalOpenValue;
        return false;
      }
    }
  }
};

globalThis.CustomEvent = class CustomEvent {
  constructor(type, options) {
    this.type = type;
    this.detail = options?.detail;
  }
};

describe("usePortfolioNavigation", () => {
  let rootElement;
  let rootRef;
  let sceneCount;
  let closeMenuCalled;
  let closeMenu;
  let cleanupFn;

  beforeEach(() => {
    // Reset test state
    refIndex = 0;
    refStore.length = 0;
    registeredEffects = [];
    timers = [];
    isModalOpenValue = false;

    rootElement = new MockElement("div");
    rootRef = { current: rootElement };
    sceneCount = 4;
    closeMenuCalled = false;
    closeMenu = () => {
      closeMenuCalled = true;
    };

    // Invoke the hook (which registers mock effects)
    usePortfolioNavigation(rootRef, sceneCount, closeMenu);

    // Run registered mount effects
    cleanupFn = undefined;
    for (const effect of registeredEffects) {
      const cleanup = effect.fn();
      if (typeof cleanup === "function") {
        cleanupFn = cleanup;
      }
    }
  });

  it("should initialize by rendering scene 0", () => {
    // Assert initialization settings
    assert.equal(rootElement.style.properties["--progress"], "0");
    assert.equal(closeMenuCalled, true);
  });

  it("should process WheelEvent and advance scene", () => {
    // We start at active = 0, deltaY > 0 should advance to active = 1
    closeMenuCalled = false;
    let prevented = false;
    const event = {
      type: "wheel",
      deltaY: 50,
      preventDefault() {
        prevented = true;
      }
    };

    rootElement.dispatchEvent(event);

    assert.equal(prevented, true);
    // After advancing to 1, progress should be 1 / 3
    assert.equal(rootElement.style.properties["--progress"], String(1 / 3));
    assert.equal(closeMenuCalled, true);
  });

  it("should lock wheel event triggers during block lock period", () => {
    // Trigger wheel to active = 1
    rootElement.dispatchEvent({
      type: "wheel",
      deltaY: 50,
      preventDefault() {}
    });

    const initialProgress = rootElement.style.properties["--progress"];

    // Send another wheel event immediately (wheel should be locked)
    rootElement.dispatchEvent({
      type: "wheel",
      deltaY: 50,
      preventDefault() {}
    });

    // Progress should remain same because wheel is locked
    assert.equal(rootElement.style.properties["--progress"], initialProgress);

    // Speed up/tick timers to unlock wheel (WHEEL_LOCK_MS = 560)
    for (const timer of timers) {
      if (timer.active) {
        timer.fn(); // manual trigger
      }
    }

    // Send wheel event again, now it should advance to active = 2
    rootElement.dispatchEvent({
      type: "wheel",
      deltaY: 50,
      preventDefault() {}
    });

    assert.equal(rootElement.style.properties["--progress"], String(2 / 3));
  });

  it("should handle keydown navigation", () => {
    // Press key ArrowDown to go to scene 1
    let prevented = false;
    globalThis.window.dispatchEvent({
      type: "keydown",
      key: "ArrowDown",
      preventDefault() {
        prevented = true;
      }
    });

    assert.equal(prevented, true);
    assert.equal(rootElement.style.properties["--progress"], String(1 / 3));

    // Press End to go to scene 3
    globalThis.window.dispatchEvent({
      type: "keydown",
      key: "End",
      preventDefault() {}
    });
    assert.equal(rootElement.style.properties["--progress"], "1");

    // Press Home to go to scene 0
    globalThis.window.dispatchEvent({
      type: "keydown",
      key: "Home",
      preventDefault() {}
    });
    assert.equal(rootElement.style.properties["--progress"], "0");
  });

  it("should handle mouse click navigation on data-go elements", () => {
    const targetElement = new MockElement("button", { go: "3" });
    const event = {
      type: "click",
      target: targetElement
    };
    targetElement.closest = (sel) => {
      if (sel === "[data-go]") return targetElement;
      return null;
    };

    rootElement.dispatchEvent(event);

    assert.equal(rootElement.style.properties["--progress"], "1");
  });

  it("should handle touch gestures", () => {
    // Start swipe down (finger moves down, meaning scroll up)
    rootElement.dispatchEvent({
      type: "touchstart",
      touches: [{ clientY: 100 }]
    });

    // End swipe down at clientY = 200 (delta = -100, which is direction < 0)
    // Since we are at 0, scrolling up does nothing (clamped to 0)
    rootElement.dispatchEvent({
      type: "touchend",
      changedTouches: [{ clientY: 200 }]
    });
    assert.equal(rootElement.style.properties["--progress"], "0");

    // Start swipe up (finger moves up, meaning scroll down)
    rootElement.dispatchEvent({
      type: "touchstart",
      touches: [{ clientY: 200 }]
    });

    // End swipe up at clientY = 100 (delta = 100, which is direction > 0)
    rootElement.dispatchEvent({
      type: "touchend",
      changedTouches: [{ clientY: 100 }]
    });
    assert.equal(rootElement.style.properties["--progress"], String(1 / 3));
  });

  it("should handle logo tunnel progress transitions at index 2", () => {
    // Move to index 2 (via direct click/update)
    const targetElement = new MockElement("button", { go: "2" });
    targetElement.closest = (sel) => sel === "[data-go]" ? targetElement : null;
    rootElement.dispatchEvent({ type: "click", target: targetElement });

    // At index 2, progress starts at 0 (or 1 depending on where we came from)
    // Since we came from 0 (index < LOGO_TUNNEL_INDEX), logoTunnelProgress is set to 0.
    assert.equal(rootElement.style.properties["--block-3-progress"], "0");

    // Fire wheel event. Instead of changing active scene, it should increase block-3-progress.
    // WHEEL_LOCK needs to be clear or bypassed by clearing locks.
    // Let's reset wheelLockedRef (which is ref 2)
    refStore[2].current = false;

    rootElement.dispatchEvent({
      type: "wheel",
      deltaY: 100,
      preventDefault() {}
    });

    // Progress should increase by step (LOGO_TUNNEL_STEP = 0.14)
    // Intensity is clamp(deltaY / 150, 0.8, 1.5) = clamp(100 / 150, 0.8, 1.5) = 0.8
    // Next progress = 0 + 0.14 * 0.8 = 0.112
    const progress = Number(rootElement.style.properties["--block-3-progress"]);
    assert.ok(progress > 0.111 && progress < 0.113);
  });

  it("should cleanup all event listeners on unmount", () => {
    assert.equal(typeof cleanupFn, "function");
    cleanupFn();
    // Verify listeners are empty or cleared (since we mock removeEventListener, we can test that remove was called)
    // Our MockElement removeEventListener filters listeners, so let's verify listeners are cleared or empty.
    assert.equal(rootElement.listeners["wheel"].length, 0);
    assert.equal(rootElement.listeners["touchstart"].length, 0);
    assert.equal(rootElement.listeners["touchend"].length, 0);
  });
});
