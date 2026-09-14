import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Disparada por um trigger AFTER INSERT em task_assignees (net.http_post,
// ver migration 20260914113005_task_email_alerts.sql). Não é uma rota
// pública: autentica via x-webhook-secret, não verify_jwt (o chamador é
// Postgres via pg_net, não um usuário logado).

const SITE_URL = "https://talki.freneze.com.br";
const RESEND_FROM = "Talki <notificacoes@freneze.com.br>";

function unauthorized() {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function emailShell(title: string, bodyHtml: string, ctaLabel: string, ctaUrl: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f6fa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:28px 32px 0;">
                <span style="font-size:15px;font-weight:700;letter-spacing:-0.02em;color:#171922;">talki</span>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 8px;">
                <h1 style="margin:0;font-size:18px;font-weight:600;color:#171922;letter-spacing:-0.02em;">${title}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px;font-size:14px;line-height:22px;color:#4b5060;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <a href="${ctaUrl}" style="display:inline-block;background:#6554e8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 20px;border-radius:10px;">${ctaLabel}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY não configurada");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend ${res.status}: ${text}`);
  }
}

interface AssignmentPayload {
  task_id?: string;
  user_id?: string;
  assigned_by?: string | null;
}

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("CRON_WEBHOOK_SECRET")) {
    return unauthorized();
  }

  let payload: AssignmentPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), { status: 400 });
  }

  const { task_id, user_id, assigned_by } = payload;
  if (!task_id || !user_id) {
    return new Response(JSON.stringify({ error: "task_id and user_id required" }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const [{ data: task }, { data: recipient }] = await Promise.all([
    supabase.from("tasks").select("id, titulo, plan_id, plans(nome)").eq("id", task_id).maybeSingle(),
    supabase.from("profiles").select("id, nome, email").eq("id", user_id).maybeSingle(),
  ]);

  if (!task || !recipient?.email) {
    console.error("send-assignment-email: task ou destinatário sem e-mail", { task_id, user_id });
    return new Response(JSON.stringify({ skipped: true }), { status: 200 });
  }

  let assignedByName: string | null = null;
  if (assigned_by) {
    const { data: assigner } = await supabase
      .from("profiles")
      .select("nome, email")
      .eq("id", assigned_by)
      .maybeSingle();
    assignedByName = assigner?.nome || assigner?.email || null;
  }

  const planName = (task as unknown as { plans: { nome: string } | null }).plans?.nome ?? "um projeto";
  const link = `${SITE_URL}/tarefas/${task.plan_id}?tarefa=${task.id}`;
  const greetingName = recipient.nome || recipient.email;

  const html = emailShell(
    "Você foi adicionado a uma tarefa",
    `<p style="margin:0 0 12px;">Oi, ${greetingName}.</p>
     <p style="margin:0 0 12px;">${assignedByName ? `${assignedByName} te adicionou` : "Você foi adicionado"} como responsável por <strong>${task.titulo}</strong>, no projeto <strong>${planName}</strong>.</p>`,
    "Ver tarefa",
    link,
  );

  try {
    await sendEmail(recipient.email, `Você foi adicionado à tarefa: ${task.titulo}`, html);
  } catch (err) {
    console.error("send-assignment-email: falha ao enviar", err);
    return new Response(JSON.stringify({ error: "send failed", detail: String(err) }), { status: 200 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
