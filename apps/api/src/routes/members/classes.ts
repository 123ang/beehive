import { Hono } from "hono";
import { db } from "../../db";
import { classes, classMeetings } from "../../db/schema";
import { eq, desc, and, gte } from "drizzle-orm";

const memberClassesRouter = new Hono();

/**
 * Get active classes for enrollment
 * GET /api/members/classes
 */
memberClassesRouter.get("/", async (c) => {
  try {
    const allClasses = await db
      .select()
      .from(classes)
      .where(eq(classes.active, true))
      .orderBy(desc(classes.createdAt));

    // Get upcoming meetings for each class
    const classesWithMeetings = await Promise.all(
      allClasses.map(async (classItem) => {
        const upcomingMeetings = await db
          .select()
          .from(classMeetings)
          .where(
            and(
              eq(classMeetings.classId, classItem.id),
              gte(classMeetings.meetingTime, new Date())
            )
          )
          .orderBy(classMeetings.meetingTime)
          .limit(5);

        return {
          ...classItem,
          upcomingMeetings,
        };
      })
    );

    return c.json({
      success: true,
      data: classesWithMeetings,
    });
  } catch (error) {
    console.error("Get classes error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Get single class with all meetings
 * GET /api/members/classes/:id
 */
memberClassesRouter.get("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));

    const [classData] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, id))
      .limit(1);

    if (!classData) {
      return c.json({ error: "Class not found" }, 404);
    }

    // Get all meetings for this class
    const meetings = await db
      .select()
      .from(classMeetings)
      .where(eq(classMeetings.classId, id))
      .orderBy(classMeetings.meetingTime);

    return c.json({
      success: true,
      data: {
        ...classData,
        meetings,
      },
    });
  } catch (error) {
    console.error("Get class details error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default memberClassesRouter;

