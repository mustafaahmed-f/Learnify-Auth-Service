/**
 * DEVELOPMENT-ONLY seed identities.
 *
 * Every value here is either a clearly fake placeholder or read from the
 * environment. Never put real people, real inboxes or credentials in this file.
 *
 * See prisma/seed/README.md for the full list of environment variables.
 */
import { Role } from '../../src/generated/prisma/enums.js';

/**
 * - "managed"  : a dedicated test account owned by this seed. Created in Clerk
 *                if missing, and its roles are made to match `roles` exactly.
 * - "existing" : an account that already exists in BOTH Clerk and MySQL.
 *                Never created, never deleted, password and profile untouched.
 *                `roles` are only ever ADDED; roles it already has are kept.
 */
export type SeedUserKind = 'managed' | 'existing';

export type SeedUser = {
    /** Stable seed identifier, stored in Clerk privateMetadata for managed users. */
    key: string;
    kind: SeedUserKind;
    /** Optional for managed users, required for the existing user. */
    clerkId?: string;
    /** Required for managed users; optional cross-check for the existing user. */
    email?: string;
    userName?: string;
    firstName?: string;
    lastName?: string;
    roles: Role[];
};

function env(name: string): string | undefined {
    const value = process.env[name]?.trim();
    return value ? value : undefined;
}

/** Parses a comma separated role list, e.g. "STUDENT,INSTRUCTOR". Validation happens in seed-users.ts. */
function envRoles(name: string, fallback: Role[]): Role[] {
    const value = env(name);
    if (!value) return fallback;
    return value
        .split(',')
        .map((role) => role.trim().toUpperCase())
        .filter(Boolean) as Role[];
}

/**
 * Default emails use Clerk's `+clerk_test` sub-address, which Clerk development
 * instances treat as test emails (no real email is sent, verification code is 424242).
 */
function managedUser(
    key: string,
    envPrefix: string,
    defaults: {
        email: string;
        userName: string;
        firstName: string;
        lastName: string;
    },
    roles: Role[]
): SeedUser {
    return {
        key,
        kind: 'managed',
        clerkId: env(`${envPrefix}_CLERK_ID`),
        email: env(`${envPrefix}_EMAIL`) ?? defaults.email,
        userName: env(`${envPrefix}_USERNAME`) ?? defaults.userName,
        firstName: defaults.firstName,
        lastName: defaults.lastName,
        roles,
    };
}

export function getSeedUsers(): SeedUser[] {
    return [
        managedUser(
            'student-1',
            'SEED_STUDENT_1',
            {
                email: 'learnify.student1+clerk_test@example.com',
                userName: 'seed_student_1',
                firstName: 'Seed',
                lastName: 'Student One',
            },
            [Role.STUDENT]
        ),
        managedUser(
            'student-2',
            'SEED_STUDENT_2',
            {
                email: 'learnify.student2+clerk_test@example.com',
                userName: 'seed_student_2',
                firstName: 'Seed',
                lastName: 'Student Two',
            },
            [Role.STUDENT]
        ),
        managedUser(
            'instructor-1',
            'SEED_INSTRUCTOR_1',
            {
                email: 'learnify.instructor1+clerk_test@example.com',
                userName: 'seed_instructor_1',
                firstName: 'Seed',
                lastName: 'Instructor One',
            },
            // Instructors keep the STUDENT role (see DECISIONS.md -> Role Behavior).
            [Role.STUDENT, Role.INSTRUCTOR]
        ),
        managedUser(
            'instructor-2',
            'SEED_INSTRUCTOR_2',
            {
                email: 'learnify.instructor2+clerk_test@example.com',
                userName: 'seed_instructor_2',
                firstName: 'Seed',
                lastName: 'Instructor Two',
            },
            [Role.STUDENT, Role.INSTRUCTOR]
        ),
        managedUser(
            'admin-1',
            'SEED_ADMIN',
            {
                email: 'learnify.admin+clerk_test@example.com',
                userName: 'seed_admin',
                firstName: 'Seed',
                lastName: 'Admin',
            },
            [Role.ADMIN]
        ),
        {
            key: 'existing-user',
            kind: 'existing',
            // Deliberately no default: the seed refuses to run without an explicit Clerk ID.
            clerkId: env('SEED_EXISTING_USER_CLERK_ID'),
            email: env('SEED_EXISTING_USER_EMAIL'),
            roles: envRoles('SEED_EXISTING_USER_ROLES', [Role.STUDENT]),
        },
    ];
}
