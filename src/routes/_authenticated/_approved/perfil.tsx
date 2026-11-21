import { useRef, useState, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Camera,
  ChevronRight,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/bacbo/Avatar";
import { supabase } from "@/integrations/supabase/client";
import { signOutEverywhere } from "@/lib/auth-helpers";
import { avatarUrlQuery, uploadAvatar } from "@/lib/avatar";
import { useMyAccount } from "@/lib/account";
import { allProfilesQuery, myAccountQuery, type MyAccount } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/_approved/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Bac Bo Live" },
      { name: "description", content: "Seus dados de conta no robô Bac Bo Live." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, isAdmin } = useMyAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const avatar = profile.avatar_url;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadAvatar(profile.id, file, avatar);
      await queryClient.ensureQueryData(avatarUrlQuery(path)).catch(() => null);
      const key = myAccountQuery(profile.id).queryKey;
      await queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData<MyAccount>(key, (old) =>
        old?.profile ? { ...old, profile: { ...old.profile, avatar_url: path } } : old,
      );
      void queryClient.invalidateQueries({ queryKey: allProfilesQuery.queryKey });
      toast.success("Foto de perfil atualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar a foto.");
    } finally {
      setUploading(false);
    }
  }

  async function logout() {
    await signOutEverywhere(queryClient);
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto space-y-3 pt-2 sm:space-y-4 sm:pt-3 lg:max-w-3xl">
      <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Perfil</h1>

      <div className="liquid-glass relative overflow-hidden rounded-[1.75rem] p-5 text-center sm:p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-player/20 via-transparent to-banker/20 backdrop-blur-xl" />
        <div className="relative mx-auto mt-2 h-24 w-24 sm:mt-4 sm:h-28 sm:w-28">
          <Avatar
            value={avatar}
            name={profile.name}
            className="h-24 w-24 border-4 sm:h-28 sm:w-28 border-background shadow-xl"
            textClass="text-3xl"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Alterar foto de perfil"
            className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-tie text-background shadow-lg disabled:opacity-70"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
        </div>
        <h2 className="relative mt-3 font-display text-lg font-bold sm:mt-4 sm:text-xl">
          {profile.name || "Usuário"}
        </h2>
        <p className="relative mt-0.5 text-sm text-muted-foreground">{profile.email}</p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="relative mt-2 text-xs font-semibold text-tie disabled:opacity-60"
        >
          {uploading ? "Enviando foto…" : "Alterar foto de perfil"}
        </button>
        <div className="relative mt-3 flex justify-center gap-2">
          <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-success">
            Acesso aprovado
          </span>
          {isAdmin && (
            <span className="rounded-full border border-tie/30 bg-tie/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-tie">
              Admin
            </span>
          )}
        </div>
      </div>

      <div className="liquid-glass divide-y divide-border rounded-[1.5rem]">
        <Row icon={<UserRound className="h-4 w-4" />} label="Nome" value={profile.name} />
        <Row icon={<Mail className="h-4 w-4" />} label="E-mail" value={profile.email} />
        <Row
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Membro desde"
          value={new Date(profile.created_at).toLocaleDateString("pt-BR")}
        />
      </div>

      <PasswordCard />

      {isAdmin && (
        <Link
          to="/admin"
          className="liquid-glass flex items-center gap-3 rounded-[1.5rem] p-4 transition-colors hover:bg-accent/40"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-tie/30 bg-tie/10 text-tie">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Painel do Administrador</p>
            <p className="text-xs text-muted-foreground">Cadastros e robô</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      )}

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={logout}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-destructive/30 sm:h-14 bg-destructive/10 font-semibold text-destructive"
      >
        <LogOut className="h-4 w-4" /> Sair da conta
      </motion.button>
    </div>
  );
}

function Row({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="ml-auto min-w-0 truncate text-sm font-medium">{value}</span>
    </div>
  );
}

/** Lets a signed-in user (also Google accounts) create or change the password used on the login form. */
function PasswordCard() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não são iguais.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(
        /weak|pwned|leaked/i.test(error.message)
          ? "Essa senha é fraca ou já vazou na internet. Escolha outra."
          : /same/i.test(error.message)
            ? "Essa já é a sua senha atual."
            : "Não foi possível salvar a senha. Tente de novo.",
      );
      return;
    }
    setPassword("");
    setConfirm("");
    toast.success("Senha salva! Agora você também pode entrar com e-mail e senha.");
  }

  const field =
    "h-11 w-full rounded-xl border border-glass-border bg-background/40 px-3.5 text-sm font-bold outline-none placeholder:font-semibold placeholder:text-muted-foreground/70 focus:border-tie/60";

  return (
    <form onSubmit={onSubmit} className="liquid-glass space-y-3 rounded-[1.5rem] p-4">
      <div className="flex items-center gap-3">
        <span className="glass-icon h-10 w-10 text-tie">
          <KeyRound className="h-5 w-5" />
        </span>
        <div>
          <p className="font-bold">Senha de acesso</p>
          <p className="text-xs font-semibold text-muted-foreground">
            Crie ou troque a senha para entrar com e-mail e senha.
          </p>
        </div>
      </div>
      <input
        type="password"
        autoComplete="new-password"
        placeholder="Nova senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={field}
        maxLength={72}
      />
      <input
        type="password"
        autoComplete="new-password"
        placeholder="Repita a nova senha"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className={field}
        maxLength={72}
      />
      <button
        type="submit"
        disabled={saving || !password || !confirm}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-tie font-display text-sm font-extrabold text-background disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Salvar senha
      </button>
    </form>
  );
}
