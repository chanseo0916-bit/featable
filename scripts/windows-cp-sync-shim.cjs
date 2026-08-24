/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

if (process.platform === "win32") {
  function copySync(source, destination, options = {}) {
    const src = path.resolve(source);
    const dest = path.resolve(destination);

    if (options.filter && !options.filter(src, dest)) return;

    const stat = options.dereference ? fs.statSync(src) : fs.lstatSync(src);

    if (stat.isDirectory()) {
      if (!options.recursive) {
        throw new Error("Recursive copy requires the recursive option.");
      }
      fs.mkdirSync(dest, { recursive: true, mode: stat.mode });
      for (const entry of fs.readdirSync(src)) {
        copySync(path.join(src, entry), path.join(dest, entry), options);
      }
      return;
    }

    fs.mkdirSync(path.dirname(dest), { recursive: true });

    if (stat.isSymbolicLink()) {
      const target = fs.readlinkSync(src);
      try {
        if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
        fs.symlinkSync(target, dest);
      } catch {
        copySync(fs.realpathSync(src), dest, { ...options, dereference: true });
      }
      return;
    }

    if (!options.force && fs.existsSync(dest)) {
      if (options.errorOnExist) throw new Error(`Destination already exists: ${dest}`);
      return;
    }

    fs.copyFileSync(src, dest);
    fs.chmodSync(dest, stat.mode);
    if (options.preserveTimestamps) fs.utimesSync(dest, stat.atime, stat.mtime);
  }

  fs.cpSync = copySync;
}
