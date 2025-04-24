import { watch } from "fs";
let i = 0;
async function main() {
  try {

    const mainscript = await import(`./main.ts?update=${Date.now()}`);

    mainscript.main();
    i = 0;
  } catch (e) {
    if (i > 100) return i = 0;
    i++;
    console.log(e);
    main();
  }
}

main();
watch("src/", { recursive: true }, (_, f) => {
  main();
});
