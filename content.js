const translatedNodes = new WeakSet();

function isVisible(node) {
  if (!node.parentElement) return false;
  const style = window.getComputedStyle(node.parentElement);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && node.nodeValue.trim() !== "";
}

function containsChinese(text) {
  return /[\u4e00-\u9fff]/.test(text);
}

function walk(node, nodes) {
  if (!node) return;

  let parent = node.parentElement;
  while (parent) {
    if (parent.dataset && parent.dataset.adrainTranslated) return;
    parent = parent.parentElement;
  }

  if (node.nodeType === Node.TEXT_NODE &&
      node.nodeValue.trim().length > 0 &&
      isVisible(node) &&
      !translatedNodes.has(node) &&
      containsChinese(node.nodeValue)) {
    nodes.push(node);
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    node.childNodes.forEach(child => walk(child, nodes));
  }
}

function getTextNodes(selectors) {
  const nodes = [];
  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => walk(el, nodes));
  });
  return nodes;
}

function translateNode(node, targetLang) {
  if (translatedNodes.has(node)) return;

  translatedNodes.add(node);

  chrome.storage.sync.get(["textColor"], ({ textColor }) => {
    const original = node.nodeValue.trim();
    chrome.runtime.sendMessage({ action: "translate", text: original, targetLang }, (translated) => {
      if (!translated) return;

      const span = document.createElement("span");
      span.style.color = textColor || "blue"; // color from storage
      span.style.marginLeft = "6px";
      span.style.fontStyle = "italic";
      span.textContent = `(${translated})`;
      span.dataset.adrainTranslated = "true";
      node.parentNode.insertBefore(span, node.nextSibling);
    });
  });
}

function processNodes(selectors, targetLang) {
  const nodes = getTextNodes(selectors);
  nodes.forEach(node => translateNode(node, targetLang));
}

function observeMutations(selectors, targetLang) {
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(addedNode => {
        if (!addedNode) return;

        let parent = addedNode.parentElement;
        while (parent) {
          if (parent.dataset && parent.dataset.adrainTranslated) return;
          parent = parent.parentElement;
        }

        if (addedNode.nodeType === Node.ELEMENT_NODE && selectors.some(sel => addedNode.matches(sel))) {
          processNodes(selectors, targetLang);
        } else if (addedNode.nodeType === Node.TEXT_NODE &&
                   isVisible(addedNode) &&
                   containsChinese(addedNode.nodeValue) &&
                   !translatedNodes.has(addedNode)) {
          translateNode(addedNode, targetLang);
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Start
chrome.storage.sync.get(["enabled", "targetLang", "elementSelectors"], ({ enabled, targetLang, elementSelectors }) => {
  if (enabled && elementSelectors && elementSelectors.length > 0) {
    processNodes(elementSelectors, targetLang || "en");
    observeMutations(elementSelectors, targetLang || "en");
  }
});
