"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/auth/schemas";
import { audit } from "@/lib/audit";
import { decidirConviteDoSignup } from "@/lib/auth/convite-no-signup";
import { aplicarConvite } from "@/lib/auth/aplicar-convite";

export type UpdatePasswordResult = {
  ok: false;
  error:
    | "validation_error"
    | "session_expired"
    | "same_password"
    | "update_failed"
    | "mfa_required"
    | "mfa_invalid";
  details?: Record<string, unknown>;
};

/**
 * Define a nova senha dentro da sessão de recovery e a prova imediatamente
 * num login por senha. Só anuncia sucesso depois dessa segunda verificação.
 * A sessão verificada continua aberta para não devolver a pessoa ao mesmo
 * formulário de login que ela acabou de provar.
 */
export async function updatePassword(
  input: ResetPasswordInput,
): Promise<UpdatePasswordResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation_error",
      details: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "session_expired" };

  const hdrs = await headers();
  const requestId = hdrs.get("x-request-id");
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = hdrs.get("user-agent") ?? null;

  // Conta com MFA: a sessão de recovery entra em AAL1, mas o GoTrue recusa a
  // troca de senha em AAL1 quando há fator verificado ("AAL2 session is
  // required..."). Elevamos para AAL2 com um challenge TOTP antes do update.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
    if (!parsed.data.mfa_code) return { ok: false, error: "mfa_required" };
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totp = factors?.totp?.[0];
    if (!totp) return { ok: false, error: "update_failed" };
    const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
      factorId: totp.id,
    });
    if (chErr || !challenge) return { ok: false, error: "mfa_invalid" };
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId: totp.id,
      challengeId: challenge.id,
      code: parsed.data.mfa_code,
    });
    if (verifyErr) return { ok: false, error: "mfa_invalid" };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    if (/different from the old password/i.test(error.message)) {
      return { ok: false, error: "same_password" };
    }
    await audit({
      action: "auth.password_reset_failed",
      actorUserId: user.id,
      metadata: { reason: error.message },
      requestId,
      ip,
      userAgent,
    });
    return { ok: false, error: "update_failed" };
  }

  // Não basta o provedor aceitar o UPDATE: o defeito medido em produção
  // mostrava “Senha redefinida com sucesso” e, na tela seguinte, recusava a
  // mesma credencial. Esta chamada é a prova ponta a ponta antes do sucesso.
  const { data: sessaoValidada, error: erroValidacao } =
    await supabase.auth.signInWithPassword({
      email: user.email ?? "",
      password: parsed.data.password,
    });
  if (erroValidacao || !sessaoValidada.user) {
    await audit({
      action: "auth.password_reset_failed",
      actorUserId: user.id,
      metadata: { reason: erroValidacao?.message ?? "password_verification_failed" },
      requestId,
      ip,
      userAgent,
    });
    return { ok: false, error: "update_failed" };
  }

  // Contas antigas podiam chegar ao recovery com o convite guardado no perfil,
  // mas sem vínculo com a empresa. Como a senha e o e-mail acabaram de ser
  // provados, concluímos o convite aqui em vez de deixá-las cair num CRM vazio.
  const decisao = decidirConviteDoSignup(sessaoValidada.user);
  if (decisao?.tipo === "convite") {
    const aceite = await aplicarConvite({
      userId: sessaoValidada.user.id,
      payload: decisao.payload,
      requestId,
    });
    if (!aceite.ok) return { ok: false, error: "update_failed" };
  }

  await audit({
    action: "auth.password_reset_completed",
    actorUserId: user.id,
    metadata: {},
    requestId,
    ip,
    userAgent,
  });

  redirect(decisao?.tipo === "convite" ? "/app/settings/profile" : "/app");
}
