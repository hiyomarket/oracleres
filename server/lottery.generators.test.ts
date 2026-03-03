/**
 * lottery.generators.test.ts
 * Tests for BigLotto, Powerball, ThreeStar, FourStar number generators
 */
import { describe, it, expect } from 'vitest';
import {
  generateBigLottoNumbers,
  generatePowerballNumbers,
  generateThreeStarNumbers,
  generateFourStarNumbers,
} from './lib/lotteryAlgorithm';

const mockDate = new Date('2026-03-03T10:00:00');
const mockOptions = {
  weatherElement: 'fire',
  useWeather: true,
};

describe('generateBigLottoNumbers', () => {
  it('should return 6 main numbers and 1 special number', () => {
    const result = generateBigLottoNumbers(mockDate, mockOptions);
    expect(result.numbers).toHaveLength(6);
    expect(typeof result.specialNumber).toBe('number');
  });

  it('main numbers should be within 1-49 range', () => {
    const result = generateBigLottoNumbers(mockDate, mockOptions);
    result.numbers.forEach(n => {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(49);
    });
  });

  it('special number should be within 1-49 range', () => {
    const result = generateBigLottoNumbers(mockDate, mockOptions);
    expect(result.specialNumber).toBeGreaterThanOrEqual(1);
    expect(result.specialNumber).toBeLessThanOrEqual(49);
  });

  it('main numbers should be unique', () => {
    const result = generateBigLottoNumbers(mockDate, mockOptions);
    const unique = new Set(result.numbers);
    expect(unique.size).toBe(6);
  });

  it('should return recommendation text', () => {
    const result = generateBigLottoNumbers(mockDate, mockOptions);
    expect(typeof result.energyAnalysis.recommendation).toBe('string');
    expect(result.energyAnalysis.recommendation.length).toBeGreaterThan(0);
  });

  it('should return 3 sets', () => {
    const result = generateBigLottoNumbers(mockDate, mockOptions);
    expect(result.sets).toHaveLength(3);
  });

  it('each set should have 6 numbers and a special number', () => {
    const result = generateBigLottoNumbers(mockDate, mockOptions);
    result.sets.forEach(set => {
      expect(set.numbers).toHaveLength(6);
      expect(typeof set.specialNumber).toBe('number');
    });
  });
});

describe('generatePowerballNumbers', () => {
  it('should return 6 numbers and 1 power number', () => {
    const result = generatePowerballNumbers(mockDate, mockOptions);
    expect(result.numbers).toHaveLength(6);
    expect(typeof result.powerNumber).toBe('number');
  });

  it('first zone numbers should be within 1-38 range', () => {
    const result = generatePowerballNumbers(mockDate, mockOptions);
    result.numbers.forEach(n => {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(38);
    });
  });

  it('power number should be within 1-8 range', () => {
    const result = generatePowerballNumbers(mockDate, mockOptions);
    expect(result.powerNumber).toBeGreaterThanOrEqual(1);
    expect(result.powerNumber).toBeLessThanOrEqual(8);
  });

  it('first zone numbers should be unique', () => {
    const result = generatePowerballNumbers(mockDate, mockOptions);
    const unique = new Set(result.numbers);
    expect(unique.size).toBe(6);
  });

  it('should return sets with correct structure', () => {
    const result = generatePowerballNumbers(mockDate, mockOptions);
    expect(result.sets).toHaveLength(3);
    result.sets.forEach(set => {
      expect(set.numbers).toHaveLength(6);
      expect(typeof set.powerNumber).toBe('number');
    });
  });
});

describe('generateThreeStarNumbers', () => {
  it('should return a 3-digit straight string', () => {
    const result = generateThreeStarNumbers(mockDate, mockOptions);
    expect(result.straight).toMatch(/^\d{3}$/);
  });

  it('should return 3 digits and box numbers', () => {
    const result = generateThreeStarNumbers(mockDate, mockOptions);
    expect(result.digits).toHaveLength(3);
    expect(Array.isArray(result.boxNumbers)).toBe(true);
  });

  it('straight number should be in 000-999 range', () => {
    const result = generateThreeStarNumbers(mockDate, mockOptions);
    const num = parseInt(result.straight, 10);
    expect(num).toBeGreaterThanOrEqual(0);
    expect(num).toBeLessThanOrEqual(999);
  });

  it('should return recommendation text', () => {
    const result = generateThreeStarNumbers(mockDate, mockOptions);
    expect(typeof result.energyAnalysis.recommendation).toBe('string');
    expect(result.energyAnalysis.recommendation.length).toBeGreaterThan(0);
  });

  it('should return 3 sets', () => {
    const result = generateThreeStarNumbers(mockDate, mockOptions);
    expect(result.sets).toHaveLength(3);
  });
});

describe('generateFourStarNumbers', () => {
  it('should return a 4-digit straight string', () => {
    const result = generateFourStarNumbers(mockDate, mockOptions);
    expect(result.straight).toMatch(/^\d{4}$/);
  });

  it('should return 4 digits array', () => {
    const result = generateFourStarNumbers(mockDate, mockOptions);
    expect(result.digits).toHaveLength(4);
  });

  it('straight number should be in 0000-9999 range', () => {
    const result = generateFourStarNumbers(mockDate, mockOptions);
    const num = parseInt(result.straight, 10);
    expect(num).toBeGreaterThanOrEqual(0);
    expect(num).toBeLessThanOrEqual(9999);
  });

  it('should return recommendation text', () => {
    const result = generateFourStarNumbers(mockDate, mockOptions);
    expect(typeof result.energyAnalysis.recommendation).toBe('string');
    expect(result.energyAnalysis.recommendation.length).toBeGreaterThan(0);
  });

  it('should return 3 sets', () => {
    const result = generateFourStarNumbers(mockDate, mockOptions);
    expect(result.sets).toHaveLength(3);
  });
});
