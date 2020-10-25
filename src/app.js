import Grader from './index.js'; 

start();

async function start() {
  await Grader.go();
  const {UI} = await Grader.ui.open();
  await Grader.util.sleep(3000);
  await Grader.ui.close(UI);
}

