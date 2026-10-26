/**
 * DEVELOPMENT-ONLY instructor requests for the seed users in users.data.ts.
 *
 * Each request has a fixed `id`, which the seed upserts by, so re-running it
 * never creates duplicates. Dates are fixed (not relative to "now") so sorting
 * and date-filtering results stay the same between runs.
 *
 * Within each user, the REJECTED request comes first: a user can hold at most
 * two requests, cannot submit while one is PENDING, and must wait 10 days after
 * a rejection (see DECISIONS.md -> Instructor Request).
 */
import { InstructorRequestStatus } from '../../src/generated/prisma/enums.js';

export type SeedInstructorRequest = {
    /** Fixed primary key, used as the upsert key. */
    id: string;
    /** `key` of the owning user in users.data.ts. */
    userKey: string;
    status: InstructorRequestStatus;
    message: string;
    reviewMessage?: string;
    createdAt: Date;
    /** Required for APPROVED / REJECTED, absent for PENDING. */
    decidedAt?: Date;
};

/** `key` in users.data.ts of the admin recorded as `decidedBy`. */
export const REVIEWER_USER_KEY = 'admin-1';

export const seedInstructorRequests: SeedInstructorRequest[] = [
    // ─── student-1: REJECTED, then PENDING ───────────────────────────────────
    {
        id: 'seed_ir_student_1_rejected',
        userKey: 'student-1',
        status: InstructorRequestStatus.REJECTED,
        message:
            'Hi, I am a junior web developer and I would like to teach an introductory HTML & CSS course for complete beginners.',
        reviewMessage:
            'Thanks for applying. Please share a portfolio or sample lesson before re-applying.',
        createdAt: new Date('2026-08-03T09:15:00Z'),
        decidedAt: new Date('2026-08-06T14:00:00Z'),
    },
    {
        id: 'seed_ir_student_1_pending',
        userKey: 'student-1',
        status: InstructorRequestStatus.PENDING,
        message:
            'Re-applying with a portfolio: I have published three free HTML & CSS tutorials and a sample 20-minute lesson on Flexbox layouts.',
        createdAt: new Date('2026-09-14T11:30:00Z'),
    },

    // ─── student-2: REJECTED, then PENDING ───────────────────────────────────
    {
        id: 'seed_ir_student_2_rejected',
        userKey: 'student-2',
        status: InstructorRequestStatus.REJECTED,
        message:
            'I am a data analyst and would like to create a course on Excel pivot tables and dashboards.',
        reviewMessage:
            'The course scope is too narrow for now. Consider a broader data analysis curriculum.',
        createdAt: new Date('2026-08-10T08:00:00Z'),
        decidedAt: new Date('2026-08-14T16:45:00Z'),
    },
    {
        id: 'seed_ir_student_2_pending',
        userKey: 'student-2',
        status: InstructorRequestStatus.PENDING,
        message:
            'Updated proposal: a full "Data Analysis with Python and pandas" course covering cleaning, visualization and reporting, with a project in every module.',
        createdAt: new Date('2026-10-05T13:20:00Z'),
    },

    // ─── instructor-1: REJECTED, then APPROVED ───────────────────────────────
    {
        id: 'seed_ir_instructor_1_rejected',
        userKey: 'instructor-1',
        status: InstructorRequestStatus.REJECTED,
        message:
            'I would like to teach Node.js. I have been learning it for six months.',
        reviewMessage:
            'Please gain more hands-on experience and include details about your planned course outline.',
        createdAt: new Date('2026-06-02T10:00:00Z'),
        decidedAt: new Date('2026-06-05T12:30:00Z'),
    },
    {
        id: 'seed_ir_instructor_1_approved',
        userKey: 'instructor-1',
        status: InstructorRequestStatus.APPROVED,
        message:
            'Backend engineer with 4 years of Node.js and Express experience. Planned course: "Building REST APIs with Express and Prisma", 8 modules with a capstone project.',
        reviewMessage: 'Approved. Strong outline and relevant experience.',
        createdAt: new Date('2026-07-01T09:45:00Z'),
        decidedAt: new Date('2026-07-03T15:10:00Z'),
    },

    // ─── instructor-2: REJECTED, then APPROVED ───────────────────────────────
    {
        id: 'seed_ir_instructor_2_rejected',
        userKey: 'instructor-2',
        status: InstructorRequestStatus.REJECTED,
        message:
            'I want to teach graphic design but I have not decided which tools to cover yet.',
        reviewMessage:
            'Please define the tools, target audience and course structure before re-applying.',
        createdAt: new Date('2026-06-20T07:30:00Z'),
        decidedAt: new Date('2026-06-24T10:00:00Z'),
    },
    {
        id: 'seed_ir_instructor_2_approved',
        userKey: 'instructor-2',
        status: InstructorRequestStatus.APPROVED,
        message:
            'UI/UX designer with 5 years in product teams. Planned course: "UI Design Fundamentals in Figma" for beginners, covering layout, typography, components and prototyping.',
        reviewMessage: 'Approved. Clear audience and well-structured syllabus.',
        createdAt: new Date('2026-07-20T12:00:00Z'),
        decidedAt: new Date('2026-07-22T09:25:00Z'),
    },
];
