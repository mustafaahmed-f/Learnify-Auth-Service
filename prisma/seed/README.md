# Development User Seed (Clerk + MySQL)

> ⚠️ **Development only.** This script creates real accounts in a Clerk
> **development** instance and writes to the Auth Service database. It refuses to
> run unless `ALLOW_DEV_SEED=true`, `NODE_ENV` is not `production`, and
> `CLERK_SECRET_KEY` is a `sk_test_...` key.

## Purpose

`seed-users.ts` makes six test identities exist **consistently** in both systems:

1. the Clerk user,
2. the Auth Service `User` row (linked by `clerkId`),
3. the `UserRole` rows,
4. Clerk `publicMetadata` = `{ roles, dbUserId }`, which the session-token template
   exposes as the `userMetadata` claim read by `checkAuth` / `checkRole`.

It reuses the app's Prisma client (`src/services/prismaClient.ts`, MariaDB adapter)
and the `clerkClient` from `@clerk/express`.

## Test identities

| Key             | Kind     | Default email                                 | Username            | Roles                  |
| --------------- | -------- | --------------------------------------------- | ------------------- | ---------------------- |
| `student-1`     | managed  | `learnify.student1+clerk_test@example.com`    | `seed_student_1`    | `STUDENT`              |
| `student-2`     | managed  | `learnify.student2+clerk_test@example.com`    | `seed_student_2`    | `STUDENT`              |
| `instructor-1`  | managed  | `learnify.instructor1+clerk_test@example.com` | `seed_instructor_1` | `STUDENT`,`INSTRUCTOR` |
| `instructor-2`  | managed  | `learnify.instructor2+clerk_test@example.com` | `seed_instructor_2` | `STUDENT`,`INSTRUCTOR` |
| `admin-1`       | managed  | `learnify.admin+clerk_test@example.com`       | `seed_admin`        | `ADMIN`                |
| `existing-user` | existing | from `SEED_EXISTING_USER_EMAIL` (optional)    | unchanged           | `SEED_EXISTING_USER_ROLES` (additive) |

Instructors keep `STUDENT` because becoming an instructor adds a role and never
replaces one (see `DECISIONS.md`, *Role Behavior*).

- **managed**: owned by the seed. Created in Clerk if missing and tagged with
  `privateMetadata: { seededBy: "learnify-auth-dev-seed", seedKey }`. Its MySQL
  roles are made to match the table **exactly**.
- **existing**: an account that already exists in both Clerk and MySQL. It is never
  created, deleted, or renamed, and its password is never changed. The configured
  roles are only **added**. Roles it already has in MySQL or Clerk are kept.

## Environment variables

Put these in `.env` (git-ignored). Never commit real values.

| Variable                       | Required | Description |
| ------------------------------ | -------- | ----------- |
| `ALLOW_DEV_SEED`               | yes      | Must be `true`. Pass it on the command line rather than keeping it in `.env`. |
| `CLERK_SECRET_KEY`             | yes      | Must be a development key (`sk_test_...`). Already used by the app. |
| `DATABASE_HOST/USER/PASSWORD/NAME` | yes  | Already used by the app's Prisma client. |
| `SEED_EXISTING_USER_CLERK_ID`  | yes      | Clerk ID (`user_...`) of the existing account. The seed refuses to run without it. |
| `SEED_EXISTING_USER_EMAIL`     | no       | Cross-check: the seed stops if that Clerk user does not own this email. |
| `SEED_EXISTING_USER_ROLES`     | no       | Comma-separated roles to ensure, default `STUDENT`. Example: `STUDENT,INSTRUCTOR`. |
| `SEED_USER_PASSWORD`           | no       | Password for **newly created** managed users (≥ 8 chars, not in a breach list). If unset, users are created without a password. |
| `SEED_<USER>_EMAIL`            | no       | Override an email. `<USER>` is `STUDENT_1`, `STUDENT_2`, `INSTRUCTOR_1`, `INSTRUCTOR_2`, `ADMIN`. It must be a test address (`+clerk_test@`, `example.com/org/net`, or a `.test`/`.example`/`.invalid` domain). |
| `SEED_<USER>_USERNAME`         | no       | Override a username. |
| `SEED_<USER>_CLERK_ID`         | no       | Pin a managed user to a known Clerk ID instead of looking it up by email. |

Invalid roles, duplicate emails/usernames/IDs, or a missing existing-user ID are
rejected **before** any Clerk or database call.

## Running

The dev database host (`mysql-dev`) only resolves inside the Docker network, so run
the seed in the dev container:

```bash
docker exec -e ALLOW_DEV_SEED=true -w /app authservice-auth-service-dev-1 npm run db:seed:users
```

If MySQL is reachable from your host, you can also run it directly. Set
`DATABASE_HOST=localhost` and use port 3307 first:

```bash
ALLOW_DEV_SEED=true npm run db:seed:users
```

The script exits with code `1` if any user fails.

## Passwords and sign-in

- Set `SEED_USER_PASSWORD` before the **first** run. The password is applied only
  when a managed user is created, and it is never printed.
- Sign in with the seeded email (or username) and that password.
- The default `+clerk_test` emails are Clerk test addresses. A development instance
  sends no real email to them, and any verification code is `424242`. This lets you
  use email-code sign-in if that strategy is enabled.
- To change a seeded user's password later, use the Clerk Dashboard. You can also
  delete the user in Clerk and re-run the seed; it will be recreated.
- The existing user's password is never read or changed.

## Clerk metadata sync

After the database is updated, the seed calls
`clerkClient.users.updateUserMetadata(id, { publicMetadata: { roles, dbUserId } })`.
This is the same shape the `user.created` webhook writes. `roles` are taken from
MySQL, which is the source of truth. The call is skipped when the metadata already
matches. `updateUserMetadata` merges the new values in, so any other
`publicMetadata` keys stay as they are.

**Session tokens are not refreshed by this.** A signed-in user keeps the old
`userMetadata` claim until Clerk issues a new session token. Sign out and back in
(or wait for the token to refresh) to see the new roles.

## Idempotency

Running the seed again is always safe:

- Clerk users are looked up by configured ID or email before creation, so no
  duplicates are created.
- `User` rows are upserted by `clerkId`.
- Roles use `createMany({ skipDuplicates: true })` and respect `@@unique([userId, role])`.
  For managed users, only that user's extra roles are deleted.
- Metadata is written only when it differs.
- Nothing is reset, truncated, or bulk-deleted.

## Partial failures

Clerk and MySQL cannot share a transaction, so each run picks up where the last one stopped:

| Failure                                   | What happens on re-run |
| ----------------------------------------- | ---------------------- |
| Clerk user created, MySQL failed          | Clerk user is found by email (the seed marker matches) and the DB sync completes. |
| MySQL ok, metadata update failed          | The metadata differs from the DB, so it is written again. |
| Email belongs to a Clerk account the seed did not create | The seed stops for that user. It never adopts or overwrites the account. |
| Email/username already used by a different DB user | The seed stops for that user. |
| Existing user not found in Clerk or MySQL | The seed stops for that user. It is never created. |

Each failure is logged as `<key> [<step>]: <reason>`. Passwords, keys, and tokens are never logged.

## Known limitations

- **Clerk unavailable**: Clerk steps fail per user and the DB is untouched for that
  user. Re-run when Clerk is back.
- **MySQL unavailable**: Clerk users may already have been created. Re-run once the
  DB is up. They are reused, not duplicated.
- **Webhook race**: creating a Clerk user fires `user.created`. If the dev server is
  reachable by Clerk, its handler tries to insert the same user. It normally runs
  after the seed and fails on the unique `clerkId`/`email`, which is harmless; it
  logs an error and Clerk retries the delivery. If the webhook runs first, it adds
  `STUDENT` and sets roles to `["STUDENT"]`. The seed waits briefly after creating
  users and then re-verifies both systems. If it reports **drift**, run it again.
- Clerk rate limits apply. Users are processed one at a time.
