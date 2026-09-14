import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Chamada pelo pg_cron a cada 15 minutos (job talki-check-deadline-alerts,
// migration 20260914113005_task_email_alerts.sql). Não é uma rota pública:
// autentica via x-webhook-secret, não verify_jwt.
//
// tasks.prazo é `date` (sem hora). Por decisão do usuário, o prazo vence
// às 23:59 America/Sao_Paulo do dia marcado — e como o Brasil não observa
// mais horário de verão, esse fuso é um offset fixo (-03:00), então dá
// pra montar o instante exato sem lib de timezone.

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

function formatDeadlineBR(prazoIso: string): string {
  const [year, month, day] = prazoIso.split("-");
  return `${day}/${month}/${year}`;
}

interface DueTask {
  id: string;
  titulo: string;
  plan_id: string;
  prazo: string;
  plans: { nome: string } | null;
}

interface AssigneeRow {
  task_id: string;
  profiles: { nome: string | null; email: string | null } | null;
}

const WINDOWS = [
  { hours: 12, flagColumn: "alerta_12h_enviado" as const, label: "12h" },
  { hours: 1, flagColumn: "alerta_1h_enviado" as const, label: "1h" },
];

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("CRON_WEBHOOK_SECRET")) {
    return unauthorized();
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = Date.now();
  const summary: Record<string, { tasks: number; emails: number; failures: number }> = {};

  for (const w of WINDOWS) {
    const { data: candidates, error } = await supabase
      .from("tasks")
      .select("id, titulo, plan_id, prazo, plans(nome)")
      .not("prazo", "is", null)
      .neq("status", "concluida")
      .eq(w.flagColumn, false);

    if (error) {
      console.error(`check-deadline-alerts: erro buscando candidatos (${w.label})`, error);
      summary[w.label] = { tasks: 0, emails: 0, failures: 0 };
      continue;
    }

    const windowMs = w.hours * 60 * 60 * 1000;
    const due = ((candidates ?? []) as unknown as DueTask[]).filter((t) => {
      const deadline = new Date(`${t.prazo}T23:59:00-03:00`).getTime();
      return deadline >= now && deadline <= now + windowMs;
    });

    let emailsSent = 0;
    let failures = 0;

    if (due.length > 0) {
      const taskIds = due.map((t) => t.id);
      const { data: assigneeRows, error: assigneeError } = await supabase
        .from("task_assignees")
        .select("task_id, profiles(nome, email)")
        .in("task_id", taskIds);

      if (assigneeError) {
        console.error(`check-deadline-alerts: erro buscando responsáveis (${w.label})`, assigneeError);
      }

      const assigneesByTask = new Map<string, AssigneeRow["profiles"][]>();
      for (const row of (assigneeRows ?? []) as unknown as AssigneeRow[]) {
        const list = assigneesByTask.get(row.task_id) ?? [];
        list.push(row.profiles);
        assigneesByTask.set(row.task_id, list);
      }

      for (const task of due) {
        const assignees = assigneesByTask.get(task.id) ?? [];
        const planName = task.plans?.nome ?? "um projeto";
        const link = `${SITE_URL}/tarefas/${task.plan_id}?tarefa=${task.id}`;
        const prazoFormatado = formatDeadlineBR(task.prazo);
        let taskFailures = 0;

        for (const assignee of assignees) {
          if (!assignee?.email) continue;
          const html = emailShell(
            `Vence em ${w.label}: ${task.titulo}`,
            `<p style="margin:0 0 12px;">Oi, ${assignee.nome || assignee.email}.</p>
             <p style="margin:0 0 12px;">A tarefa <strong>${task.titulo}</strong>, no projeto <strong>${planName}</strong>, vence em <strong>${prazoFormatado}</strong> (fim do dia, horário de Brasília).</p>`,
            "Ver tarefa",
            link,
          );
          try {
            await sendEmail(assignee.email, `Vence em ${w.label}: ${task.titulo}`, html);
            emailsSent++;
          } catch (err) {
            failures++;
            taskFailures++;
            console.error(`check-deadline-alerts: falha ao enviar pra ${assignee.email}`, err);
          }
        }

        // Só marca "enviado" se ninguém falhou: uma falha sistêmica (chave
        // ausente, Resend fora do ar) não pode marcar a tarefa como
        // notificada e perder o alerta pra sempre — melhor arriscar um
        // reenvio duplicado pra quem já recebeu do que nunca mais tentar
        // de novo pra quem não recebeu.
        if (taskFailures === 0) {
          const { error: updateError } = await supabase
            .from("tasks")
            .update({ [w.flagColumn]: true })
            .eq("id", task.id);
          if (updateError) {
            console.error(`check-deadline-alerts: falha ao marcar ${w.flagColumn}`, task.id, updateError);
          }
        }
      }
    }

    summary[w.label] = { tasks: due.length, emails: emailsSent, failures };
  }

  return new Response(JSON.stringify({ ok: true, summary }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
