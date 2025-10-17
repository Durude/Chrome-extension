const toggle = document.getElementById("enableToggle");
const statusLabel = document.getElementById("statusLabel");
const langSelect = document.getElementById("langSelect");
const applyBtn = document.getElementById("applyBtn");
const elementCheckboxes = document.querySelectorAll(".elementType");
const previewCheckbox = document.getElementById("previewMode");
const textColorInput = document.getElementById("textColor"); // color picker

// Load saved settings
chrome.storage.sync.get(["enabled", "targetLang", "elementSelectors", "previewMode", "textColor"], (data) => {
  toggle.checked = data.enabled ?? false;
  langSelect.value = data.targetLang ?? "en";
  const savedSelectors = data.elementSelectors ?? [];
  elementCheckboxes.forEach(cb => cb.checked = savedSelectors.includes(cb.value));
  previewCheckbox.checked = data.previewMode ?? false;
  textColorInput.value = data.textColor ?? "#0000ff"; // default blue
  statusLabel.textContent = toggle.checked ? "On" : "Off";
});

// Toggle on/off
toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  chrome.storage.sync.set({ enabled });
  statusLabel.textContent = enabled ? "On" : "Off";
});

// Apply settings
applyBtn.addEventListener("click", async () => {
  const lang = langSelect.value;
  const selectedElements = Array.from(elementCheckboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);
  const previewMode = previewCheckbox.checked;
  const textColor = textColorInput.value;

  // Save all settings including color
  chrome.storage.sync.set({ targetLang: lang, elementSelectors: selectedElements, previewMode, textColor });

  // Update color of already-translated nodes immediately
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (color) => {
      document.querySelectorAll("span[data-adrain-translated]").forEach(span => {
        span.style.color = color;
      });
    },
    args: [textColor]
  });

  // Re-run content script for new translations
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"]
  });
});
