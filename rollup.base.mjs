import typescript from '@rollup/plugin-typescript'
import rollupDelete from 'rollup-plugin-delete'
import { dts } from 'rollup-plugin-dts'

export function rollupConfig(packageJson = {}) {
  const {
    input = 'src/index.ts',
    cjsFile = 'dist/cjs/index.cjs',
    esmFile = 'dist/esm/index.js',
    tsconfig = './tsconfig.json',
  } = packageJson

  return [
    {
      input,
      output: {
        file: esmFile,
        format: 'esm',
        sourcemap: true,
      },
      plugins: [
        typescript({
          outDir: 'dist/esm',
          tsconfig,
        }),
      ],
    },
    {
      input,
      output: {
        file: cjsFile,
        format: 'cjs',
        sourcemap: true,
      },
      plugins: [
        typescript({
          outDir: 'dist/cjs',
          tsconfig,
        }),
      ],
    },
    {
      input: 'dist/cjs/index.d.ts',
      output: [{ file: 'dist/index.d.ts', format: 'es' }],
      plugins: [
        dts(),
        rollupDelete({
          hook: 'buildEnd',
          targets: [
            'dist/cjs/**/*',
            'dist/esm/**/*',
            '!dist/**/*.cjs',
            '!dist/**/*.js',
            '!dist/**/*.map',
          ],
        }),
      ],
    },
  ]
}

export default rollupConfig()
