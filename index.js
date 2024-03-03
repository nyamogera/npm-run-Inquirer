import { glob } from "glob";
import inquirer from "inquirer";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { readFile } from "fs/promises";
import path from "path";

import { spawn } from "child_process";

const argv = yargs(hideBin(process.argv))
  .usage('$0 [dir] [options]')
  .positional('dir', {
    describe: 'The directory to start the search from',
    default: '.',
    type: 'string',
  })
  .help()
  .parse();

const directory = argv.dir;

async function loadPackageJson(packageJsonPath) {
  console.log(packageJsonPath);
  try {
    const data = await readFile(packageJsonPath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error(`Failed to load ${packageJsonPath}: ${err}`);
    return null; // またはエラーを再投げする
  }
}

async function findPackageJsonFiles() {
  const pattern = directory + '/**/package.json';
  console.log(pattern);
  const files = await glob(pattern, { ignore: "**/node_modules/**" });
  return files;
}

async function run() {
  const files = await findPackageJsonFiles();
  if (files.length === 0) {
    console.log("No package.json files were found.");
    return;
  }

  // ファイル選択
  const choices = files.map((file) => ({
    name: file,
    value: file,
  }));

  const { selectedFile } = await inquirer.prompt([
    {
      type: "list",
      name: "selectedFile",
      message: "Which package.json scripts do you want to run?",
      choices,
    },
  ]);

  const packageJsonPath = path.resolve(selectedFile);
  const packageJson = await loadPackageJson(packageJsonPath);

  if (packageJson.scripts === undefined) {
    console.log("No scripts found in the package.json file.");
    return;
  }

  const scriptChoices = Object.entries(packageJson.scripts).map(
    ([key, value]) => ({
      name: `${key} - ${value}`,
      value: key,
    })
  );

  const { script } = await inquirer.prompt([
    {
      type: "list",
      name: "script",
      message: "Which script do you want to execute?",
      choices: scriptChoices,
    },
  ]);

  console.log(`Executing "${script}" script...`);
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

  const childProcess = spawn(npmCommand, ["run", script], {
    stdio: "inherit",
    cwd: path.dirname(selectedFile),
  });

  childProcess.on("close", (code) => {
    console.log(`Process finished with exit code: ${code}`);
  });
}

run();
