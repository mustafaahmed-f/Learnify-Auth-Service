/**
 * DEVELOPMENT-ONLY: upserts the instructor requests in
 * prisma/seed/instructor-requests.data.ts for the existing seed users.
 *
 * Run with: npm run db:seed:instructor-requests   (see prisma/seed/README.md)
 *
 * Requires the users from `npm run db:seed:users` to already exist; it never
 * creates, changes or deletes users, and never deletes instructor requests.
 * Idempotent: requests are upserted by their fixed id, so re-running resets
 * them to the seeded state instead of duplicating them.
 */
import 'dotenv/config';
import {
    InstructorRequestStatus,
    Role,
} from '../../src/generated/prisma/enums.js';
import { prisma } from '../../src/services/prismaClient.js';
import {
    REVIEWER_USER_KEY,
    seedInstructorRequests,
    type SeedInstructorRequest,
} from './instructor-requests.data.js';
import { getSeedUsers, type SeedUser } from './users.data.js';

const ROLE_ORDER = Object.values(Role);

function sortRoles(roles: Iterable<Role>): Role[] {
    return [...new Set(roles)].sort(
        (a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b)
    );
}

// ─── Guards & validation ────────────────────────────────────────────────────

function assertDevelopmentEnvironment() {
    if (process.env.NODE_ENV === 'production') {
        throw new Error("Refusing to seed: NODE_ENV is 'production'.");
    }
}

/** Rejects inconsistent seed data before any database call is made. */
function validateSeedRequests(requests: SeedInstructorRequest[]) {
    const errors: string[] = [];
    const ids = new Set<string>();
    const pendingUsers = new Set<string>();

    for (const request of requests) {
        if (ids.has(request.id)) errors.push(`duplicate id "${request.id}"`);
        ids.add(request.id);

        const isPending = request.status === InstructorRequestStatus.PENDING;
        if (isPending && request.decidedAt) {
            errors.push(
                `${request.id}: PENDING request must not have decidedAt`
            );
        }
        if (!isPending && !request.decidedAt) {
            errors.push(
                `${request.id}: ${request.status} request needs decidedAt`
            );
        }
        if (request.decidedAt && request.decidedAt < request.createdAt) {
            errors.push(`${request.id}: decidedAt is before createdAt`);
        }
        if (isPending) {
            // pendingKey is unique per user.
            if (pendingUsers.has(request.userKey)) {
                errors.push(
                    `${request.userKey}: more than one PENDING request`
                );
            }
            pendingUsers.add(request.userKey);
        }
    }

    if (errors.length > 0) {
        throw new Error(`Invalid seed data:\n  - ${errors.join('\n  - ')}`);
    }
}

// ─── Steps ──────────────────────────────────────────────────────────────────

/**
 * Finds the database user for a seed user by its unique userName and checks
 * that its roles exactly match the roles in users.data.ts.
 */
async function resolveDbUser(seedUsers: SeedUser[], key: string) {
    const seed = seedUsers.find((user) => user.key === key);
    if (!seed?.userName) {
        throw new Error(`No managed seed user "${key}" in users.data.ts.`);
    }

    const user = await prisma.user.findUnique({
        where: { userName: seed.userName },
        select: { id: true, userName: true, roles: { select: { role: true } } },
    });
    if (!user) {
        throw new Error(
            `User "${seed.userName}" (${key}) not found. Run "npm run db:seed:users" first.`
        );
    }

    const roles = sortRoles(user.roles.map((row) => row.role));
    const expected = sortRoles(seed.roles);
    if (roles.join(',') !== expected.join(',')) {
        throw new Error(
            `User "${seed.userName}" (${key}) has roles [${roles}], expected [${expected}].`
        );
    }

    return user;
}

/**
 * Refuses to add requests next to ones the seed did not create: that would break
 * the two-request limit and the unique pendingKey of a PENDING request.
 */
async function assertNoForeignRequests(userIds: string[], seedIds: string[]) {
    const foreign = await prisma.instructorRequest.findMany({
        where: { userId: { in: userIds }, id: { notIn: seedIds } },
        select: {
            id: true,
            status: true,
            user: { select: { userName: true } },
        },
    });
    if (foreign.length > 0) {
        const list = foreign
            .map((r) => `${r.id} (${r.user.userName}, ${r.status})`)
            .join('\n  - ');
        throw new Error(
            `Target users already have instructor requests not created by this seed. ` +
                `Remove them yourself (e.g. cancel via the API) and re-run:\n  - ${list}`
        );
    }
}

// ─── Entry point ────────────────────────────────────────────────────────────

async function seedRequests(): Promise<void> {
    assertDevelopmentEnvironment();
    validateSeedRequests(seedInstructorRequests);

    const seedUsers = getSeedUsers();
    const userKeys = [...new Set(seedInstructorRequests.map((r) => r.userKey))];

    const usersByKey = new Map<string, { id: string; userName: string }>();
    for (const key of userKeys) {
        usersByKey.set(key, await resolveDbUser(seedUsers, key));
    }
    const reviewer = await resolveDbUser(seedUsers, REVIEWER_USER_KEY);

    const userIds = [...usersByKey.values()].map((user) => user.id);
    const seedIds = seedInstructorRequests.map((r) => r.id);
    await assertNoForeignRequests(userIds, seedIds);

    console.log(
        `🌱 Seeding ${seedInstructorRequests.length} instructor requests for ${userKeys.length} users...`
    );

    await prisma.$transaction(
        seedInstructorRequests.map((request) => {
            const userId = usersByKey.get(request.userKey)!.id;
            const isPending =
                request.status === InstructorRequestStatus.PENDING;
            const data = {
                userId,
                message: request.message,
                reviewMessage: request.reviewMessage ?? null,
                status: request.status,
                isEdited: false,
                createdAt: request.createdAt,
                updatedAt: request.decidedAt ?? request.createdAt,
                decidedAt: request.decidedAt ?? null,
                decidedBy: isPending ? null : reviewer.id,
                // Same rule as submitRequest: only a PENDING request holds the key.
                pendingKey: isPending ? userId : null,
            };
            return prisma.instructorRequest.upsert({
                where: { id: request.id },
                create: { id: request.id, ...data },
                update: data,
            });
        })
    );

    const rows = await prisma.instructorRequest.findMany({
        where: { userId: { in: userIds } },
        select: {
            id: true,
            status: true,
            createdAt: true,
            decidedAt: true,
            user: { select: { userName: true } },
        },
        orderBy: [{ userId: 'asc' }, { createdAt: 'asc' }],
    });
    console.table(
        rows.map((row) => ({
            userName: row.user.userName,
            id: row.id,
            status: row.status,
            createdAt: row.createdAt.toISOString(),
            decidedAt: row.decidedAt?.toISOString() ?? '-',
        }))
    );

    if (rows.length !== seedInstructorRequests.length) {
        throw new Error(
            `Expected ${seedInstructorRequests.length} requests for the target users, found ${rows.length}.`
        );
    }

    console.log('✅ Instructor request seed complete.');
}

seedRequests()
    .catch((error) => {
        console.error(
            `❌ Seed aborted: ${error instanceof Error ? error.message : String(error)}`
        );
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
