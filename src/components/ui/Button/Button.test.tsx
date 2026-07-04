// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

afterEach(() => {
  cleanup();
});

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Reset</Button>);
    expect(screen.getByText('Reset')).not.toBeNull();
  });

  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Reset</Button>);
    expect(screen.getByRole('button')).toHaveProperty('type', 'button');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Reset</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when the disabled prop is set', () => {
    render(<Button disabled>Reset</Button>);
    expect(screen.getByRole('button')).toHaveProperty('disabled', true);
  });
});
