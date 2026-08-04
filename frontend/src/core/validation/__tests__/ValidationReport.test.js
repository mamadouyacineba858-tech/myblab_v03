import { describe, it, expect } from 'vitest';
import { ValidationReport } from '../ValidationReport.js';
import { ValidationProblem } from '../ValidationProblem.js';
import { LEVELS, STATUSES } from '../constants.js';

describe('ValidationReport', () => {
  it('should start with no problems', () => {
    const report = new ValidationReport();
    expect(report.getProblems()).toHaveLength(0);
    expect(report.getStatus()).toBe(STATUSES.OK);
  });

  it('should add a problem', () => {
    const report = new ValidationReport();
    const problem = new ValidationProblem({
      id: 'test',
      level: LEVELS.ERROR,
      message: 'Test error',
    });
    report.addProblem(problem);
    expect(report.getProblems()).toHaveLength(1);
  });

  it('should calculate ERROR status', () => {
    const report = new ValidationReport();
    report.addProblem(new ValidationProblem({
      id: 'test',
      level: LEVELS.ERROR,
      message: 'Error',
    }));
    expect(report.getStatus()).toBe(STATUSES.ERROR);
  });

  it('should calculate WARNING status', () => {
    const report = new ValidationReport();
    report.addProblem(new ValidationProblem({
      id: 'test',
      level: LEVELS.WARNING,
      message: 'Warning',
    }));
    expect(report.getStatus()).toBe(STATUSES.WARNING);
  });

  it('should calculate OK status (no problems)', () => {
    const report = new ValidationReport();
    expect(report.getStatus()).toBe(STATUSES.OK);
  });

  it('should return errors, warnings, infos separately', () => {
    const report = new ValidationReport();
    report.addProblem(new ValidationProblem({
      id: 'e1',
      level: LEVELS.ERROR,
      message: 'Error 1',
    }));
    report.addProblem(new ValidationProblem({
      id: 'w1',
      level: LEVELS.WARNING,
      message: 'Warning 1',
    }));
    report.addProblem(new ValidationProblem({
      id: 'i1',
      level: LEVELS.INFO,
      message: 'Info 1',
    }));

    expect(report.getErrors()).toHaveLength(1);
    expect(report.getWarnings()).toHaveLength(1);
    expect(report.getInfos()).toHaveLength(1);
  });

  it('should be serializable to JSON', () => {
    const report = new ValidationReport();
    report.addProblem(new ValidationProblem({
      id: 'test',
      level: LEVELS.ERROR,
      message: 'Test error',
      explanation: 'Test explanation',
      suggestion: 'Test suggestion',
    }));

    const json = report.toJSON();
    expect(json.status).toBe(STATUSES.ERROR);
    expect(json.errors).toHaveLength(1);
    expect(json.warnings).toHaveLength(0);
    expect(json.infos).toHaveLength(0);
    expect(json.total).toBe(1);
  });

  it('isValid should be true for OK or WARNING', () => {
    const okReport = new ValidationReport();
    expect(okReport.isValid()).toBe(true);

    const warningReport = new ValidationReport();
    warningReport.addProblem(new ValidationProblem({
      id: 'w1',
      level: LEVELS.WARNING,
      message: 'Warning',
    }));
    expect(warningReport.isValid()).toBe(true);

    const errorReport = new ValidationReport();
    errorReport.addProblem(new ValidationProblem({
      id: 'e1',
      level: LEVELS.ERROR,
      message: 'Error',
    }));
    expect(errorReport.isValid()).toBe(false);
  });
});
