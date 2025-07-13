import { describe, test, expect } from '@jest/globals';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to calculate subscale scores (same logic as before)
function calculateSubscaleScore(responses) {
  if (!responses || responses.length === 0) return 0.0;
  const sum = responses.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / responses.length) * 100) / 100;
}

describe('Vite Build and Data Validation', () => {
  test('should have valid YAML data structure', () => {
    const yamlPath = path.join(__dirname, '..', 'src', 'data', 'questions.yaml');
    expect(fs.existsSync(yamlPath)).toBe(true);

    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    const data = yaml.load(yamlContent);

    // Verify basic structure
    expect(data).toHaveProperty('questions');
    expect(data).toHaveProperty('subscales');
    expect(data).toHaveProperty('composite_scores');
    expect(data).toHaveProperty('likert_scale');

    // Verify questions
    expect(Array.isArray(data.questions)).toBe(true);
    expect(data.questions.length).toBe(19);

    // Verify likert scale
    expect(Array.isArray(data.likert_scale)).toBe(true);
    expect(data.likert_scale.length).toBe(6);
  });

  test('should calculate scores correctly', () => {
    const testCases = [
      [[1, 2, 3], 2.0],
      [[4, 5, 6], 5.0],
      [[6, 6, 6, 6, 6], 6.0],
      [[1, 1, 1, 1], 1.0],
      [[3, 4, 3, 4], 3.5],
    ];

    testCases.forEach(([responses, expected]) => {
      expect(calculateSubscaleScore(responses)).toBe(expected);
    });
  });

  test('should handle empty responses', () => {
    expect(calculateSubscaleScore([])).toBe(0.0);
  });

  test('should validate all questions are assigned to subscales', () => {
    const yamlPath = path.join(__dirname, '..', 'src', 'data', 'questions.yaml');
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    const data = yaml.load(yamlContent);

    // Get all question IDs from subscales
    const assignedQuestions = new Set();
    Object.values(data.subscales).forEach((subscale) => {
      subscale.questions.forEach((qid) => assignedQuestions.add(qid));
    });

    // Get all question IDs
    const allQuestions = new Set(data.questions.map((q) => q.id));

    // Verify match
    expect(assignedQuestions).toEqual(allQuestions);
  });

  test('should simulate complete quiz flow with scoring', () => {
    const yamlPath = path.join(__dirname, '..', 'src', 'data', 'questions.yaml');
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    const data = yaml.load(yamlContent);

    // Simulate user responses (all 4s)
    const responses = {};
    data.questions.forEach((q) => {
      responses[q.id] = 4;
    });

    // Calculate scores
    const subscaleScores = {};
    Object.entries(data.subscales).forEach(([key, subscale]) => {
      const questionResponses = subscale.questions.map((qid) => responses[qid]);
      const score = calculateSubscaleScore(questionResponses);
      subscaleScores[key] = score;
    });

    // Verify all scores are 4.0
    Object.values(subscaleScores).forEach((score) => {
      expect(score).toBe(4.0);
    });

    // Calculate composite scores
    const fsmComponents = ['fun_belief', 'initiative', 'reactivity'];
    const fsmScores = fsmComponents.map((key) => subscaleScores[key]);
    const funSeekingScore = calculateSubscaleScore(fsmScores);
    expect(funSeekingScore).toBe(4.0);

    // Calculate overall playfulness
    const playfulnessComponents = [
      funSeekingScore,
      subscaleScores.uninhibitedness,
      subscaleScores.spontaneity,
    ];
    const overallScore = calculateSubscaleScore(playfulnessComponents);
    expect(overallScore).toBe(4.0);
  });
});
