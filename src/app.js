import Grader from './index.js';
import {openDemo, windowDemo} from './demos.js';
import {sleep} from './lib/common.js';

start();

async function start() {
  const app1 = await openDemo();
  await sleep(2000);

  Grader.ui.close(app1.UI);
  const app2 = await windowDemo();

  await sleep(2000);
  Grader.ui.close(app2.UI)
}




