import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//console.log("__dirname=" + __dirname);
//console.log("__filename=" + __filename);

async function start() {
  const distFolder = path.join(__dirname, "dist");
  const packageData = await fs.readFile(path.join(__dirname, "package.json"), {
    encoding: "utf8"
  });

  try {
    const packageJson = JSON.parse(packageData);

    //console.log(packageJson);

    const infojson = JSON.stringify({
      name: packageJson.name,
      author: packageJson.author,
      version: packageJson.version,
      description: packageJson.description
    });

    // create json.info
    await fs.writeFile(path.join(distFolder, "info.json"), infojson, {
      encoding: "utf8"
    });
  } catch (err) {
    console.error(err);
  }
}

start();
