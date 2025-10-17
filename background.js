chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "translate") {
    translateText(message.text, message.targetLang)
      .then((translated) => sendResponse(translated))
      .catch(() => sendResponse("(error)"));
    return true; // keep async channel open
  }
});

async function translateText(text, targetLang = "en") {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("API error");
  const data = await response.json();
  return data?.[0]?.[0]?.[0] || "(error)";
}
