/**
 * DEVELOPMENT-ONLY: synchronizes the test users in prisma/seed/users.data.ts
 * with both Clerk and the Auth Service MySQL database.
 *
 * Run with: npm run db:seed:users   (see prisma/seed/README.md)
 *
 * The script is idempotent and never deletes users. Clerk and MySQL cannot share
 * a transaction, so each step is written so that simply re-running the script
 * finishes whatever a previous run left incomplete.
 */
import 'dotenv/config';
import { clerkClient, type User as ClerkUser } from '@clerk/express';
import { validRoles } from '@mustafahmed1997/learnify-backend';
import { Role } from '../../src/generated/prisma/enums.js';
import { prisma } from '../../src/services/prismaClient.js';
import { getSeedUsers, type SeedUser } from './users.data.js';

/** Written to Clerk privateMetadata so the seed only ever touches accounts it created. */
const SEED_MARKER = 'learnify-auth-dev-seed';

/** Order used when writing roles, so metadata is stable between runs. */
const ROLE_ORDER = Object.values(Role);

/** Delay before the final verification, giving Clerk `user.created` webhooks time to land. */
const WEBHOOK_SETTLE_MS = 5000;

type SeedStep =
    | 'validate'
    | 'resolve-clerk-user'
    | 'create-clerk-user'
    | 'upsert-db-user'
    | 'sync-db-roles'
    | 'sync-clerk-metadata'
    | 'verify';

type SeedResult = {
    key: string;
    ok: boolean;
    step: SeedStep;
    clerkId?: string;
    dbUserId?: string;
    clerkCreated?: boolean;
    dbRoles?: Role[];
    metadataRoles?: Role[];
    message?: string;
};

class SeedError extends Error {
    constructor(
        public step: SeedStep,
        message: string
    ) {
        super(message);
    }
}

// ─── Guards & validation ────────────────────────────────────────────────────

function assertDevelopmentEnvironment() {
    if (process.env.NODE_ENV === 'production') {
        throw new Error("Refusing to seed: NODE_ENV is 'production'.");
    }
    // if (process.env.ALLOW_DEV_SEED !== 'true') {
    //     throw new Error(
    //         'Refusing to seed: set ALLOW_DEV_SEED=true to confirm this is a development environment.'
    //     );
    // }
    if (!process.env.CLERK_SECRET_KEY?.startsWith('sk_test_')) {
        throw new Error(
            'Refusing to seed: CLERK_SECRET_KEY must be a development key (sk_test_...).'
        );
    }

    // checkRole validates Clerk roles against the shared package, so both lists must agree.
    const prismaRoles = [...ROLE_ORDER].sort().join(',');
    const packageRoles = [...validRoles].sort().join(',');
    if (prismaRoles !== packageRoles) {
        throw new Error(
            `Prisma Role enum (${prismaRoles}) and validRoles (${packageRoles}) differ.`
        );
    }
}

const TEST_EMAIL =
    /(\+clerk_test@|@example\.(com|org|net)$|\.(test|example|invalid|localhost)$)/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Rejects bad seed data before any Clerk or database call is made. */
function validateSeedUsers(users: SeedUser[]) {
    const errors: string[] = [];
    const seen = {
        key: new Set<string>(),
        email: new Set<string>(),
        userName: new Set<string>(),
        clerkId: new Set<string>(),
    };

    const unique = (
        field: keyof typeof seen,
        value: string | undefined,
        key: string
    ) => {
        if (!value) return;
        const normalized = value.toLowerCase();
        if (seen[field].has(normalized))
            errors.push(`${key}: duplicate ${field} "${value}"`);
        seen[field].add(normalized);
    };

    for (const user of users) {
        unique('key', user.key, user.key);
        unique('email', user.email, user.key);
        unique('userName', user.userName, user.key);
        unique('clerkId', user.clerkId, user.key);

        if (user.roles.length === 0)
            errors.push(`${user.key}: at least one role is required`);
        for (const role of user.roles) {
            if (!ROLE_ORDER.includes(role)) {
                errors.push(
                    `${user.key}: invalid role "${role}" (allowed: ${ROLE_ORDER.join(', ')})`
                );
            }
        }
        if (new Set(user.roles).size !== user.roles.length) {
            errors.push(`${user.key}: duplicate roles`);
        }

        if (user.clerkId && !user.clerkId.startsWith('user_')) {
            errors.push(`${user.key}: clerkId must look like "user_..."`);
        }
        if (user.email && !EMAIL.test(user.email)) {
            errors.push(`${user.key}: invalid email "${user.email}"`);
        }

        if (user.kind === 'existing') {
            if (!user.clerkId) {
                errors.push(
                    `${user.key}: SEED_EXISTING_USER_CLERK_ID is required to identify the existing account`
                );
            }
        } else {
            if (!user.email) errors.push(`${user.key}: email is required`);
            else if (!TEST_EMAIL.test(user.email)) {
                errors.push(
                    `${user.key}: "${user.email}" is not a test address (use "+clerk_test@..." or an example/.test domain)`
                );
            }
            if (!user.userName)
                errors.push(`${user.key}: userName is required`);
        }
    }

    const password = process.env.SEED_USER_PASSWORD;
    if (password !== undefined && password.length < 8) {
        errors.push('SEED_USER_PASSWORD must be at least 8 characters');
    }

    if (errors.length > 0) {
        throw new SeedError(
            'validate',
            `Invalid seed data:\n  - ${errors.join('\n  - ')}`
        );
    }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function sortRoles(roles: Iterable<Role>): Role[] {
    return [...new Set(roles)].sort(
        (a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b)
    );
}

function sameRoles(a: Role[], b: Role[]) {
    return sortRoles(a).join(',') === sortRoles(b).join(',');
}

/** Reads roles from Clerk publicMetadata, ignoring anything that is not a valid role. */
function metadataRoles(user: ClerkUser): Role[] {
    const roles = (user.publicMetadata as { roles?: unknown })?.roles;
    if (!Array.isArray(roles)) return [];
    return sortRoles(
        roles.filter((role): role is Role => ROLE_ORDER.includes(role))
    );
}

function clerkEmails(user: ClerkUser): string[] {
    return user.emailAddresses.map((email) => email.emailAddress.toLowerCase());
}

/** Formats Clerk API errors (code + message only, never request data). */
function describeError(error: unknown): string {
    const clerkErrors = (
        error as {
            errors?: {
                code?: string;
                longMessage?: string;
                message?: string;
            }[];
        }
    )?.errors;
    if (Array.isArray(clerkErrors) && clerkErrors.length > 0) {
        return clerkErrors
            .map((e) => `${e.code}: ${e.longMessage ?? e.message}`)
            .join('; ');
    }
    return error instanceof Error ? error.message : String(error);
}

function isNotFound(error: unknown) {
    return (error as { status?: number })?.status === 404;
}

async function getClerkUserOrNull(clerkId: string): Promise<ClerkUser | null> {
    try {
        return await clerkClient.users.getUser(clerkId);
    } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
    }
}

// ─── Steps ──────────────────────────────────────────────────────────────────

/**
 * Finds the Clerk user for a seed entry, creating it only for managed users.
 * Never adopts an account this seed did not create.
 */
async function resolveClerkUser(
    seed: SeedUser
): Promise<{ user: ClerkUser; created: boolean }> {
    if (seed.kind === 'existing') {
        const user = await getClerkUserOrNull(seed.clerkId!);
        if (!user) {
            throw new SeedError(
                'resolve-clerk-user',
                `Clerk user ${seed.clerkId} not found. The existing user is never created by the seed.`
            );
        }
        if (
            seed.email &&
            !clerkEmails(user).includes(seed.email.toLowerCase())
        ) {
            throw new SeedError(
                'resolve-clerk-user',
                `Clerk user ${seed.clerkId} does not own SEED_EXISTING_USER_EMAIL. Refusing to continue.`
            );
        }
        return { user, created: false };
    }

    const assertOwnedBySeed = (user: ClerkUser) => {
        const marker = user.privateMetadata as {
            seededBy?: string;
            seedKey?: string;
        };
        if (marker?.seededBy !== SEED_MARKER || marker?.seedKey !== seed.key) {
            throw new SeedError(
                'resolve-clerk-user',
                `Clerk user ${user.id} (${seed.email}) was not created by this seed for "${seed.key}". ` +
                    `Use a different email, or mark it as the existing user instead.`
            );
        }
        if (!clerkEmails(user).includes(seed.email!.toLowerCase())) {
            throw new SeedError(
                'resolve-clerk-user',
                `Clerk user ${user.id} does not own ${seed.email}.`
            );
        }
    };

    if (seed.clerkId) {
        const user = await getClerkUserOrNull(seed.clerkId);
        if (!user)
            throw new SeedError(
                'resolve-clerk-user',
                `Configured Clerk user ${seed.clerkId} not found.`
            );
        assertOwnedBySeed(user);
        return { user, created: false };
    }

    const matches = await clerkClient.users.getUserList({
        emailAddress: [seed.email!],
        limit: 2,
    });
    if (matches.data.length > 1) {
        throw new SeedError(
            'resolve-clerk-user',
            `More than one Clerk user owns ${seed.email}. Refusing to guess.`
        );
    }
    if (matches.data.length === 1) {
        assertOwnedBySeed(matches.data[0]);
        return { user: matches.data[0], created: false };
    }

    const password = process.env.SEED_USER_PASSWORD;
    try {
        const user = await clerkClient.users.createUser({
            emailAddress: [seed.email!],
            username: seed.userName,
            firstName: seed.firstName,
            lastName: seed.lastName,
            ...(password ? { password } : { skipPasswordRequirement: true }),
            privateMetadata: { seededBy: SEED_MARKER, seedKey: seed.key },
            // dbUserId is added after the database row exists.
            publicMetadata: { roles: sortRoles(seed.roles) },
        });
        return { user, created: true };
    } catch (error) {
        throw new SeedError('create-clerk-user', describeError(error));
    }
}

/**
 * Upserts the Auth Service User by clerkId. Refuses when the email or userName
 * already belongs to a different Clerk account.
 */
async function upsertDbUser(seed: SeedUser, clerkUser: ClerkUser) {
    const existing = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
    });

    if (seed.kind === 'existing') {
        if (!existing) {
            throw new SeedError(
                'upsert-db-user',
                `No Auth Service user with clerkId ${clerkUser.id}. The existing user is never created by the seed.`
            );
        }
        // Profile fields of the existing user are left untouched.
        return existing;
    }

    const email = (
        clerkUser.primaryEmailAddress?.emailAddress ?? seed.email!
    ).toLowerCase();
    const userName = clerkUser.username ?? seed.userName!;

    if (!existing) {
        const conflict = await prisma.user.findFirst({
            where: { OR: [{ email }, { userName }] },
            select: { clerkId: true },
        });
        if (conflict) {
            throw new SeedError(
                'upsert-db-user',
                `A different Auth Service user (clerkId ${conflict.clerkId}) already uses ${email} or "${userName}".`
            );
        }
    }

    const profile = {
        email,
        userName,
        firstName: clerkUser.firstName ?? seed.firstName ?? '',
        lastName: clerkUser.lastName ?? seed.lastName ?? '',
        img: clerkUser.imageUrl ?? '',
    };

    return prisma.user.upsert({
        where: { clerkId: clerkUser.id },
        create: { clerkId: clerkUser.id, ...profile },
        update: profile,
    });
}

/**
 * Managed users: roles are made to match the seed exactly.
 * Existing user: configured roles are only added, never removed.
 */
async function syncDbRoles(seed: SeedUser, dbUserId: string): Promise<Role[]> {
    const desired = sortRoles(seed.roles);

    await prisma.$transaction([
        ...(seed.kind === 'managed'
            ? [
                  prisma.userRole.deleteMany({
                      where: { userId: dbUserId, role: { notIn: desired } },
                  }),
              ]
            : []),
        prisma.userRole.createMany({
            data: desired.map((role) => ({ userId: dbUserId, role })),
            skipDuplicates: true,
        }),
    ]);

    const rows = await prisma.userRole.findMany({
        where: { userId: dbUserId },
        select: { role: true },
    });
    return sortRoles(rows.map((row) => row.role));
}

/**
 * Writes `{ roles, dbUserId }` to Clerk publicMetadata, the shape read by checkRole
 * via the `userMetadata` session claim. updateUserMetadata merges, so other
 * publicMetadata keys are preserved. Skips the call when nothing changed.
 */
async function syncClerkMetadata(
    seed: SeedUser,
    clerkUser: ClerkUser,
    dbUserId: string,
    dbRoles: Role[]
): Promise<{ roles: Role[]; warning?: string }> {
    const current = metadataRoles(clerkUser);
    let roles = dbRoles;
    let warning: string | undefined;

    if (seed.kind === 'existing') {
        // Never strip roles from the existing account, even if MySQL lacks them.
        const clerkOnly = current.filter((role) => !dbRoles.includes(role));
        if (clerkOnly.length > 0) {
            roles = sortRoles([...dbRoles, ...clerkOnly]);
            warning = `Clerk grants ${clerkOnly.join(', ')} which MySQL does not; kept in Clerk. Add to SEED_EXISTING_USER_ROLES to persist in MySQL.`;
        }
    }

    const currentDbUserId = (clerkUser.publicMetadata as { dbUserId?: unknown })
        ?.dbUserId;
    if (sameRoles(current, roles) && currentDbUserId === dbUserId) {
        return { roles, warning };
    }

    try {
        await clerkClient.users.updateUserMetadata(clerkUser.id, {
            publicMetadata: { roles, dbUserId },
        });
    } catch (error) {
        throw new SeedError('sync-clerk-metadata', describeError(error));
    }
    return { roles, warning };
}

async function seedOneUser(seed: SeedUser): Promise<SeedResult> {
    const result: SeedResult = {
        key: seed.key,
        ok: false,
        step: 'resolve-clerk-user',
    };
    try {
        const { user: clerkUser, created } = await resolveClerkUser(seed);
        result.clerkId = clerkUser.id;
        result.clerkCreated = created;

        result.step = 'upsert-db-user';
        const dbUser = await upsertDbUser(seed, clerkUser);
        result.dbUserId = dbUser.id;

        result.step = 'sync-db-roles';
        result.dbRoles = await syncDbRoles(seed, dbUser.id);

        result.step = 'sync-clerk-metadata';
        const metadata = await syncClerkMetadata(
            seed,
            clerkUser,
            dbUser.id,
            result.dbRoles
        );
        result.metadataRoles = metadata.roles;
        result.message = metadata.warning;

        result.ok = true;
    } catch (error) {
        if (error instanceof SeedError) result.step = error.step;
        result.message =
            error instanceof SeedError ? error.message : describeError(error);
    }
    return result;
}

/**
 * Re-reads both systems after seeding. Catches drift caused by a Clerk
 * `user.created` webhook racing the seed for newly created users.
 */
async function verify(seed: SeedUser, result: SeedResult) {
    if (!result.ok || !result.clerkId || !result.dbUserId) return;
    try {
        const [clerkUser, rows] = await Promise.all([
            clerkClient.users.getUser(result.clerkId),
            prisma.userRole.findMany({
                where: { userId: result.dbUserId },
                select: { role: true },
            }),
        ]);
        const dbRoles = sortRoles(rows.map((row) => row.role));
        const clerkRoles = metadataRoles(clerkUser);
        const dbUserId = (clerkUser.publicMetadata as { dbUserId?: unknown })
            ?.dbUserId;

        const problems: string[] = [];
        if (seed.kind === 'managed' && !sameRoles(dbRoles, seed.roles))
            problems.push(`MySQL roles [${dbRoles}]`);
        if (!seed.roles.every((role) => dbRoles.includes(role)))
            problems.push(`MySQL missing configured roles`);
        if (!sameRoles(clerkRoles, result.metadataRoles ?? []))
            problems.push(`Clerk roles [${clerkRoles}]`);
        if (dbUserId !== result.dbUserId)
            problems.push(`Clerk dbUserId mismatch`);

        if (problems.length > 0) {
            result.ok = false;
            result.step = 'verify';
            result.message = `Drift detected (${problems.join(', ')}). Re-run the seed.`;
        }
    } catch (error) {
        result.ok = false;
        result.step = 'verify';
        result.message = describeError(error);
    }
}

// ─── Entry point ────────────────────────────────────────────────────────────

async function seedUsers(): Promise<void> {
    assertDevelopmentEnvironment();

    const seedUsers = getSeedUsers();
    validateSeedUsers(seedUsers);

    console.log(
        `🌱 Seeding ${seedUsers.length} development users (Clerk + MySQL)...`
    );

    // Sequential on purpose: keeps Clerk rate limits and log output predictable.
    const results: SeedResult[] = [];
    for (const seed of seedUsers) {
        const result = await seedOneUser(seed);
        results.push(result);
        console.log(
            result.ok
                ? `  ✅ ${seed.key}: ${result.clerkCreated ? 'created in Clerk' : 'found in Clerk'} (${result.clerkId}), roles [${result.dbRoles}]`
                : `  ❌ ${seed.key}: failed at "${result.step}" - ${result.message}`
        );
        if (result.ok && result.message)
            console.log(`  ⚠️  ${seed.key}: ${result.message}`);
    }

    if (results.some((result) => result.clerkCreated)) {
        await new Promise((resolve) => setTimeout(resolve, WEBHOOK_SETTLE_MS));
    }
    for (const [index, seed] of seedUsers.entries()) {
        await verify(seed, results[index]);
    }

    console.table(
        results.map((r) => ({
            key: r.key,
            status: r.ok ? 'ok' : `FAILED (${r.step})`,
            clerkId: r.clerkId ?? '-',
            dbUserId: r.dbUserId ?? '-',
            dbRoles: r.dbRoles?.join(',') ?? '-',
            clerkRoles: r.metadataRoles?.join(',') ?? '-',
        }))
    );

    const failed = results.filter((result) => !result.ok);
    if (failed.length > 0) {
        for (const result of failed)
            console.error(
                `❌ ${result.key} [${result.step}]: ${result.message}`
            );
        throw new Error(
            `${failed.length} seed user(s) failed. Fix the issue and re-run; completed steps are skipped safely.`
        );
    }

    console.log(
        '✅ Seed complete. Existing sessions keep their old role claims until a new session token is issued (sign out/in).'
    );
}

seedUsers()
    .catch((error) => {
        console.error(
            `❌ Seed aborted: ${error instanceof Error ? error.message : String(error)}`
        );
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
