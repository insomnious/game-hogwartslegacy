import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//console.log("__dirname=" + __dirname);
//console.log("__filename=" + __filename);

async function start() {
  const distFolder = path.join(__dirname, "dist");

  const packageJsonPath = path.join(__dirname, "package.json");
  const infoJsonPath = path.join(distFolder, "info.json");

  // create empty object to start with
  let infoJson = {
    name: "",
    author: "",
    version: "",
    description: ""
  };

  let packageJson;

  // load package.json so we can get data
  try {
    const packageData = await fs.readFile(packageJsonPath, { encoding: "utf8" });
    packageJson = JSON.parse(packageData);
  } catch (error) {
    console.error(error);
  }

  // try to load info.json if it exists
  try {
    await fs.access(infoJsonPath);
    console.log(infoJsonPath + " exists");

    const infoData = await fs.readFile(infoJsonPath, { encoding: "utf8" });
    infoJson = JSON.parse(infoData); // try to parse into object

    // exists, so only update the other stuff
    infoJson.author = packageJson.author;
    infoJson.version = packageJson.version;
    infoJson.description = packageJson.description;
  } catch (error) {
    console.error(error);

    // doesn't exist, update everything
    infoJson.name = packageJson.name;
    infoJson.author = packageJson.author;
    infoJson.version = packageJson.version;
    infoJson.description = packageJson.description;
  }

  try {
    const json = JSON.stringify(infoJson);

    console.log(json);

    // write back to info.json
    await fs.writeFile(infoJsonPath, json, { encoding: "utf8" });
  } catch (err) {
    console.error(err);
  }
}

start();
