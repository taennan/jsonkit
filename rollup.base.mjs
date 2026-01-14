import typescript from '@rollup/plugin-typescript'

export function rollupConfig(packageJson = {}) {
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
        declaration: false,
        tsconfig,
      }),
    ],
  }
}
