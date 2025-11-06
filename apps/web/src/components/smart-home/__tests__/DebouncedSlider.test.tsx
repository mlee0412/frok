import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { DebouncedSlider, DebouncedNumberInput } from '../DebouncedSlider';

describe('DebouncedSlider', () => {
  it('should render with initial value', () => {
    const onChange = vi.fn();
    render(
      <DebouncedSlider
        value={50}
        onChange={onChange}
        min={0}
        max={100}
        ariaLabel="Test slider"
      />
    );

    const slider = screen.getByRole('slider', { name: 'Test slider' });
    expect(slider).toHaveAttribute('value', '50');
    expect(slider).toHaveAttribute('aria-valuenow', '50');
  });

  it('should update local value immediately', () => {
    const onChange = vi.fn();
    render(
      <DebouncedSlider
        value={50}
        onChange={onChange}
        min={0}
        max={100}
        ariaLabel="Test slider"
      />
    );

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '75' } });

    // Local value updates immediately
    expect(slider).toHaveAttribute('value', '75');
  });

  it('should debounce onChange calls', async () => {
    const onChange = vi.fn();
    vi.useFakeTimers();

    render(
      <DebouncedSlider
        value={50}
        onChange={onChange}
        debounceMs={300}
        ariaLabel="Test slider"
      />
    );

    const slider = screen.getByRole('slider');

    // Make rapid changes
    fireEvent.change(slider, { target: { value: '60' } });
    fireEvent.change(slider, { target: { value: '70' } });
    fireEvent.change(slider, { target: { value: '80' } });

    // onChange should not be called immediately
    expect(onChange).not.toHaveBeenCalled();

    // Advance timers
    vi.advanceTimersByTime(300);

    // onChange should be called once with final value
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(80);

    vi.useRealTimers();
  });

  it('should call onChangeEnd on mouse up', () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();

    render(
      <DebouncedSlider
        value={50}
        onChange={onChange}
        onChangeEnd={onChangeEnd}
        ariaLabel="Test slider"
      />
    );

    const slider = screen.getByRole('slider');

    fireEvent.change(slider, { target: { value: '75' } });
    fireEvent.mouseUp(slider);

    expect(onChangeEnd).toHaveBeenCalledWith(75);
  });

  it('should call onChangeEnd on touch end', () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();

    render(
      <DebouncedSlider
        value={50}
        onChange={onChange}
        onChangeEnd={onChangeEnd}
        ariaLabel="Test slider"
      />
    );

    const slider = screen.getByRole('slider');

    fireEvent.change(slider, { target: { value: '75' } });
    fireEvent.touchEnd(slider);

    expect(onChangeEnd).toHaveBeenCalledWith(75);
  });

  it('should handle keyboard interactions', () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();

    render(
      <DebouncedSlider
        value={50}
        onChange={onChange}
        onChangeEnd={onChangeEnd}
        ariaLabel="Test slider"
      />
    );

    const slider = screen.getByRole('slider');

    fireEvent.change(slider, { target: { value: '75' } });
    fireEvent.keyUp(slider, { key: 'Enter' });

    expect(onChangeEnd).toHaveBeenCalledWith(75);

    fireEvent.change(slider, { target: { value: '80' } });
    fireEvent.keyUp(slider, { key: ' ' });

    expect(onChangeEnd).toHaveBeenCalledWith(80);
  });

  it('should display label and value', () => {
    render(
      <DebouncedSlider
        value={50}
        onChange={vi.fn()}
        label="Volume"
        showValue={true}
      />
    );

    expect(screen.getByText('Volume')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('should handle disabled state', () => {
    const onChange = vi.fn();

    render(
      <DebouncedSlider
        value={50}
        onChange={onChange}
        disabled={true}
        ariaLabel="Test slider"
      />
    );

    const slider = screen.getByRole('slider');
    expect(slider).toBeDisabled();
    expect(slider).toHaveAttribute('aria-disabled', 'true');

    fireEvent.change(slider, { target: { value: '75' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should sync with external value changes', () => {
    const { rerender } = render(
      <DebouncedSlider
        value={50}
        onChange={vi.fn()}
        ariaLabel="Test slider"
      />
    );

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('value', '50');

    // External value change
    rerender(
      <DebouncedSlider
        value={75}
        onChange={vi.fn()}
        ariaLabel="Test slider"
      />
    );

    expect(slider).toHaveAttribute('value', '75');
  });
});

describe('DebouncedNumberInput', () => {
  it('should render with initial value', () => {
    const onChange = vi.fn();
    render(
      <DebouncedNumberInput
        value={50}
        onChange={onChange}
        ariaLabel="Test input"
      />
    );

    const input = screen.getByRole('spinbutton', { name: 'Test input' });
    expect(input).toHaveValue(50);
  });

  it('should debounce onChange calls', async () => {
    const onChange = vi.fn();
    vi.useFakeTimers();

    render(
      <DebouncedNumberInput
        value={50}
        onChange={onChange}
        debounceMs={500}
        ariaLabel="Test input"
      />
    );

    const input = screen.getByRole('spinbutton');

    // Make rapid changes
    fireEvent.change(input, { target: { value: '60' } });
    fireEvent.change(input, { target: { value: '70' } });
    fireEvent.change(input, { target: { value: '80' } });

    // onChange should not be called immediately
    expect(onChange).not.toHaveBeenCalled();

    // Advance timers
    vi.advanceTimersByTime(500);

    // onChange should be called once with final value
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(80);

    vi.useRealTimers();
  });

  it('should handle empty values', () => {
    const onChange = vi.fn();
    vi.useFakeTimers();

    render(
      <DebouncedNumberInput
        value={50}
        onChange={onChange}
        debounceMs={100}
        ariaLabel="Test input"
      />
    );

    const input = screen.getByRole('spinbutton');

    fireEvent.change(input, { target: { value: '' } });
    vi.advanceTimersByTime(100);

    expect(onChange).toHaveBeenCalledWith('');

    vi.useRealTimers();
  });

  it('should call onChangeEnd on blur', () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();

    render(
      <DebouncedNumberInput
        value={50}
        onChange={onChange}
        onChangeEnd={onChangeEnd}
        ariaLabel="Test input"
      />
    );

    const input = screen.getByRole('spinbutton');

    fireEvent.change(input, { target: { value: '75' } });
    fireEvent.blur(input);

    expect(onChangeEnd).toHaveBeenCalledWith(75);
  });

  it('should call onChangeEnd on Enter key', () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();

    render(
      <DebouncedNumberInput
        value={50}
        onChange={onChange}
        onChangeEnd={onChangeEnd}
        ariaLabel="Test input"
      />
    );

    const input = screen.getByRole('spinbutton');

    fireEvent.change(input, { target: { value: '75' } });
    fireEvent.keyUp(input, { key: 'Enter' });

    expect(onChangeEnd).toHaveBeenCalledWith(75);
  });

  it('should respect min and max attributes', () => {
    render(
      <DebouncedNumberInput
        value={50}
        onChange={vi.fn()}
        min={10}
        max={90}
        ariaLabel="Test input"
      />
    );

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('min', '10');
    expect(input).toHaveAttribute('max', '90');
    expect(input).toHaveAttribute('aria-valuemin', '10');
    expect(input).toHaveAttribute('aria-valuemax', '90');
  });

  it('should handle disabled state', () => {
    const onChange = vi.fn();

    render(
      <DebouncedNumberInput
        value={50}
        onChange={onChange}
        disabled={true}
        ariaLabel="Test input"
      />
    );

    const input = screen.getByRole('spinbutton');
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('aria-disabled', 'true');

    fireEvent.change(input, { target: { value: '75' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should handle step attribute', () => {
    render(
      <DebouncedNumberInput
        value={50}
        onChange={vi.fn()}
        step={0.5}
        ariaLabel="Test input"
      />
    );

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('step', '0.5');
  });

  it('should sync with external value changes', () => {
    const { rerender } = render(
      <DebouncedNumberInput
        value={50}
        onChange={vi.fn()}
        ariaLabel="Test input"
      />
    );

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(50);

    // External value change
    rerender(
      <DebouncedNumberInput
        value={75}
        onChange={vi.fn()}
        ariaLabel="Test input"
      />
    );

    expect(input).toHaveValue(75);

    // Change to empty value
    rerender(
      <DebouncedNumberInput
        value={''}
        onChange={vi.fn()}
        ariaLabel="Test input"
      />
    );

    expect(input).toHaveValue(null);
  });
});