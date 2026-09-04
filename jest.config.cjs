/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.spec.ts'],
  clearMocks: true,
  moduleNameMapper: {
    '^jose$': '<rootDir>/test/mocks/jose.ts',
  },
};
