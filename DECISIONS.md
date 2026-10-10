# Auth service Architecture Decisions

---

<a id="table-of-contents"></a>

## Table of Contents

1. [Instructor Request](#1-instructor-request)

---

# 1. Instructor Request

## Purpose

The Instructor Request allows eligible students to apply to become instructors.

Instructor requests are owned and managed by the Auth Service because they are part of the user's role/authorization lifecycle.

## Request Creation

- Only users with the `STUDENT` role can create an instructor request.
- A user cannot create another request while they currently have a `PENDING` request.
- A user can submit a maximum of **two instructor requests in total**.
- After a request is rejected, the user must wait at least **10 days from the rejection time** before submitting another request.
- If the user has already used both attempts, no additional instructor request can be created.
- Admins can block a user from submitting future instructor requests. This restriction belongs to the User domain rather than the InstructorRequest model.

## Request Editing

- Only the request owner can edit their request.
- A request can only be edited while its status is `PENDING`.
- `APPROVED` and `REJECTED` requests are immutable.
- Editing a request sets `isEdited` to `true`.
- `updatedAt` tracks the latest modification time but is not used to calculate the rejection cooldown.

## Request Review

- Only users with the `ADMIN` role can review instructor requests.
- Admins can approve or reject a request only while its status is `PENDING`.
- A reviewed request cannot transition to another status.
- The request stores the reviewing admin and review timestamp.
- The request stores an optional review message for the admin's decision.
- When a request is rejected, `rejectedAt` records the exact time from which the 10-day cooldown is calculated.

## Request Lifecycle

PENDING → APPROVED

PENDING → REJECTED

No other status transitions are allowed.

## Instructor Approval

When an admin approves an instructor request:

1. The user's `INSTRUCTOR` role is added.
2. Existing roles are preserved; becoming an instructor does not remove the `STUDENT` role.
3. The instructor request is marked as `APPROVED`.
4. An outbox event is created in the same database transaction.
5. The Auth Service attempts to synchronize the user's roles with Clerk immediately.
6. If Clerk synchronization fails, the outbox event remains pending and is retried by the background worker.
7. The Instructor Service is notified through the event-driven architecture and can create the instructor profile.
8. Auth Service does not directly depend on the Instructor Service as part of the database transaction.

## Rejection

When an admin rejects an instructor request:

1. The request status becomes `REJECTED`.
2. `rejectedAt` is set.
3. `reviewedAt` and `reviewedBy` are recorded.
4. The optional `reviewMessage` can contain the admin's explanation.
5. The user cannot submit another request until at least 10 days have passed from `rejectedAt`, provided the user has not already used both attempts.

## Role Behavior

Instructor approval adds the `INSTRUCTOR` role rather than replacing existing roles.

For example:

STUDENT → STUDENT + INSTRUCTOR

The user retains student capabilities after becoming an instructor.

---
