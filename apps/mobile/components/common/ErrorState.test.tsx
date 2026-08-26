import { fireEvent, render, screen } from '@testing-library/react-native';

import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('renders its default message when none is given', async () => {
    await render(<ErrorState />);
    expect(screen.getByText("Couldn't load this — check your connection and try again.")).toBeTruthy();
  });

  it('renders a custom message when given one', async () => {
    await render(<ErrorState message="Couldn't load departments." />);
    expect(screen.getByText("Couldn't load departments.")).toBeTruthy();
  });

  it('renders no Retry button when onRetry is omitted', async () => {
    await render(<ErrorState />);
    expect(screen.queryByText('Retry')).toBeNull();
  });

  it('fires onRetry when the Retry button is pressed', async () => {
    const onRetry = jest.fn();
    await render(<ErrorState onRetry={onRetry} />);
    fireEvent.press(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
