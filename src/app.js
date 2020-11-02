import Grader from './index.js';
import {openDemo, windowDemo} from './demos.js';
import {sleep} from './lib/common.js';

start();

async function start() {
  // create App
    await Grader.go({doLayout:true, noWindow:true});

  // demo 1
    let {UI} = await openDemo();
    await sleep(2000);

    Grader.ui.close(UI);

  // demo 2
    ({UI} = await windowDemo());

    await sleep(2000);
    Grader.ui.close(UI)
}




