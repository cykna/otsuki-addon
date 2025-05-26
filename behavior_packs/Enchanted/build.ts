import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import cleanupPlugin from "rollup-plugin-cleanup";
import commonjs from "@rollup/plugin-commonjs";
import { swcDir } from "@swc/cli";
import { rollup } from "rollup";


const swcOptions = {
  jsc: {
    parser: {
      syntax: 'typescript',
      decorators: true,
      decoratorsBeforeExport: true,
      dynamicImport: true,
      privateMethod: true,
      functionBind: true,
      exportDefaultFrom: true,
      exportNamespaceFrom: true,
      preserveAllCommends: false,
      jsx: false,
    },
    experimental: {
      plugins: [[
        "@swc/plugin-transform-imports",
        {
          "^(.*?)(\\.ts)$": {
            "skipDefaultConversion": true,
            "transform": "{{matches.[1]}}.js"
          }
        }
      ]]
    },
    transform: {
      legacyDecorator: true,
      decoratorMetadata: false,

      constModules: {
        globals: {
          "@zetha/response_code": {
            SuccessCode: "0",
            NotFoundCode: "1",
            NotEnoughPermissionCode: "2",
            InvalidCredentialsCode: "3",
            InternalErrorCode: "4",
          },
          "@zetha/constants": {
            SIZE_LIMIT: "2048",
            REQUEST_AMOUNT_LIMIT: "4095", //all 12 bits are 1, so it's used to the same as N % 4096
            APPROXIMATED_UNCOMPRESSED_LIMIT: "2048 * 1.3"
          }
        }
      },
      optimizer: {
        simplify: true
      }
    },
    loose: true,
    keepClassNames: false,
    target: 'esnext',
    externalHelpers: false,
  },
  module: {
    type: 'es6',
    resolveFully: true
  },
  sourceMaps: false,
  minify: false
};

swcDir({
  cliOptions: {
    outDir: './scripts',
    watch: true,
    filenames: ['./src'],
    extensions: ['.ts'],
    stripLeadingPaths: true,
  },
  watchOptions: {
    usePooling: true,
    interval: 100
  },
  swcOptions,
  callbacks: {
    onSuccess: async e => {
      const bundle = await rollup({
        plugins: [resolve(), commonjs(), cleanupPlugin()],
        input: "./scripts/main.js",
        output: {
          generatedCode: {
            constBindings: true,
            objectShorthand: true,
            arrowFunctions: true,
            reservedNamesAsProps: true,
          },
          file: "./scripts/out.js",
          hashCharacters: 'hex',
          compact: true,
          validate: true,
          freeze: true,
        },
        treeshake: 'smallest',
        context: 'globalThis',
        cache: true,
        watch: false,

      });
      const write = bundle.write({
        'indent': true,
        'strict': true,
        'compact': false,
        generatedCode: {
          'constBindings': true,
          'objectShorthand': true,
        },
        file: './scripts/main.js'
      });
    },
    onFail: e => {
      console.log(e);
    },
    onWatchReady: () => { },
  },
});
