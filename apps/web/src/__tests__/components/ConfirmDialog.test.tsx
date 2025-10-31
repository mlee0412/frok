import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '@frok/ui';

describe('ConfirmDialog Component', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Confirm Action',
    description: 'Are you sure you want to proceed?',
  };

  it('renders when open is true', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />);

    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
  });

  it('calls onOpenChange when Cancel button is clicked', async () => {
    const handleOpenChange = vi.fn();
    const user = userEvent.setup();

    render(<ConfirmDialog {...defaultProps} onOpenChange={handleOpenChange} />);

    await user.click(screen.getByText('Cancel'));
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onConfirm when Confirm button is clicked', async () => {
    const handleConfirm = vi.fn();
    const user = userEvent.setup();

    render(<ConfirmDialog {...defaultProps} onConfirm={handleConfirm} />);

    await user.click(screen.getByText('Confirm'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('uses custom button labels when provided', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        cancelLabel="No"
        confirmLabel="Yes"
      />
    );

    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });

  it('applies danger variant styling', () => {
    render(<ConfirmDialog {...defaultProps} variant="danger" />);

    const confirmButton = screen.getByText('Confirm');
    // Check for danger-related classes (red/destructive styling)
    expect(confirmButton).toBeInTheDocument();
  });

  it('applies warning variant styling', () => {
    render(<ConfirmDialog {...defaultProps} variant="warning" />);

    const confirmButton = screen.getByText('Confirm');
    // Check for warning-related classes (yellow/caution styling)
    expect(confirmButton).toBeInTheDocument();
  });

  it('shows loading state when confirming', async () => {
    const handleConfirm = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 100)));
    const user = userEvent.setup();

    render(<ConfirmDialog {...defaultProps} onConfirm={handleConfirm} />);

    await user.click(screen.getByText('Confirm'));

    // Button should show loading text and be disabled
    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeDisabled();
    });
  });

  it('has proper ARIA attributes for accessibility', () => {
    render(<ConfirmDialog {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});
