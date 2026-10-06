!ifndef BUILD_UNINSTALLER
!include "nsDialogs.nsh"
Var NexusSANCheckbox
Var NexusSANSelected
LangString NexusSANHeading 1033 "Steam notifications"
LangString NexusSANHeading 1036 "Notifications Steam"
LangString NexusSANOption 1033 "Install and enable Steam achievement notifications"
LangString NexusSANOption 1036 "Installer et activer les notifications de succès Steam"
LangString NexusSANHint 1033 "Optional. Nexus will install Steam Achievement Notifier at first launch."
LangString NexusSANHint 1036 "Facultatif. Nexus installera Steam Achievement Notifier au premier lancement."
!macro customPageAfterChangeDir
 Page custom NexusSANPage NexusSANLeave
!macroend
Function NexusSANPage
 FindWindow $0 "#32770" "" $HWNDPARENT
 GetDlgItem $0 $HWNDPARENT 1037
 SendMessage $0 ${WM_SETTEXT} 0 "STR:$(NexusSANHeading)"
 nsDialogs::Create 1018
 Pop $0
 ${If} $0 == error
  Abort
 ${EndIf}
 ${NSD_CreateCheckbox} 0 15u 100% 20u "$(NexusSANOption)"
 Pop $NexusSANCheckbox
 ${NSD_SetState} $NexusSANCheckbox $NexusSANSelected
 ${NSD_CreateLabel} 0 45u 100% 35u "$(NexusSANHint)"
 Pop $0
 nsDialogs::Show
FunctionEnd
Function NexusSANLeave
 ${NSD_GetState} $NexusSANCheckbox $NexusSANSelected
FunctionEnd
!macro customInstall
 ${If} $NexusSANSelected == ${BST_CHECKED}
  FileOpen $0 "$INSTDIR\resources\nexus-install-san" w
  FileWrite $0 "1"
  FileClose $0
 ${Else}
  Delete "$INSTDIR\resources\nexus-install-san"
 ${EndIf}
!macroend

!endif
