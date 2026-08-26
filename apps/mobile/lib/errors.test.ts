import { getErrorMessage } from './errors';

describe('getErrorMessage', () => {
  it("returns an Error's own message", () => {
    expect(getErrorMessage(new Error('network request failed'))).toBe('network request failed');
  });

  it('falls back to a generic message for a non-Error throw', () => {
    expect(getErrorMessage('a plain string')).toBe('Something went wrong.');
    expect(getErrorMessage({ code: '23505' })).toBe('Something went wrong.');
    expect(getErrorMessage(undefined)).toBe('Something went wrong.');
  });
});
