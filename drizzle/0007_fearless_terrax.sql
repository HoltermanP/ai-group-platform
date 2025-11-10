CREATE TABLE "project_tasks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_tasks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"taskId" varchar(50) NOT NULL,
	"projectId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(50) DEFAULT 'not_started',
	"priority" varchar(50) DEFAULT 'medium',
	"type" varchar(50) DEFAULT 'task',
	"startDate" timestamp,
	"endDate" timestamp,
	"plannedDuration" integer,
	"actualDuration" integer,
	"dependencies" text,
	"assignedTo" varchar(255),
	"assignedToName" varchar(255),
	"progress" integer DEFAULT 0,
	"completedAt" timestamp,
	"createdBy" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_tasks_taskId_unique" UNIQUE("taskId")
);
--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;