import Grader from './index.js'; 

start();

async function start() {
  await Grader.go();
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
  await Grader.ui.size({width:500, height:400});

  await Grader.util.sleep(2000);
  await Grader.ui.move({x:300, y:200});

  await Grader.util.sleep(2000);
  await Grader.ui.size({width:500, height:400});
}

