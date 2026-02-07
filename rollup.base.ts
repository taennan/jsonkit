import type { RollupOptions } from 'rollup'
import typescript from '@rollup/plugin-typescript'

type RollupConfigInput = {
  cjsFile?: string
  esmFile?: string
  tsconfig?: string
}

export function rollupConfig(packageJson: RollupConfigInput = {}): RollupOptions {
  const {
    cjsFile = 'dist/cjs/index.cjs',
    esmFile = 'dist/esm/index.js',
    tsconfig = './tsconfig.build.json',
  } = packageJson

  return {
    input: 'src/index.ts',
    output: [
      {
        file: cjsFile,
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: esmFile,
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({
        declaration: true,
        declarationDir: 'dist/types',
        tsconfig,
      }),
    ],
  }
}
