import { AtpAgent } from '@atproto/api';
import { subMonths } from 'date-fns';
import { getData } from './bsky';
import ActivityGraph from './activityGraph';

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

function dotDotDot(element, message) {
  let dotCount = 0;
  const start = Date.now();
  return setInterval(() => (element.innerText = `${message} (${Number((Date.now() - start) / 1000).toFixed(0)}s)` +
    `${'.'.repeat(dotCount++ % 4)}`), 500);
}

function formatDateForAttrs(date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`
}

const NUM_LEVEL_STYLES = 8;
async function queryFeed(targetDiv) {
  const currentTheme = [...document.documentElement.classList].find((cn) => cn.startsWith('theme--')).split('--')[1];
  const newDiv = document.createElement('div');
  newDiv.id = "id-" + Number.parseInt(Array.from({ length: 6 },
    () => Math.floor(Math.random() * 255)).reduce((a, x) => a + x, '')).toString(16);
  newDiv.style = `margin: 2em 1em 2em 1em; font-size: 0.8em; color: ${currentTheme === 'light' ? 'rgb(66, 87, 108)' : 'white'}`;
  targetDiv.insertAdjacentElement('afterend', newDiv);

  const handle = new URL(window.location).pathname.slice(1).split('/').slice(-1)[0];
  const intervalHandle = dotDotDot(newDiv, `⏳ Querying @${handle}'s feed`);
  if (handle) {
    try {
      const feed = await getData(new AtpAgent({ service: 'https://api.bsky.app' }), handle);
      newDiv.innerText = '';

      let activityLevels;
      const counts = feed.data.map(({ count }) => count);
      if (counts.length > (NUM_LEVEL_STYLES - 1)) {
        const min = Math.min(...counts);
        const max = Math.max(...counts);
        const fullRange = Array.from({ length: max - min }, (_, i) => i + min);
        const sampleWidth = Math.round(fullRange.length / (NUM_LEVEL_STYLES - 1));

        // the following odd machinations ensure that "0" and "0" alone is always the first
        // element, to ensure that 0 by itself is represented as an activity level (it makes the
        // resulting render more intuitive)
        let samples = fullRange;
        if (sampleWidth > 1 && counts.length > (NUM_LEVEL_STYLES + 1)) {
          samples = [0];
          for (let i = 0; i < fullRange.length; i += sampleWidth) {
            samples.push(fullRange[i]);
          }
          if (samples?.[1] === 0) {
            samples[1] = 1;
          }
        }
        activityLevels = samples.join(",");
      }

      const now = new Date();
      const { monthsBack } = await theRealBrowser.storage.sync.get();
      const graphPayload = {
        'range-start': formatDateForAttrs(subMonths(now, monthsBack ?? 7)),
        'range-end': formatDateForAttrs(now),
        'activity-data': feed.data.reduce(
          (a, { date, count }) => ([...a, ...Array.from({ length: count }, () => date)]), []
        ).flat().join(",")
      };

      if (activityLevels) {
        graphPayload['activity-levels'] = activityLevels;
      }

      const actGraph = new ActivityGraph(newDiv.id, currentTheme, graphPayload);
      newDiv.setHTMLUnsafe(actGraph.render());
    } catch (error) {
      console.error(error);
      newDiv.innerText = `Feed query failed: "${error}"`;
    } finally {
      clearInterval(intervalHandle);
    }
  } else {
    clearInterval(intervalHandle);
    newDiv.innerText = 'Unable to get handle!';
  }
}

async function waitForHydration() {
  const { includeButton } = await theRealBrowser.storage.sync.get();
  // profiles without any description won't get profileHeaderDescription, but all have profileHeaderFollowsButton
  // profileHeaderDescription is better positioning for the former profile pages, so we try it first
  const targetDiv = document.querySelector('div[data-testid=profileHeaderDescription]') ?? 
    document.querySelector('a[data-testid=profileHeaderFollowsButton]')?.parentElement;

  if (!targetDiv) {
    return setTimeout(waitForHydration, 100);
  }

  if (!includeButton) {
    return queryFeed(targetDiv);
  }

  const goButton = document.createElement('button');
  goButton.innerText = "Get user's post frequency";
  goButton.style = 'margin: 1em; width: fit-content; padding: 0.5em;';
  goButton.addEventListener('click', () => {
    goButton.parentElement.removeChild(goButton);
    queryFeed(targetDiv);
  });
  targetDiv.insertAdjacentElement('afterend', goButton);
}

// Bluesky hydrates the DOM after the initial load ends, which is what `"run_at": "document_end"`
// in the manifest maps to. Accordingly we have to poll for the hydrated component we're waiting for
setTimeout(waitForHydration, 250);
