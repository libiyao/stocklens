import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

export function loadTypeScript(url, dependencies = {}) {
  const filename = fileURLToPath(url);
  const source = readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const testModule = { exports: {} };
  const require = specifier => {
    if (specifier in dependencies) return dependencies[specifier];
    throw new Error(`Unexpected test dependency: ${specifier}`);
  };
  new Function("exports", "module", "require", "__filename", "__dirname", compiled)(testModule.exports, testModule, require, filename, dirname(filename));
  return testModule.exports;
}
