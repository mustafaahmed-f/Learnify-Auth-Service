/**
 * ONE-TIME / MANUAL MAINTENANCE: makes Clerk `publicMetadata.dbUserId` match the
 * Auth Service database user id for every user in the database.
 *
 * - Users are associated through `User.clerkId` (unique), never by email.
 * - Only `dbUserId` is written. Clerk deep-merges `publicMetadata`, so `roles`
 *   and every other metadata key are preserved.
 * - The database is only read, never modified.
 * - Pass `{ dryRun: true }` to report mismatches without writing anything.
 */
import { clerkClient, type User as ClerkApiUser } from '@clerk/express';
import { validRoles, type ClerkUser } from '@mustafahmed1997/learnify-backend';
import { prisma } from '../services/prismaClient.js';

/** Clerk's maximum page size for getUserList. */
const CLERK_LOOKUP_BATCH_SIZE = 100;

/** Delay between Clerk API calls to stay well below the backend API rate limit. */
const CLERK_CALL_DELAY_MS = 150;

/** Fallback wait when Clerk answers 429 without a Retry-After value. */
const RATE_LIMIT_FALLBACK_WAIT_MS = 10_000;

export type SyncStatus = 'SUCCESS' | 'PARTIAL_FAILURE' | 'FAILURE';

export type SyncIssue = {
    dbUserId: string;
    clerkId: string;
    reason: string;
};

export type SyncClerkDbUserIdsSummary = {
    status: SyncStatus;
    dryRun: boolean;
    /** Database users found. */
    total: number;
    /** Database users that went through the comparison step. */
    processed: number;
    /** Database users whose Clerk user was found by clerkId. */
    matched: number;
    /** Clerk users whose dbUserId was corrected (or would be, in dry run). */
    updated: number;
    alreadyCorrect: number;
    skipped: number;
    failed: number;
    updatedUsers: SyncIssue[];
    skippedUsers: SyncIssue[];
    failedUsers: SyncIssue[];
    /** Set when the whole run aborted, e.g. the database could not be read. */
    fatalError?: string;
};

type DbUserRef = { id: string; clerkId: string };

type UserMetadata = ClerkUser['userMetadata'];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Error text without request details or credentials. */
function describeError(error: unknown): string {
    const clerkErrors = (
        error as { errors?: { message?: string; code?: string }[] }
    )?.errors;
    if (Array.isArray(clerkErrors) && clerkErrors.length > 0) {
        return clerkErrors
            .map((e) => e.message ?? e.code ?? 'unknown Clerk error')
            .join('; ');
    }
    const status = (error as { status?: number })?.status;
    const message = error instanceof Error ? error.message : String(error);
    return status ? `HTTP ${status}: ${message}` : message;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasValidRoles(
    metadata: Record<string, unknown>
): metadata is UserMetadata {
    const roles = metadata.roles;
    return (
        Array.isArray(roles) &&
        roles.every((role) => (validRoles as readonly unknown[]).includes(role))
    );
}

/** Runs a Clerk call, retrying once if Clerk rate-limits it. */
async function withRateLimitRetry<T>(call: () => Promise<T>): Promise<T> {
    try {
        return await call();
    } catch (error) {
        const { status, retryAfter } = error as {
            status?: number;
            retryAfter?: number;
        };
        if (status !== 429) throw error;
        const waitMs = retryAfter
            ? retryAfter * 1000
            : RATE_LIMIT_FALLBACK_WAIT_MS;
        console.warn(`⏳ Clerk rate limit hit, retrying in ${waitMs}ms`);
        await sleep(waitMs);
        return call();
    }
}

export async function syncClerkDbUserIds(
    options: { dryRun?: boolean } = {}
): Promise<SyncClerkDbUserIdsSummary> {
    const dryRun = options.dryRun ?? false;
    const summary: SyncClerkDbUserIdsSummary = {
        status: 'SUCCESS',
        dryRun,
        total: 0,
        processed: 0,
        matched: 0,
        updated: 0,
        alreadyCorrect: 0,
        skipped: 0,
        failed: 0,
        updatedUsers: [],
        skippedUsers: [],
        failedUsers: [],
    };

    const skip = (user: DbUserRef, reason: string) => {
        summary.skipped++;
        summary.skippedUsers.push({
            dbUserId: user.id,
            clerkId: user.clerkId,
            reason,
        });
        console.warn(
            `⚠️ Skipped db user ${user.id} (clerk ${user.clerkId}): ${reason}`
        );
    };
    const fail = (user: DbUserRef, reason: string) => {
        summary.failed++;
        summary.failedUsers.push({
            dbUserId: user.id,
            clerkId: user.clerkId,
            reason,
        });
        console.error(
            `❌ Failed db user ${user.id} (clerk ${user.clerkId}): ${reason}`
        );
    };

    let dbUsers: DbUserRef[];
    try {
        dbUsers = await prisma.user.findMany({
            select: { id: true, clerkId: true },
            orderBy: { createdAt: 'asc' },
        });
    } catch (error) {
        summary.status = 'FAILURE';
        summary.fatalError = `Could not read users from the database: ${describeError(error)}`;
        return summary;
    }
    summary.total = dbUsers.length;

    for (
        let start = 0;
        start < dbUsers.length;
        start += CLERK_LOOKUP_BATCH_SIZE
    ) {
        const batch = dbUsers.slice(start, start + CLERK_LOOKUP_BATCH_SIZE);
        const lookupIds = batch.map((user) => user.clerkId).filter(Boolean);

        let clerkUsersById: Map<string, ClerkApiUser>;
        try {
            const { data } = await withRateLimitRetry(() =>
                clerkClient.users.getUserList({
                    userId: lookupIds,
                    limit: CLERK_LOOKUP_BATCH_SIZE,
                })
            );
            clerkUsersById = new Map(
                data.map((clerkUser) => [clerkUser.id, clerkUser])
            );
        } catch (error) {
            const reason = `Clerk lookup failed: ${describeError(error)}`;
            batch.forEach((user) => {
                summary.processed++;
                fail(user, reason);
            });
            continue;
        }
        await sleep(CLERK_CALL_DELAY_MS);

        for (const user of batch) {
            summary.processed++;

            if (!user.clerkId) {
                skip(user, 'database user has no clerkId');
                continue;
            }
            const clerkUser = clerkUsersById.get(user.clerkId);
            if (!clerkUser) {
                skip(user, 'no Clerk user exists with this clerkId');
                continue;
            }
            summary.matched++;

            const metadata: unknown = clerkUser.publicMetadata;
            if (!isPlainObject(metadata)) {
                skip(
                    user,
                    'Clerk publicMetadata is not an object, refusing to merge into it'
                );
                continue;
            }

            const currentDbUserId = metadata.dbUserId;
            if (currentDbUserId === user.id) {
                summary.alreadyCorrect++;
                continue;
            }

            if (!hasValidRoles(metadata)) {
                // Roles are never written by this utility, so fixing dbUserId does not
                // make them worse, but they need a separate look.
                console.warn(
                    `⚠️ Clerk user ${user.clerkId} has missing or invalid roles; leaving roles untouched`
                );
            }

            const previous =
                currentDbUserId === undefined
                    ? 'missing'
                    : JSON.stringify(currentDbUserId);

            if (dryRun) {
                summary.updated++;
                summary.updatedUsers.push({
                    dbUserId: user.id,
                    clerkId: user.clerkId,
                    reason: `would change dbUserId from ${previous}`,
                });
                console.log(
                    `🔎 [dry run] Would set dbUserId for clerk ${user.clerkId} (was ${previous})`
                );
                continue;
            }

            try {
                const updated = await withRateLimitRetry(() =>
                    clerkClient.users.updateUserMetadata(user.clerkId, {
                        publicMetadata: { dbUserId: user.id },
                    })
                );
                const written = (
                    updated.publicMetadata as Record<string, unknown>
                )?.dbUserId;
                if (written !== user.id) {
                    fail(
                        user,
                        'Clerk accepted the update but returned a different dbUserId'
                    );
                } else {
                    summary.updated++;
                    summary.updatedUsers.push({
                        dbUserId: user.id,
                        clerkId: user.clerkId,
                        reason: `dbUserId changed from ${previous}`,
                    });
                    console.log(
                        `✅ Updated dbUserId for clerk ${user.clerkId} (was ${previous})`
                    );
                }
            } catch (error) {
                fail(user, `Clerk update failed: ${describeError(error)}`);
            }
            await sleep(CLERK_CALL_DELAY_MS);
        }
    }

    if (summary.failed > 0) {
        summary.status =
            summary.failed === summary.total ? 'FAILURE' : 'PARTIAL_FAILURE';
    }
    return summary;
}
