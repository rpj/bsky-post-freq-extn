import { AtpAgent } from '@atproto/api';
import { getData } from './helpers';
import { mean, median, mode } from 'simple-statistics';

function dotDotDot (element, message) {
  let dotCount = 0;
  const start = Date.now();
  return setInterval(() => (element.innerText = `${message} (${Number((Date.now() - start) / 1000).toFixed(0)}s)` +
    `${'.'.repeat(dotCount++ % 4)}`), 500);
}

async function queryFeed (targetDiv) {
  const newDiv = document.createElement('div');
  newDiv.style = 'margin: 1em; font-size: 0.8em;';
  const hr = document.createElement('hr');
  hr.style = 'width: 80%; margin-top: 1em;';
  targetDiv.insertAdjacentElement('afterend', hr);
  hr.insertAdjacentElement('afterend', newDiv);
  const hr2 = document.createElement('hr');
  hr2.style = 'width: 80%; margin-top: 0.5em; margin-bottom: 1em;';
  newDiv.insertAdjacentElement('afterend', hr2);

  const handle = new URL(window.location).pathname.slice(1).split('/').slice(-1)[0];
  const intervalHandle = dotDotDot(newDiv, `⏳ Querying @${handle}'s feed`);
  if (handle) {
    try {
      const feed = await getData(new AtpAgent({ service: 'https://api.bsky.app' }), handle);
      const justCounts = feed.data.map(({ count }) => count);
      const mostPosts = document.createElement('div');
      mostPosts.innerText = `Most posts in one day: ${feed.max}.`;
      const hasPosted = document.createElement('div');
      hasPosted.innerText = `Has posted on ${feed.data.length} days total.`;
      const averages = document.createElement('div');
      averages.innerText = `Per-day averages: mean ${Number(mean(justCounts)).toFixed(1)}; ` +
        `median ${median(justCounts)}; mode ${mode(justCounts)}.`;
      const fullData = document.createElement('div');
      fullData.style = 'margin-top: 0.7em; font-size: 0.6em; color: gray;';
      fullData.innerText = feed.data.map(({ date, count }) => `${date}: ${count}`).join(', ');
      newDiv.innerText = '';
      [mostPosts, hasPosted, averages, fullData].forEach(newDiv.appendChild.bind(newDiv));
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

setTimeout(async () => {
  const targetDiv = document.querySelector('div[data-testid=profileHeaderDescription]');

  if (targetDiv) {
    const goButton = document.createElement('button');
    goButton.innerText = "Get user's post frequency";
    goButton.style = 'margin: 1em;';
    goButton.addEventListener('click', () => {
      goButton.parentElement.removeChild(goButton);
      queryFeed(targetDiv);
    });
    targetDiv.insertAdjacentElement('afterend', goButton);
  }
}, 1000); // even `"run_at": "document_end"` doesn't solve this!
