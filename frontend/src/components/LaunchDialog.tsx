import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import type { Game } from "../types";

interface LaunchDialogProps { game: Game; open: boolean; onOpenChange: (open: boolean) => void; }

export function LaunchDialog({ game, open, onOpenChange }: LaunchDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="launch-dialog">
          <CheckCircle className="launch-dialog__icon" aria-hidden="true" size={42} weight="fill" />
          <Dialog.Title>{t("launch.title")}</Dialog.Title>
          <Dialog.Description>{t("launch.description", { game: game.title })}</Dialog.Description>
          <div className="launch-dialog__status">{t("launch.success")}</div>
          <Dialog.Close className="nexus-button nexus-button--primary" type="button">{t("action.close")}</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
