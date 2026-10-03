import { useTranslation } from "react-i18next";
import { useNexusStore } from "../state/useNexusStore";

export function ControllerHints() {
  const { t } = useTranslation();
  const inputMode = useNexusStore((state) => state.inputMode);
  if (inputMode === "pointer") return null;

  const controller = inputMode === "controller";
  return (
    <aside className="controller-hints" aria-label={t("hints.title")} data-mode={inputMode}>
      {controller ? <span><kbd className="controller-key controller-key--wide">L1</kbd><kbd className="controller-key controller-key--wide">R1</kbd>{t("hints.tabs")}</span> : null}
      <span><kbd className={controller ? "controller-key controller-key--confirm" : "controller-key controller-key--wide"}>{controller ? "A" : t("hints.enter")}</kbd>{t("hints.select")}</span>
      <span><kbd className="controller-key controller-key--wide">{controller ? "A" : t("hints.enter")}</kbd>{t("action.holdToPlay")}</span>
      <span><kbd className={controller ? "controller-key controller-key--back" : "controller-key controller-key--wide"}>{controller ? "B" : t("hints.escape")}</kbd>{t("hints.back")}</span>
    </aside>
  );
}
