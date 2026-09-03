import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier';

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    // Vendored third-party components (reactbits.dev) — keep them faithful to
    // upstream and out of our stricter React Compiler lint rules.
    files: ['components/reactbits/**/*.tsx'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  eslintConfigPrettier,
];

export default eslintConfig;
