// jest.setup.js
require("@testing-library/jest-dom");

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});