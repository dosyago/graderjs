import Grader from './index.js'; 

start();

async function start() {
  await Grader.go();
}

// demos
  async function windowDemo() {
    await Grader.go();

    await Grader.util.sleep(3000);
    const {UI:UI2} = await Grader.ui.open();

    await Grader.util.sleep(3000);
    await Grader.ui.close(UI2);

    await Grader.util.sleep(2000);
    await Grader.ui.minimize();

    await Grader.util.sleep(2000);
    await Grader.ui.maximize();

    await Grader.util.sleep(2000);
    await Grader.ui.fullscreen();

    await Grader.util.sleep(2000);
    await Grader.ui.partscreen();

    await Grader.util.sleep(2000);
    await Grader.ui.size({width:200, height:100});

    await Grader.util.sleep(2000);
    await Grader.ui.move({x:300, y:200});

    await Grader.util.sleep(2000);
    await Grader.ui.size({width:400, height:300});

    await Grader.util.sleep(2000);
    await Grader.ui.move({x:600, y:400});

    await Grader.util.sleep(2000);
    await Grader.ui.move({x:50, y:300});

    await Grader.util.sleep(2000);
    await Grader.ui.size({width:200, height:100});
  }


