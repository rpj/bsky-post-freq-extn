let theRealBrowser;
try {
  theRealBrowser = browser; // firefox
} catch {
  if (chrome) {
    theRealBrowser = chrome; // and opera
  } else {
    throw 'cannot determine browser type';
  }
}

function setupElementImpl(
  storage, 
  elementId, 
  defaultValue, 
  elementValueGetter = (e) => e.target.value,
  elementValueSetter = (e, v) => (e.value = v),
) {
  const element = document.getElementById(elementId);
  elementValueSetter(element, storage[elementId] ?? defaultValue);
  element.addEventListener('change', (e) => {
    theRealBrowser.storage.sync.set({
      ...storage,
      [elementId]: elementValueGetter(e),
    });
  });
}

async function main() {
  const setupElement = setupElementImpl.bind(null, await theRealBrowser.storage.sync.get());

  setupElement('monthsBack', 7);
  setupElement('includeButton', false, (e) => e.target.checked, (e, v) => (e.checked = v));
}

main();