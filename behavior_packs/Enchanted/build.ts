async function main() {
  Bun.build({
    entrypoints: ['./src/main.ts'],
    outdir: './scripts',
    splitting: true,
    external: ["@minecraft/server"]
  }).then(val => {
    console.log("Finished building src");
  }).catch(e => {
    console.log(e);
    main();
  });
}
import { watch } from "fs";

watch("src/", { recursive: true }, (_, f) => {
  console.log(`Building. File ${f} changed`);
  try {
    main();
  } catch { }
});
main();
