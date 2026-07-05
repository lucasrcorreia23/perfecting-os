"use client";

import { useRef, useState, useTransition } from "react";
import { setAvatarUrl, updateProfile } from "@/lib/actions/profile";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import type { Tables } from "@/lib/database.types";
import { ActionBar } from "@/components/ui/action-bar";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FormSection, Input } from "@/components/ui/form";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export function ProfileForm({
  profile,
  userId,
  email,
}: {
  profile: Tables<"profiles"> | null;
  userId: string;
  email: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [initialName, setInitialName] = useState(profile?.full_name ?? "");
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, startTransition] = useTransition();

  const displayName = name || email || "Usuário";

  async function handleAvatar(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Envie um arquivo de imagem.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("A imagem excede o limite de 5 MB.");
      return;
    }
    if (!isSupabaseConfigured()) {
      setError("Supabase não configurado.");
      return;
    }

    setUploading(true);
    try {
      const supabase = createBrowserSupabase();
      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${userId}/avatar.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) {
        setError("Falha no envio da imagem. Tente novamente.");
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      // ?v= evita cache da imagem antiga.
      const result = await setAvatarUrl(`${data.publicUrl}?v=${Date.now()}`);
      if (!result.ok) setError(result.error);
    } finally {
      setUploading(false);
    }
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateProfile({ full_name: name });
      if (result.ok) {
        setInitialName(name);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <FormSection title="Foto" first>
        <div className="flex items-center gap-4">
          <Avatar name={displayName} src={profile?.avatar_url} size={64} />
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Enviando…" : "Trocar foto"}
            </Button>
            <span className="text-xs text-slate-500">
              PNG ou JPG, até 5 MB.
            </span>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Selecionar foto de perfil"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleAvatar(file);
              event.target.value = "";
            }}
          />
        </div>
      </FormSection>

      <FormSection title="Identificação">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nome completo" htmlFor="profile-name">
            <Input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field
            label="E-mail"
            help="O e-mail de acesso não pode ser alterado aqui."
            htmlFor="profile-email"
          >
            <Input id="profile-email" value={email ?? ""} disabled readOnly />
          </Field>
        </div>
      </FormSection>

      {error ? (
        <p role="alert" className="text-xs text-trend-negative">
          {error}
        </p>
      ) : null}

      <ActionBar
        dirty={name !== initialName}
        saving={saving}
        onSave={save}
        onDiscard={() => setName(initialName)}
      />
    </div>
  );
}
