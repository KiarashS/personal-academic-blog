import { describe, expect, it } from 'vitest';
import { actionFor, isTyping, step, SHORTCUTS } from '../lib/shortcuts';

describe('actionFor', () => {
  it('maps each documented key to its action', () => {
    for (const shortcut of SHORTCUTS) {
      expect(actionFor({ key: shortcut.keys })).toBe(shortcut.action);
    }
  });

  it('ignores a key that is not a shortcut', () => {
    expect(actionFor({ key: 'q' })).toBeUndefined();
    expect(actionFor({ key: 'Enter' })).toBeUndefined();
  });

  it('leaves browser and system combinations alone', () => {
    expect(actionFor({ key: 't', ctrlKey: true })).toBeUndefined();
    expect(actionFor({ key: 't', metaKey: true })).toBeUndefined();
    expect(actionFor({ key: '/', altKey: true })).toBeUndefined();
  });

  it('still answers for ?, which is typed with shift held', () => {
    expect(actionFor({ key: '?' })).toBe('help');
  });
});

describe('isTyping', () => {
  it('is true inside a field', () => {
    expect(isTyping({ tagName: 'INPUT' })).toBe(true);
    expect(isTyping({ tagName: 'textarea' })).toBe(true);
    expect(isTyping({ tagName: 'SELECT' })).toBe(true);
    expect(isTyping({ tagName: 'DIV', isContentEditable: true })).toBe(true);
  });

  it('is false in the page itself', () => {
    expect(isTyping({ tagName: 'BODY' })).toBe(false);
    expect(isTyping({ tagName: 'A' })).toBe(false);
    expect(isTyping(null)).toBe(false);
  });
});

describe('step', () => {
  const four = [0, 1, 2, 3];

  it('starts at the first item when nothing is focused', () => {
    expect(step(four, -1, 1)).toBe(0);
  });

  it('starts at the last item going backwards from nothing', () => {
    expect(step(four, -1, -1)).toBe(3);
  });

  it('moves one at a time', () => {
    expect(step(four, 1, 1)).toBe(2);
    expect(step(four, 1, -1)).toBe(0);
  });

  it('wraps at both ends', () => {
    expect(step(four, 3, 1)).toBe(0);
    expect(step(four, 0, -1)).toBe(3);
  });

  it('has nowhere to go in an empty list', () => {
    expect(step([], -1, 1)).toBe(-1);
  });
});
