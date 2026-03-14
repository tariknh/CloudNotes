// @ts-nocheck
/* eslint-disable import/no-unresolved */
import { createClient } from "jsr:@supabase/supabase-js@2";

console.log("Hello from Functions!");

interface Notification {
  id: string;
  user_id: string;
  body: string;
  title?: string;
  description?: string;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Notification;
  schema: "public";
  old_record: null | Notification;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload & {
      new?: Notification;
      data?: { record?: Notification; new?: Notification };
      records?: Notification[];
    } = await req.json();
    const { table } = payload;
    const record =
      payload.record ||
      payload.new ||
      payload.data?.record ||
      payload.data?.new ||
      payload.records?.[0];

    if (!record) {
      return new Response("No record", { status: 200 });
    }

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("expo_push_token")
      .not("expo_push_token", "is", null);

    if (error) {
      console.error("Failed to load tokens", error);
      return new Response("Failed to load tokens", { status: 500 });
    }

    const tokens = (profiles || [])
      .map((profile) => profile.expo_push_token)
      .filter(Boolean);

    if (tokens.length === 0) {
      return new Response("No tokens found", { status: 200 });
    }

    const title = (record as { title?: string }).title;
    const baseBody =
      title ||
      record.body ||
      record.description ||
      (table === "notes" ? "New note added" : "New notification");
    const pushBody = table === "notes" ? `Nytt notat: ${baseBody}` : baseBody;

    const requests = [] as Promise<unknown>[];
    const chunkSize = 100;

    for (let i = 0; i < tokens.length; i += chunkSize) {
      const chunk = tokens.slice(i, i + chunkSize);
      requests.push(
        fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("EXPO_ACCESS_TOKEN")}`,
          },
          body: JSON.stringify(
            chunk.map((to) => ({
              to,
              sound: "default",
              body: pushBody,
              data: { record, table },
            })),
          ),
        }).then((res) => res.json()),
      );
    }

    const res = await Promise.all(requests);

    return new Response(JSON.stringify(res), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
