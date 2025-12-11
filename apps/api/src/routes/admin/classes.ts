import { Hono } from "hono";
import { db } from "../../db";
import { classes, classMeetings } from "../../db/schema";
import { eq, desc, and } from "drizzle-orm";
import { adminAuth, requirePermission } from "../../middleware/adminAuth";
import { logActivity, getClientIp, getUserAgent } from "../../utils/activityLogger";

const adminClassesRouter = new Hono();
adminClassesRouter.use("/*", adminAuth);

// Get all classes
adminClassesRouter.get("/", requirePermission("class.list"), async (c) => {
  const allClasses = await db
    .select()
    .from(classes)
    .orderBy(desc(classes.createdAt));

  return c.json({ success: true, data: allClasses });
});

// Get single class with meetings
adminClassesRouter.get("/:id", requirePermission("class.view"), async (c) => {
  const id = parseInt(c.req.param("id"));

  const [classData] = await db
    .select()
    .from(classes)
    .where(eq(classes.id, id))
    .limit(1);

  if (!classData) {
    return c.json({ error: "Class not found" }, 404);
  }

  const meetings = await db
    .select()
    .from(classMeetings)
    .where(eq(classMeetings.classId, id))
    .orderBy(desc(classMeetings.meetingTime));

  return c.json({
    success: true,
    data: {
      ...classData,
      meetings,
    },
  });
});

// Create class
adminClassesRouter.post("/", requirePermission("class.create"), async (c) => {
  const admin = c.get("admin");
  const data = await c.req.json();

  const result = await db.insert(classes).values({
    title: data.title,
    description: data.description,
    thumbnail: data.thumbnail,
    category: data.category,
    active: data.active !== undefined ? data.active : true,
    createdBy: admin.adminId,
  });

  // Get the inserted ID (MySQL doesn't support returningId)
  const [inserted] = await db
    .select()
    .from(classes)
    .where(eq(classes.createdBy, admin.adminId))
    .orderBy(desc(classes.createdAt))
    .limit(1);

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.create_class",
    metadata: { classId: inserted.id },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({ success: true, data: { id: inserted.id } });
});

// Update class
adminClassesRouter.put("/:id", requirePermission("class.update"), async (c) => {
  const admin = c.get("admin");
  const id = parseInt(c.req.param("id"));
  const data = await c.req.json();

  await db.update(classes).set(data).where(eq(classes.id, id));

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.update_class",
    metadata: { classId: id },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({ success: true });
});

// Delete class
adminClassesRouter.delete("/:id", requirePermission("class.delete"), async (c) => {
  const admin = c.get("admin");
  const id = parseInt(c.req.param("id"));

  // Delete meetings first
  await db.delete(classMeetings).where(eq(classMeetings.classId, id));

  // Delete class
  await db.delete(classes).where(eq(classes.id, id));

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.delete_class",
    metadata: { classId: id },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({ success: true });
});

// Create class meeting
adminClassesRouter.post("/:id/meetings", requirePermission("class.create"), async (c) => {
  const admin = c.get("admin");
  const classId = parseInt(c.req.param("id"));
  const data = await c.req.json();

  const result = await db.insert(classMeetings).values({
    classId,
    meetingTitle: data.meetingTitle,
    meetingTime: new Date(data.meetingTime),
    meetingUrl: data.meetingUrl,
    meetingPassword: data.meetingPassword,
    meetingImage: data.meetingImage,
    speaker: data.speaker || null,
    description: data.description || null,
    createdBy: admin.adminId,
  });

  const [inserted] = await db
    .select()
    .from(classMeetings)
    .where(and(eq(classMeetings.classId, classId), eq(classMeetings.createdBy, admin.adminId)))
    .orderBy(desc(classMeetings.createdAt))
    .limit(1);

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.create_class_meeting",
    metadata: { classId, meetingId: inserted.id },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({ success: true, data: { id: inserted.id } });
});

// Update class meeting
adminClassesRouter.put("/meetings/:meetingId", requirePermission("class.update"), async (c) => {
  const admin = c.get("admin");
  const meetingId = parseInt(c.req.param("meetingId"));
  const data = await c.req.json();

  const updateData: any = {};
  if (data.meetingTitle) updateData.meetingTitle = data.meetingTitle;
  if (data.meetingTime) updateData.meetingTime = new Date(data.meetingTime);
  if (data.meetingUrl) updateData.meetingUrl = data.meetingUrl;
  if (data.meetingPassword) updateData.meetingPassword = data.meetingPassword;
  if (data.meetingImage !== undefined) updateData.meetingImage = data.meetingImage;
  if (data.speaker !== undefined) updateData.speaker = data.speaker;
  if (data.description !== undefined) updateData.description = data.description;

  await db.update(classMeetings).set(updateData).where(eq(classMeetings.id, meetingId));

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.update_class_meeting",
    metadata: { meetingId },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({ success: true });
});

// Delete class meeting
adminClassesRouter.delete("/meetings/:meetingId", requirePermission("class.delete"), async (c) => {
  const admin = c.get("admin");
  const meetingId = parseInt(c.req.param("meetingId"));

  await db.delete(classMeetings).where(eq(classMeetings.id, meetingId));

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.delete_class_meeting",
    metadata: { meetingId },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({ success: true });
});

export default adminClassesRouter;

