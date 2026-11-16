import { EnrollmentStatus } from '../types';

export class InvalidEnrollmentTransitionError extends Error {
  public fromStatus: EnrollmentStatus | null;
  public toStatus: EnrollmentStatus;

  constructor(fromStatus: EnrollmentStatus | null, toStatus: EnrollmentStatus, message?: string) {
    super(
      message ||
        `Invalid enrollment status transition from '${fromStatus || 'none'}' to '${toStatus}'.`
    );
    this.name = 'InvalidEnrollmentTransitionError';
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
  }
}

/**
 * Valid enrollment state transitions:
 *
 * (Not Enrolled) --> [enrolled]
 *
 * [enrolled]     --> [paused]      (take a break from daily queue)
 * [enrolled]     --> [completed]   (finished course curriculum)
 * [enrolled]     --> [withdrawn]   (drop course without losing history)
 *
 * [paused]       --> [enrolled]    (resume active studies)
 * [paused]       --> [withdrawn]   (drop paused course)
 *
 * [completed]    --> [enrolled]    (revisit or continue maintenance reviews)
 *
 * [withdrawn]    --> [enrolled]    (re-enroll, retaining previous cards and history)
 */
export const VALID_TRANSITIONS: Record<
  string, // current status or 'none'
  EnrollmentStatus[]
> = {
  none: ['enrolled'],
  enrolled: ['paused', 'completed', 'withdrawn'],
  paused: ['enrolled', 'withdrawn'],
  completed: ['enrolled'],
  withdrawn: ['enrolled'],
};

export class EnrollmentStateMachine {
  /**
   * Checks if a transition from current status to target status is valid.
   */
  static canTransition(
    currentStatus: EnrollmentStatus | null,
    targetStatus: EnrollmentStatus
  ): { allowed: boolean; reason?: string } {
    if (currentStatus === targetStatus) {
      return {
        allowed: false,
        reason: `Student is already in status '${currentStatus}'. No state change needed.`,
      };
    }

    const key = currentStatus || 'none';
    const allowedTargets = VALID_TRANSITIONS[key] || [];

    if (!allowedTargets.includes(targetStatus)) {
      return {
        allowed: false,
        reason: `Cannot transition from '${key}' to '${targetStatus}'. Allowed target states are: ${allowedTargets.join(
          ', '
        ) || 'none'}.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Executes transition validation and returns target status, or throws an error.
   */
  static transition(
    currentStatus: EnrollmentStatus | null,
    targetStatus: EnrollmentStatus
  ): EnrollmentStatus {
    const check = this.canTransition(currentStatus, targetStatus);
    if (!check.allowed) {
      throw new InvalidEnrollmentTransitionError(currentStatus, targetStatus, check.reason);
    }
    return targetStatus;
  }

  /**
   * Returns human-readable action label for a transition
   */
  static getActionLabel(targetStatus: EnrollmentStatus): string {
    switch (targetStatus) {
      case 'enrolled':
        return 'Enroll / Resume Studies';
      case 'paused':
        return 'Pause Studies';
      case 'completed':
        return 'Mark Course Completed';
      case 'withdrawn':
        return 'Withdraw from Course';
    }
  }

  /**
   * Returns the list of valid next status actions for a given current status
   */
  static getAvailableTransitions(currentStatus: EnrollmentStatus | null): EnrollmentStatus[] {
    const key = currentStatus || 'none';
    return VALID_TRANSITIONS[key] || [];
  }
}
