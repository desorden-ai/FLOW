import assert from "node:assert/strict";
import test from "node:test";
import React from "react";

// Set up minimal global environment for testing DOM logic
class MockHTMLElement {
  constructor(name = "element") {
    this.name = name;
    this.inert = false;
    this.hidden = false;
    this._attributes = new Map();
    this._listeners = new Map();
    this.dataset = {};
    this.children = [];
  }

  getAttribute(name) {
    return this._attributes.get(name) ?? null;
  }

  setAttribute(name, val) {
    this._attributes.set(name, String(val));
  }

  removeAttribute(name) {
    this._attributes.delete(name);
  }

  closest(selector) {
    if (selector === "[hidden]" && this.hidden) {
      return this;
    }
    if (this._closestResult) {
      return this._closestResult;
    }
    return null;
  }

  querySelector(selector) {
    if (this._querySelectorResult) {
      return this._querySelectorResult[selector] || null;
    }
    return null;
  }

  querySelectorAll() {
    return this._querySelectorAllResult || [];
  }

  focus() {
    this.focused = true;
    globalThis.document.activeElement = this;
  }
}

globalThis.HTMLElement = MockHTMLElement;
globalThis.window = globalThis;
globalThis.document = {
  activeElement: null,
  body: {
    classList: {
      _classes: new Set(),
      add(cls) {
        this._classes.add(cls);
      },
      remove(cls) {
        this._classes.delete(cls);
      },
      contains(cls) {
        return this._classes.has(cls);
      },
    },
  },
};

// Import functions and the hook to test using relative path
import {
  usePortfolioModal,
  getFocusableElements,
  restoreBackgroundElements,
  isolateBackgroundElements,
  handleTabKey,
  handleModalClick,
  handleModalKeyDown,
} from "../components/usePortfolioModal.ts";

test("getFocusableElements filters non-hidden, non-disabled elements", () => {
  const container = new MockHTMLElement("container");

  const elem1 = new MockHTMLElement("button1");
  const elem2 = new MockHTMLElement("button2");
  elem2.hidden = true;
  const elem3 = new MockHTMLElement("button3");
  elem3._closestResult = new MockHTMLElement("hidden-parent"); // acts as hidden parent

  container._querySelectorAllResult = [elem1, elem2, elem3];

  const result = getFocusableElements(container);
  assert.equal(result.length, 1);
  assert.equal(result[0], elem1);
});

test("restoreBackgroundElements correctly restores attributes and inert status", () => {
  const elem1 = new MockHTMLElement("elem1");
  const elem2 = new MockHTMLElement("elem2");

  const state = [
    { element: elem1, inert: false, ariaHidden: null },
    { element: elem2, inert: true, ariaHidden: "true" },
  ];

  restoreBackgroundElements(state);

  assert.equal(elem1.inert, false);
  assert.equal(elem1.getAttribute("aria-hidden"), null);

  assert.equal(elem2.inert, true);
  assert.equal(elem2.getAttribute("aria-hidden"), "true");
});

test("isolateBackgroundElements makes background inert and aria-hidden", () => {
  const root = new MockHTMLElement("root");
  const backdrop = new MockHTMLElement("backdrop");
  const child1 = new MockHTMLElement("child1");
  child1.inert = false;
  child1.setAttribute("aria-hidden", "false");

  root.children = [backdrop, child1];

  const state = isolateBackgroundElements(root, backdrop);

  assert.equal(state.length, 1);
  assert.equal(state[0].element, child1);
  assert.equal(state[0].inert, false);
  assert.equal(state[0].ariaHidden, "false");

  assert.equal(child1.inert, true);
  assert.equal(child1.getAttribute("aria-hidden"), "true");
});

test("handleTabKey trap focus correctly", () => {
  const backdrop = new MockHTMLElement("backdrop");
  const modal = new MockHTMLElement("modal");
  backdrop._querySelectorResult = {
    "[role='dialog']": modal,
  };

  const elem1 = new MockHTMLElement("first");
  const elem2 = new MockHTMLElement("last");
  modal._querySelectorAllResult = [elem1, elem2];

  // Shift + Tab on the first element should wrap to the last
  {
    globalThis.document.activeElement = elem1;
    let preventedDefault = false;
    const event = {
      key: "Tab",
      shiftKey: true,
      preventDefault() {
        preventedDefault = true;
      },
    };

    handleTabKey(event, backdrop);
    assert.equal(preventedDefault, true);
    assert.equal(elem2.focused, true);
  }

  // Tab on the last element should wrap to the first
  {
    globalThis.document.activeElement = elem2;
    let preventedDefault = false;
    const event = {
      key: "Tab",
      shiftKey: false,
      preventDefault() {
        preventedDefault = true;
      },
    };

    handleTabKey(event, backdrop);
    assert.equal(preventedDefault, true);
    assert.equal(elem1.focused, true);
  }
});

test("handleModalClick opens modal when target has data-modal-open", () => {
  const root = new MockHTMLElement("root");
  const target = new MockHTMLElement("button");
  target.dataset = { modalOpen: "My Project" };
  target.closest = (selector) => (selector === "[data-modal-open]" ? target : null);

  const event = { target };
  let openedTitle = null;
  let openedTrigger = null;

  const openModal = (title, trigger) => {
    openedTitle = title;
    openedTrigger = trigger;
  };
  const closeModal = () => {};

  handleModalClick(event, root, openModal, closeModal);

  assert.equal(openedTitle, "My Project");
  assert.equal(openedTrigger, target);
});

test("handleModalClick closes modal when backdrop or close button is clicked", () => {
  const root = new MockHTMLElement("root");
  const backdrop = new MockHTMLElement("backdrop");
  root._querySelectorResult = {
    "[data-modal]": backdrop,
  };

  let closed = false;
  const openModal = () => {};
  const closeModal = () => {
    closed = true;
  };

  // Click on backdrop
  {
    const event = { target: backdrop };
    backdrop.closest = () => null;
    handleModalClick(event, root, openModal, closeModal);
    assert.equal(closed, true);
  }

  // Click on close button inside modal
  {
    closed = false;
    const closeBtn = new MockHTMLElement("close-btn");
    closeBtn.closest = (selector) => (selector === "[data-modal-close]" ? closeBtn : null);
    const event = { target: closeBtn };

    handleModalClick(event, root, openModal, closeModal);
    assert.equal(closed, true);
  }
});

test("handleModalKeyDown closes modal on Escape key", () => {
  const root = new MockHTMLElement("root");
  const backdrop = new MockHTMLElement("backdrop");
  backdrop.hidden = false;
  root._querySelectorResult = {
    "[data-modal]": backdrop,
  };

  let closed = false;
  const closeModal = () => {
    closed = true;
  };

  let preventedDefault = false;
  const event = {
    key: "Escape",
    preventDefault() {
      preventedDefault = true;
    },
  };

  handleModalKeyDown(event, root, closeModal);

  assert.equal(closed, true);
  assert.equal(preventedDefault, true);
});

test("usePortfolioModal registers event listeners on mount and cleans up on unmount", () => {
  const root = new MockHTMLElement("root");
  const rootRef = { current: root };

  let effectCleanup = null;
  let listenersAdded = [];

  root.addEventListener = (event, listener) => {
    listenersAdded.push({ target: "root", event, listener });
  };
  root.removeEventListener = (event, listener) => {
    listenersAdded = listenersAdded.filter(
      (l) => !(l.target === "root" && l.event === event && l.listener === listener)
    );
  };

  const originalWindowAdd = globalThis.addEventListener;
  const originalWindowRemove = globalThis.removeEventListener;

  let windowListeners = [];
  globalThis.addEventListener = (event, listener) => {
    windowListeners.push({ target: "window", event, listener });
  };
  globalThis.removeEventListener = (event, listener) => {
    windowListeners = windowListeners.filter(
      (l) => !(l.target === "window" && l.event === event && l.listener === listener)
    );
  };

  const secret = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const originalH = secret.H;

  const refs = [];
  let effectFn = null;

  secret.H = {
    useRef(initial) {
      const ref = { current: initial };
      refs.push(ref);
      return ref;
    },
    useCallback(fn) {
      return fn;
    },
    useEffect(fn) {
      effectFn = fn;
    },
  };

  try {
    usePortfolioModal(rootRef);

    assert.equal(refs.length, 2);
    const [triggerRef, backgroundStateRef] = refs;

    assert.equal(triggerRef.current, null);
    assert.deepEqual(backgroundStateRef.current, []);

    // Trigger effect
    effectCleanup = effectFn();

    // Verify listeners registered
    assert.equal(listenersAdded.length, 1);
    assert.equal(listenersAdded[0].event, "click");
    assert.equal(windowListeners.length, 1);
    assert.equal(windowListeners[0].event, "keydown");

    // Trigger cleanup
    effectCleanup();

    // Verify listeners removed
    assert.equal(listenersAdded.length, 0);
    assert.equal(windowListeners.length, 0);

  } finally {
    secret.H = originalH;
    globalThis.addEventListener = originalWindowAdd;
    globalThis.removeEventListener = originalWindowRemove;
  }
});

test("usePortfolioModal openModal and closeModal manage modal state and DOM classes", () => {
  const root = new MockHTMLElement("root");
  const rootRef = { current: root };

  const backdrop = new MockHTMLElement("backdrop");
  backdrop.hidden = true;

  const modal = new MockHTMLElement("modal");
  const modalTitle = new MockHTMLElement("modalTitle");

  root._querySelectorResult = {
    "[data-modal]": backdrop,
  };
  backdrop._querySelectorResult = {
    "[role='dialog']": modal,
    "[data-modal-title]": modalTitle,
  };

  const secret = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const originalH = secret.H;

  const refs = [];

  secret.H = {
    useRef(initial) {
      const ref = { current: initial };
      refs.push(ref);
      return ref;
    },
    useCallback(fn) {
      return fn;
    },
    useEffect() {
      // Not needed for this test
    },
  };

  try {
    const { openModal, closeModal } = usePortfolioModal(rootRef);
    const [triggerRef] = refs;

    // Initially backdrop is hidden and class is not set
    assert.equal(backdrop.hidden, true);
    assert.equal(globalThis.document.body.classList.contains("modal-open"), false);

    // Call openModal
    const trigger = new MockHTMLElement("trigger");
    openModal("Awesome Project", trigger);

    assert.equal(backdrop.hidden, false);
    assert.equal(modalTitle.textContent, "Awesome Project");
    assert.equal(triggerRef.current, trigger);
    assert.equal(globalThis.document.body.classList.contains("modal-open"), true);

    // Call closeModal
    closeModal();

    assert.equal(backdrop.hidden, true);
    assert.equal(triggerRef.current, null);
    assert.equal(globalThis.document.body.classList.contains("modal-open"), false);

  } finally {
    secret.H = originalH;
  }
});
